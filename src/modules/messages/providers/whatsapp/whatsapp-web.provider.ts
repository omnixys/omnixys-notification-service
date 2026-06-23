import { env } from '../../../../config/env.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import {
  MessageInputException,
  NotificationChannelUnavailableException,
} from '../../../notification/errors/notification.error.js';
import type {
  SendWhatsappInput,
  SendWhatsappResult,
  WhatsAppProvider,
} from './whatsapp.provider.interface.js';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import pkg from 'whatsapp-web.js';
import type WhatsAppWeb from 'whatsapp-web.js';
import type { Client, Message } from 'whatsapp-web.js';

const { MessageAck } = pkg;
type MessageAckType = (typeof MessageAck)[keyof typeof MessageAck];

enum WhatsAppState {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  WAITING_FOR_QR = 'WAITING_FOR_QR',
  AUTHENTICATED = 'AUTHENTICATED',
  READY = 'READY',
  DISCONNECTED = 'DISCONNECTED',
  FAILED = 'FAILED',
}

const INIT_TIMEOUT_MS = 120_000;
const RETRY_DELAY_MS = 5_000;
const AUTHENTICATED_WATCHDOG_MS = 60_000;
const MAX_AUTH_FAILURES = 3;

@Injectable()
export class WhatsAppWebProvider
  implements
    WhatsAppProvider,
    OnApplicationBootstrap,
    OnApplicationShutdown,
    OnModuleDestroy
{
  private readonly logger = new Logger(WhatsAppWebProvider.name);

  private client: Client | null = null;

  private state: WhatsAppState = WhatsAppState.IDLE;
  private initPromise: Promise<void> | null = null;
  private latestQr: string | null = null;
  private lastError: string | null = null;
  private destroySignal = false;
  private authFailureCount = 0;
  private authenticatedWatchdog: ReturnType<typeof setTimeout> | null = null;
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private initTimer: ReturnType<typeof setTimeout> | null = null;
  private readyCheckTimer: ReturnType<typeof setTimeout> | null = null;
  private recoveryAttempts = 0;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  isReady(): boolean {
    return this.state === WhatsAppState.READY;
  }

  getState(): string {
    return this.state;
  }

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Bootstrapping WhatsApp Web Provider...');
    void this.init();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.shutdown();
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }

  private async shutdown(): Promise<void> {
    this.destroySignal = true;
    this.cancelAuthenticatedWatchdog();
    this.cancelRecoveryTimer();
    this.cancelInitTimer();
    this.cancelReadyCheck();
    await this.destroyClient();
  }

  private async init(): Promise<void> {
    if (this.destroySignal) {
      return;
    }

    if (
      this.state === WhatsAppState.INITIALIZING ||
      this.state === WhatsAppState.WAITING_FOR_QR ||
      this.state === WhatsAppState.AUTHENTICATED ||
      this.state === WhatsAppState.READY
    ) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.state = WhatsAppState.INITIALIZING;
    this.lastError = null;

    this.initPromise = this.initializeClient();
    await this.initPromise;
    this.initPromise = null;
  }

  private async initializeClient(): Promise<void> {
    await this.cleanupStaleSession();

    const pkgMod = (await import('whatsapp-web.js')) as typeof WhatsAppWeb & {
      default?: typeof WhatsAppWeb;
    };
    const { Client: WhatsAppClient, LocalAuth } = pkgMod.default ?? pkgMod;

    if (this.client) {
      try {
        await this.client.destroy();
      } catch {
        /* ignore */
      }
      this.client = null;
    }

    const client = new WhatsAppClient({
      authStrategy: new LocalAuth({
        clientId: 'omnixys-whatsapp',
      }),
      puppeteer: {
        executablePath: env.CHROME_PATH,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          ...(env.NODE_ENV === 'production' ? ['--disable-dev-shm-usage'] : []),
        ],
      },
    });

    this.client = client;
    this.registerEvents(client);

    this.logger.log('Starting WhatsApp Web client...');

    try {
      await this.runInitialize(client);
    } catch (err) {
      this.logger.error(
        `WhatsApp Web initialization failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      this.state = WhatsAppState.FAILED;
      this.lastError = err instanceof Error ? err.message : String(err);
      this.client = null;

      if (!this.destroySignal) {
        this.scheduleRecovery();
      }
    }
  }

  private async runInitialize(client: Client): Promise<void> {
    const outcome = await this.initializeWithTimeout(client);

    if (outcome.winner === 'timeout') {
      this.logger.warn(
        `WhatsApp Web client.initialize() timed out after ${INIT_TIMEOUT_MS}ms — destroying browser`,
      );
      await client.destroy().catch(() => {});
      throw new Error('WhatsApp Web initialization timed out');
    }

    if (outcome.winner === 'error') {
      throw outcome.error;
    }

    if (
      this.state !== WhatsAppState.READY &&
      this.state !== WhatsAppState.WAITING_FOR_QR &&
      this.state !== WhatsAppState.AUTHENTICATED
    ) {
      await this.detectMissedReady(client);
    }

    this.logger.log(
      `WhatsApp Web initialize() completed. State: ${this.state}`,
    );
  }

  private async initializeWithTimeout(
    client: Client,
  ): Promise<
    | { winner: 'init' }
    | { winner: 'timeout' }
    | { winner: 'error'; error: unknown }
  > {
    return new Promise((resolve) => {
      this.initTimer = setTimeout(() => {
        this.initTimer = null;
        resolve({ winner: 'timeout' });
      }, INIT_TIMEOUT_MS);

      client.initialize().then(
        () => {
          this.cancelInitTimer();
          resolve({ winner: 'init' });
        },
        (error) => {
          this.cancelInitTimer();
          resolve({ winner: 'error', error });
        },
      );
    });
  }

  private scheduleReadyCheck(client: Client): void {
    this.cancelReadyCheck();
    this.readyCheckTimer = setTimeout(() => {
      this.readyCheckTimer = null;

      if (this.destroySignal || this.isReady()) {
        return;
      }

      void this.checkAndForceReady(client);
    }, 15_000);
  }

  private cancelReadyCheck(): void {
    if (this.readyCheckTimer) {
      clearTimeout(this.readyCheckTimer);
      this.readyCheckTimer = null;
    }
  }

  private async checkAndForceReady(client: Client): Promise<boolean> {
    if (this.isReady()) {
      return true;
    }

    {
      const clientInfo = (
        client as unknown as {
          info?: { pushname?: string; wid?: { user?: string } };
        }
      ).info;

      if (clientInfo?.pushname && clientInfo?.wid?.user) {
        this.logger.warn(
          'Client info confirms authenticated session — forcing READY',
        );
        this.state = WhatsAppState.READY;
        return true;
      }
    }

    try {
      const page = (
        client as unknown as {
          pupPage?: { evaluate: <T>(fn: () => T) => Promise<T> };
        }
      ).pupPage;

      if (!page) {
        this.logger.warn('Ready-check: no page available');
        return false;
      }

      const socketState = await page.evaluate(() => {
        try {
          const ws = (globalThis as Record<string, unknown>).require as (
            mod: string,
          ) => { Socket: { state: string; hasSynced: boolean } };
          const socket = ws('WAWebSocketModel').Socket;
          return { state: socket.state, hasSynced: socket.hasSynced };
        } catch {
          return null as { state: string; hasSynced: boolean } | null;
        }
      });

      if (!socketState) {
        this.logger.warn('Ready-check: socket state unavailable');
        return false;
      }

      this.logger.warn(
        `Ready-check socket: state=${socketState.state} hasSynced=${String(socketState.hasSynced)}`,
      );

      if (socketState.hasSynced && !this.isReady()) {
        this.logger.warn(
          'Socket hasSynced=true but ready event missed — forcing READY',
        );
        this.state = WhatsAppState.READY;
        return true;
      }
    } catch {
      this.logger.warn('Ready-check failed — page not accessible');
    }

    return false;
  }

  private async detectMissedReady(client: Client): Promise<void> {
    try {
      const page = (
        client as unknown as {
          pupPage?: { evaluate: <T>(fn: () => T) => Promise<T> };
        }
      ).pupPage;

      if (!page) {
        return;
      }

      const socketState = await page.evaluate(() => {
        try {
          const ws = (globalThis as Record<string, unknown>).require as (
            mod: string,
          ) => { Socket: { state: string; hasSynced: boolean } };
          const socket = ws('WAWebSocketModel').Socket;
          return { state: socket.state, hasSynced: socket.hasSynced };
        } catch {
          return null as { state: string; hasSynced: boolean } | null;
        }
      });

      if (!socketState) {
        return;
      }

      this.logger.debug(
        `Post-init socket: state=${socketState.state} hasSynced=${String(socketState.hasSynced)}`,
      );

      if (socketState.hasSynced && !this.isReady()) {
        this.logger.warn(
          'Socket already synced but ready event missed — forcing READY',
        );
        this.state = WhatsAppState.READY;
      }
    } catch {
      this.logger.debug('Could not check socket state — page not accessible');
    }
  }

  private registerEvents(client: Client): void {
    client.on('qr', (qr: string) => {
      this.latestQr = qr;
      this.state = WhatsAppState.WAITING_FOR_QR;
      this.logger.warn(
        `EVENT qr — state=WAITING_FOR_QR at ${new Date().toISOString()}`,
      );
    });

    client.on('authenticated', () => {
      this.state = WhatsAppState.AUTHENTICATED;
      this.logger.log(
        `EVENT authenticated — state=AUTHENTICATED at ${new Date().toISOString()}`,
      );
      this.resetAuthenticatedWatchdog(client);
      this.scheduleReadyCheck(client);
    });

    client.on('ready', async () => {
      this.state = WhatsAppState.READY;
      this.latestQr = null;
      this.cancelReadyCheck();
      this.cancelAuthenticatedWatchdog();
      this.authFailureCount = 0;
      this.recoveryAttempts = 0;
      this.logger.log(
        `EVENT ready — state=READY at ${new Date().toISOString()}`,
      );

      try {
        const chats = await client.getChats();
        this.logger.debug(`Chats loaded: ${chats.length}`);
      } catch {
        /* ignore */
      }
    });

    client.on('auth_failure', (msg: string) => {
      if (this.destroySignal) {
        return;
      }

      this.state = WhatsAppState.FAILED;
      this.latestQr = null;
      this.lastError = msg;
      this.cancelAuthenticatedWatchdog();
      this.authFailureCount++;
      this.logger.error(
        `EVENT auth_failure — state=FAILED msg=${msg} (failure #${this.authFailureCount})`,
      );

      if (this.authFailureCount >= MAX_AUTH_FAILURES) {
        this.logger.warn(
          `Max auth failures (${MAX_AUTH_FAILURES}) reached — cleaning session data to force QR`,
        );
        void this.forceCleanSession();
      }

      this.scheduleRecovery();
    });

    client.on('disconnected', (reason: string) => {
      if (this.destroySignal) {
        return;
      }

      this.state = WhatsAppState.DISCONNECTED;
      this.latestQr = null;
      this.logger.warn(
        `EVENT disconnected — state=DISCONNECTED reason=${reason}`,
      );

      this.scheduleRecovery();
    });

    client.on('change_state', (state: string) => {
      this.logger.warn(
        `EVENT change_state — connection=${state} appState=${this.state}`,
      );
    });

    client.on(
      'change_battery',
      (batteryInfo: { battery: number; plugged: boolean }) => {
        this.logger.debug(
          'EVENT change_battery — battery=%d plugged=%s',
          batteryInfo.battery,
          batteryInfo.plugged,
        );
      },
    );

    client.on('loading_screen', (percent: string) => {
      this.logger.warn(`EVENT loading_screen — percent=${percent}`);
    });

    client.on('remote_session_saved', () => {
      this.logger.warn('EVENT remote_session_saved');
    });

    client.on('message_ack', async (msg: Message, ack: MessageAckType) => {
      const messageId = msg.id?._serialized;

      if (!messageId) {
        return;
      }

      const status =
        ack === MessageAck.ACK_SERVER
          ? 'SENT'
          : ack === MessageAck.ACK_DEVICE
            ? 'DELIVERED'
            : ack === MessageAck.ACK_READ
              ? 'READ'
              : null;

      if (!status) {
        return;
      }

      await this.prisma.whatsAppMessage.updateMany({
        where: { messageId },
        data: { status },
      });
    });

    client.on('message_create', (msg: Message) => {
      if (msg.fromMe) {
        return;
      }

      this.logger.debug(
        'Incoming WhatsApp message: hasMedia=%s type=%s timestamp=%s',
        msg.hasMedia,
        msg.type,
        msg.timestamp,
      );

      this.eventEmitter.emit('whatsapp.incoming', msg);
    });
  }

  private async cleanupStaleSession(): Promise<void> {
    const dirPath = path.resolve('.wwebjs_auth', 'session-omnixys-whatsapp');

    try {
      await fs.access(dirPath);
    } catch {
      return;
    }

    await this.killOrphanChrome(dirPath);
    await this.cleanSingletonLocks(dirPath);
  }

  private async killOrphanChrome(dirPath: string): Promise<void> {
    const lockPath = path.join(dirPath, 'SingletonLock');

    try {
      const link = await fs.readlink(lockPath);
      const pidMatch = link.match(/-(\d+)$/);

      if (!pidMatch) {
        return;
      }

      const pid = Number(pidMatch[1]);

      try {
        process.kill(pid, 0);
      } catch {
        return;
      }

      try {
        process.kill(pid, 'SIGTERM');
        this.logger.warn(
          'Killed orphan Chrome process: PID %d (SingletonLock: %s)',
          pid,
          link,
        );
      } catch {
        /* ignore */
      }
    } catch {
      /* ignore */
    }
  }

  private async cleanSingletonLocks(dirPath?: string): Promise<void> {
    const dir =
      dirPath ?? path.resolve('.wwebjs_auth', 'session-omnixys-whatsapp');

    for (const file of [
      'SingletonLock',
      'SingletonCookie',
      'SingletonSocket',
    ]) {
      try {
        await fs.unlink(path.join(dir, file));
      } catch {
        /* ignore */
      }
    }
  }

  private async forceCleanSession(): Promise<void> {
    const dirPath = path.resolve('.wwebjs_auth', 'session-omnixys-whatsapp');

    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      this.logger.warn(
        `Session data cleaned at ${dirPath} — next init will require QR scan`,
      );
    } catch (err) {
      this.logger.warn(
        `Could not clean session data at ${dirPath}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async destroyClient(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      this.client.removeAllListeners();
    } catch {
      /* ignore */
    }

    try {
      await this.client.destroy();
    } catch {
      /* ignore */
    }
    this.client = null;
  }

  private scheduleRecovery(): void {
    if (this.destroySignal) {
      return;
    }
    this.recoveryAttempts++;
    const delay = Math.min(
      RETRY_DELAY_MS * Math.pow(2, this.recoveryAttempts - 1),
      60_000,
    );
    this.logger.warn(
      `Scheduling recovery attempt #${this.recoveryAttempts} in ${delay}ms — state=${this.state}`,
    );
    this.cancelRecoveryTimer();
    this.recoveryTimer = setTimeout(() => {
      this.recoveryTimer = null;
      void this.init();
    }, delay);
  }

  private cancelAuthenticatedWatchdog(): void {
    if (this.authenticatedWatchdog) {
      clearTimeout(this.authenticatedWatchdog);
      this.authenticatedWatchdog = null;
    }
  }

  private cancelRecoveryTimer(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }

  private cancelInitTimer(): void {
    if (this.initTimer) {
      clearTimeout(this.initTimer);
      this.initTimer = null;
    }
  }

  private resetAuthenticatedWatchdog(client: Client): void {
    this.cancelAuthenticatedWatchdog();
    this.authenticatedWatchdog = setTimeout(() => {
      this.authenticatedWatchdog = null;

      if (this.destroySignal) {
        return;
      }

      if (this.isReady()) {
        return;
      }

      this.logger.warn(
        `AUTHENTICATED watchdog fired — stuck at AUTHENTICATED for ${AUTHENTICATED_WATCHDOG_MS}ms; checking socket state before recovery`,
      );

      void this.checkAndForceReady(client).then((forced) => {
        if (forced) {
          this.logger.warn('Watchdog forced READY via socket check');
          this.cancelAuthenticatedWatchdog();
          return;
        }

        this.logger.warn(
          `Watchdog could not force READY — doing non-destructive re-init (authFailureCount=${this.authFailureCount})`,
        );
        this.state = WhatsAppState.FAILED;
        this.lastError = 'authenticated-watchdog-timeout';
        this.scheduleRecovery();
      });
    }, AUTHENTICATED_WATCHDOG_MS);
  }

  async resetWhatsappSession(): Promise<void> {
    this.logger.warn('resetWhatsappSession called — cleaning session data');
    this.cancelAuthenticatedWatchdog();
    this.cancelRecoveryTimer();
    this.cancelInitTimer();
    this.cancelReadyCheck();
    await this.destroyClient();
    await this.forceCleanSession();
    this.state = WhatsAppState.IDLE;
    this.authFailureCount = 0;
    this.recoveryAttempts = 0;
    this.latestQr = null;
    this.lastError = null;
    void this.init();
  }

  getQrCodeUrl(): string | null {
    if (!this.latestQr) {
      return null;
    }

    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(this.latestQr)}`;
  }

  async send(input: SendWhatsappInput): Promise<SendWhatsappResult> {
    if (this.state !== WhatsAppState.READY) {
      throw new NotificationChannelUnavailableException(
        'WHATSAPP',
        this.state === WhatsAppState.FAILED
          ? (this.lastError ?? 'client-failed')
          : 'client-not-ready',
      );
    }

    if (!this.client) {
      throw new NotificationChannelUnavailableException(
        'WHATSAPP',
        'client-not-initialized',
      );
    }

    const chatId = this.formatNumber(input.to);

    this.logger.debug('Sending WhatsApp Web message');

    try {
      const result = await this.client.sendMessage(chatId, input.message);
      this.logger.log('WhatsApp Web message sent successfully');
      return result;
    } catch (error: unknown) {
      this.logger.error(
        `WhatsApp Web send failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private formatNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    if (!cleaned) {
      throw new MessageInputException('phone-number-invalid');
    }

    return `${cleaned}@c.us`;
  }
}
