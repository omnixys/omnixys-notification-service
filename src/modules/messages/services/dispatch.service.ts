import type { GatewaySendInput } from './gateway-client.service.js';
import { GatewayClientService } from './gateway-client.service.js';
import { Injectable, Logger } from '@nestjs/common';

export interface DispatchInput {
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

export interface DispatchResult {
  success: boolean;
  providerMessageId?: string;
  status: 'SENT' | 'PENDING' | 'FAILED';
  error?: string;
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(private readonly gateway: GatewayClientService) {}

  async dispatch(input: DispatchInput): Promise<DispatchResult> {
    this.logger.debug(
      `Dispatching ${input.channel} message to ${input.recipientAddress}: ${input.id}`,
    );

    const gatewayInput: GatewaySendInput = {
      id: input.id,
      channel: input.channel,
      recipientId: input.recipientId,
      recipientAddress: input.recipientAddress,
      senderId: input.senderId,
      body: input.body,
      contentType: input.contentType ?? 'TEXT',
      subject: input.subject,
      senderAddress: input.senderAddress,
      metadata: input.metadata,
    };

    const result = await this.gateway.send(gatewayInput);

    if (!result.success) {
      this.logger.warn(`Dispatch failed for ${input.id}: ${result.error ?? 'unknown error'}`);
      return {
        success: false,
        status: 'FAILED',
        error: result.error,
      };
    }

    return {
      success: true,
      providerMessageId: result.providerMessageId,
      status: 'SENT',
    };
  }
}
