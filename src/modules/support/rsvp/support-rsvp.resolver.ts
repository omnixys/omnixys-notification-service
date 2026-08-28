import { SupportConversation } from '../modules/conversation/entities/support-conversation.entity.js';
import { SupportMessage } from '../modules/message/entities/support-message.entity.js';
import {
  RsvpConversationResult,
  SupportRsvpService,
} from './support-rsvp.service.js';
import {
  Args,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { getLogger } from '@omnixys/logger-ts';

@ObjectType()
export class RsvpSupportConversationResult {
  @Field(() => SupportConversation, { nullable: true })
  conversation!: SupportConversation | null;

  @Field(() => [SupportMessage])
  messages!: SupportMessage[];
}

/**
 * Public support operations for RSVP guests. The `invitationId` is treated as
 * a capability (like the existing RSVP link): every operation is re-validated
 * server-side against the invitation-service and rate-limited by the global
 * rate-limit guard. No authentication is required; no guest identity is trusted
 * from the client.
 */
@Resolver()
export class SupportRsvpResolver {
  readonly #logger = getLogger(SupportRsvpResolver.name);

  constructor(private readonly rsvpService: SupportRsvpService) {}

  @Query(() => RsvpSupportConversationResult)
  async rsvpSupportConversation(
    @Args('invitationId') invitationId: string,
  ): Promise<RsvpConversationResult> {
    this.#logger.debug(
      { hasInvitation: Boolean(invitationId) },
      'rsvp_support_conversation',
    );
    return this.rsvpService.conversation(invitationId);
  }

  @Query(() => [SupportMessage])
  async rsvpSupportMessages(
    @Args('invitationId') invitationId: string,
    @Args('limit', { nullable: true, type: () => Number }) limit?: number,
  ): Promise<SupportMessage[]> {
    this.#logger.debug(
      { hasInvitation: Boolean(invitationId) },
      'rsvp_support_messages',
    );
    return this.rsvpService.messages(invitationId, limit);
  }

  @Mutation(() => SupportMessage)
  async rsvpSendSupportMessage(
    @Args('invitationId') invitationId: string,
    @Args('body', { nullable: true }) body?: string,
    @Args('mediaUrl', { nullable: true }) mediaUrl?: string,
  ): Promise<SupportMessage> {
    this.#logger.debug(
      { hasInvitation: Boolean(invitationId) },
      'rsvp_send_support_message',
    );
    return this.rsvpService.sendMessage(invitationId, body, mediaUrl);
  }

  @Mutation(() => SupportConversation)
  async rsvpMarkConversationAsRead(
    @Args('invitationId') invitationId: string,
  ): Promise<SupportConversation> {
    this.#logger.debug(
      { hasInvitation: Boolean(invitationId) },
      'rsvp_mark_conversation_as_read',
    );
    return this.rsvpService.markAsRead(invitationId);
  }
}
