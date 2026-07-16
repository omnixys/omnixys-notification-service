import { env } from '../../../config/env.js';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

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
  private readonly logger = new Logger(GatewayClientService.name);
  private readonly baseUrl: string;

  constructor() {
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
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          this.logger.error(`Gateway unreachable: ${url}`);
          return { success: false, status: 'FAILED', error: 'GATEWAY_TIMEOUT' };
        }
        return {
          success: false,
          status: 'FAILED',
          error: `GATEWAY_ERROR: ${error.message}`,
        };
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Gateway send failed: ${message}`);
      return { success: false, status: 'FAILED', error: message };
    }
  }
}
