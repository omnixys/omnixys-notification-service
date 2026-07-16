import { PrismaService } from '../../prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';
import type {
  EmailOutboundDTO,
  EmailReceivedDTO,
  SupportMessageReceivedDTO,
} from '@omnixys/contracts';
import { KafkaProducerService, KafkaTopics } from '@omnixys/kafka';

@Injectable()
export class EmailSupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaProducerService,
  ) {}

  async handleInbound(payload: EmailReceivedDTO): Promise<void> {
    const messageId = payload.messageId;
    const inReplyTo = payload.inReplyTo;
    const references = payload.references;
    const fromEmail = this.extractEmail(payload.from);
    const subject = payload.subject ?? '(no subject)';

    if (!fromEmail) {
      return;
    }

    const matched = await this.matchConversation(messageId, inReplyTo, references, fromEmail);

    if (matched) {
      await this.addMessageToConversation(matched, payload, 'INBOUND');
      return;
    }

    const eventId = await this.resolveEventContext(payload);
    const conversationId = await this.findOrCreateConversation(
      eventId,
      fromEmail,
      subject,
      payload,
    );

    await this.addMessageToConversation(conversationId, payload, 'INBOUND');
  }

  private async matchConversation(
    messageId: string | undefined,
    inReplyTo: string | undefined,
    references: string | undefined,
    fromEmail: string,
  ): Promise<string | null> {
    // Strategy 1: Match by Message-ID header (used in In-Reply-To / References)
    const allRefs = [
      messageId,
      inReplyTo,
      ...(references?.split(/\s+/).filter(Boolean) ?? []),
    ].filter(Boolean) as string[];

    if (allRefs.length > 0) {
      const byThread = await this.prisma.supportConversation.findFirst({
        where: {
          OR: [
            { emailMessageId: { in: allRefs } },
            { emailInReplyTo: { in: allRefs } },
            { emailReferences: { contains: allRefs[0] } },
          ],
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      if (byThread) {
        return byThread.id;
      }
    }

    // Strategy 2: Match by sender with open conversation
    const bySender = await this.prisma.supportConversation.findFirst({
      where: {
        guestContact: fromEmail,
        status: { notIn: ['CLOSED', 'RESOLVED'] },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (bySender) {
      return bySender.id;
    }

    return null;
  }

  private async resolveEventContext(payload: EmailReceivedDTO): Promise<string | undefined> {
    // Priority 1: Event-specific mailbox address
    const toAddresses = [...(payload.to ?? []), ...(payload.cc ?? [])].filter(Boolean);

    for (const addr of toAddresses) {
      const email = this.extractEmail(addr ?? '');
      if (!email) {
        continue;
      }

      const atIndex = email.indexOf('@');
      if (atIndex === -1) {
        continue;
      }

      const localPart = email.slice(0, atIndex).toLowerCase();

      // Match event-specific addresses like "wedding@omnixys.com" → event slug/ID
      const mapping = await this.prisma.conversationMapping.findFirst({
        where: {
          channel: 'EMAIL',
          externalId: email,
          eventId: { not: null },
        },
        select: { eventId: true },
      });

      if (mapping?.eventId) {
        return mapping.eventId;
      }

      // Try to find event by custom support email
      if (localPart !== 'support') {
        const byCustomEmail = await this.prisma.supportConversation.findFirst({
          where: {
            guestContact: email,
          },
          select: { eventId: true },
          orderBy: { createdAt: 'desc' },
        });

        if (byCustomEmail?.eventId) {
          return byCustomEmail.eventId;
        }
      }
    }

    // Priority 3: Fallback — no event context
    return undefined;
  }

  private async findOrCreateConversation(
    eventId: string | undefined,
    fromEmail: string,
    subject: string,
    payload: EmailReceivedDTO,
  ): Promise<string> {
    // Only create if we have an event context
    if (!eventId) {
      // No event — store in a fallback conversation or log
      // For now, skip creating a conversation
      throw new Error(`No event context for email from ${fromEmail}`);
    }

    // Check for existing open conversation for this guest+event
    const existing = await this.prisma.supportConversation.findFirst({
      where: {
        eventId,
        guestContact: fromEmail,
        status: { notIn: ['CLOSED', 'RESOLVED'] },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    // Create new conversation
    const conversation = await this.prisma.supportConversation.create({
      data: {
        eventId,
        guestName: payload.from ? this.extractName(payload.from) : fromEmail,
        guestContact: fromEmail,
        subject: subject.slice(0, 255),
        channel: 'EMAIL',
        status: 'OPEN',
        priority: 'NORMAL',
        emailMessageId: payload.messageId,
        emailInReplyTo: payload.inReplyTo,
        emailReferences: payload.references?.slice(0, 1024),
        lastMessagePreview: subject.slice(0, 100),
        lastMessageAt: new Date(),
      },
    });

    // Create mapping for this email address
    await this.prisma.conversationMapping.create({
      data: {
        channel: 'EMAIL',
        externalId: fromEmail,
        eventId,
        conversationId: conversation.id,
        mappingType: 'AUTO',
      },
    });

    // Create mapping for the source email if different
    const allTo = [...(payload.to ?? []), ...(payload.cc ?? [])].filter(Boolean);
    for (const toAddr of allTo) {
      const toEmail = this.extractEmail(toAddr);
      if (toEmail && toEmail !== fromEmail && eventId) {
        await this.prisma.conversationMapping.upsert({
          where: {
            uq_conversation_mapping: {
              channel: 'EMAIL',
              externalId: toEmail,
              eventId,
            },
          },
          create: {
            channel: 'EMAIL',
            externalId: toEmail,
            eventId,
            conversationId: conversation.id,
            mappingType: 'AUTO',
          },
          update: { conversationId: conversation.id },
        });
      }
    }

    return conversation.id;
  }

  private async addMessageToConversation(
    conversationId: string,
    payload: EmailReceivedDTO,
    direction: 'INBOUND' | 'OUTBOUND',
  ): Promise<void> {
    const body = payload.body ?? payload.htmlBody ?? '(no content)';

    const message = await this.prisma.supportMessage.create({
      data: {
        conversationId,
        direction,
        channel: 'EMAIL',
        fromGuest: direction === 'INBOUND',
        body,
        status: 'SENT',
        externalId: payload.messageId,
      },
    });

    // Update conversation metadata
    await this.prisma.supportConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: body.slice(0, 100),
        emailMessageId: payload.messageId ?? undefined,
        emailInReplyTo: payload.inReplyTo ?? undefined,
        emailReferences: payload.references?.slice(0, 1024) ?? undefined,
      },
    });

    // Publish realtime event
    await this.kafka.send({
      topic: KafkaTopics.conversation.guestReplied,
      payload: {
        id: message.id,
        conversationId: message.conversationId,
        direction: message.direction,
        channel: message.channel,
        fromGuest: message.fromGuest,
        body: message.body ?? undefined,
        status: message.status,
        createdAt: message.createdAt.toISOString(),
      } satisfies SupportMessageReceivedDTO,
      meta: {
        clazz: this.constructor.name,
        type: 'EVENT',
        service: 'email-support-service',
        operation: 'Email Inbound Processed',
        version: '1',
        actorId: 'system',
        tenantId: 'omnixys',
      },
    });
  }

  async handleOutbound(
    conversationId: string,
    body: string,
    user: { id: string },
  ): Promise<{ messageId: string; to: string } | null> {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation?.guestContact) {
      return null;
    }

    const message = await this.prisma.supportMessage.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        channel: 'EMAIL',
        fromUserId: user.id,
        fromGuest: false,
        body,
        status: 'SENT',
      },
    });

    // Publish to email outbound topic — Mail Adapter handles SMTP
    await this.kafka.send({
      topic: KafkaTopics.email.outboundSend,
      payload: {
        to: conversation.guestContact,
        subject: conversation.subject ? `Re: ${conversation.subject}` : 'Support Reply',
        body,
        inReplyTo: conversation.emailMessageId ?? undefined,
        references: [conversation.emailReferences ?? conversation.emailMessageId]
          .filter(Boolean)
          .join(' '),
        conversationId,
        messageId: message.id,
      } satisfies EmailOutboundDTO,
      meta: {
        clazz: this.constructor.name,
        type: 'COMMAND',
        service: 'email-support-service',
        operation: 'Email Outbound Requested',
        version: '1',
        actorId: user.id,
        tenantId: 'omnixys',
      },
    });

    return {
      messageId: message.id,
      to: conversation.guestContact,
    };
  }

  private extractEmail(input: string): string | undefined {
    if (!input) {
      return undefined;
    }
    const match = input.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    return match?.[0].toLowerCase();
  }

  private extractName(input: string): string {
    if (!input) {
      return 'Unknown';
    }
    const match = input.match(/^"?([^"<]+)"?\s*</);
    return match?.[1]?.trim() ?? this.extractEmail(input) ?? 'Unknown';
  }
}
