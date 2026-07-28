import { env } from '../../../config/env.js';
import { Injectable } from '@nestjs/common';
import { OmnixysLogger, type ScopedLogger } from '@omnixys/logger';
import axios from 'axios';

function gatewayErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  const detail = Reflect.get(data, 'detail') as Record<string, unknown> | undefined;
  if (!detail || typeof detail !== 'object') {
    return undefined;
  }

  const code = Reflect.get(detail, 'code');
  return typeof code === 'string' && code.length > 0 ? code : undefined;
}

export interface GatewaySendInput {
  id: string;
  channel: 'WHATSAPP' | 'EMAIL';
  recipientId?: string;
  recipientAddress: string;
  senderId?: string;
  body: string;
  contentType?: 'TEXT' | 'HTML';
  subject?: string;
  senderAddress?: string;
  metadata?: {
    conversationId?: string;
    tenantId?: string;
  };
}

export interface GatewaySendResult {
  success: boolean;
  providerMessageId?: string;
  status: string;
  error?: string;
}

@Injectable()
export class GatewayClientService {
  private readonly logger: ScopedLogger;
  private readonly baseUrl: string;

  constructor(omnixysLogger: OmnixysLogger) {
    this.logger = omnixysLogger.log(GatewayClientService.name);
    this.baseUrl = env.GATEWAY_BASE_URL;
  }

  async send(input: GatewaySendInput): Promise<GatewaySendResult> {
    const url = `${this.baseUrl}/api/v1/messages/send`;

    try {
      const response = await axios.post(url, input, {
        timeout: 15_000,
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': env.GATEWAY_API_KEY,
        },
      });

      return response.data as GatewaySendResult;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (
          error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNABORTED'
        ) {
          this.logger.error(`Gateway unreachable: ${url}`);
          return { success: false, status: 'FAILED', error: 'GATEWAY_TIMEOUT' };
        }
        const providerCode = gatewayErrorCode(error.response?.data);
        this.logger.error(
          `Gateway request failed: status=${error.response?.status ?? 'unknown'} code=${providerCode ?? 'GATEWAY_ERROR'}`,
        );
        return {
          success: false,
          status: 'FAILED',
          error: providerCode ?? 'GATEWAY_ERROR',
        };
      }
      this.logger.error('Unexpected gateway client failure');
      return { success: false, status: 'FAILED', error: 'GATEWAY_ERROR' };
    }
  }
}
