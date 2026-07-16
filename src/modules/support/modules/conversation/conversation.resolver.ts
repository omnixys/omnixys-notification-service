import type { SupportConversation as PrismaSupportConversation } from '../../../../prisma/generated/client.js';
import { ConversationService } from './conversation.service.js';
import {
  ConversationChannel,
  ConversationPriority,
  ConversationStatus,
  SupportConversation,
} from './entities/support-conversation.entity.js';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  CookieAuthGuard,
  CurrentUser,
  CurrentUserData,
} from '@omnixys/security';

@Resolver()
export class ConversationResolver {
  constructor(private readonly conversationService: ConversationService) {}

  @Query(() => SupportConversation)
  @UseGuards(CookieAuthGuard)
  async supportConversation(
    @Args('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PrismaSupportConversation> {
    return this.conversationService.findById(id, user);
  }

  @Query(() => [SupportConversation])
  @UseGuards(CookieAuthGuard)
  async supportConversationsByEvent(
    @Args('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PrismaSupportConversation[]> {
    return this.conversationService.findByEvent(eventId, user);
  }

  @Query(() => [SupportConversation])
  @UseGuards(CookieAuthGuard)
  async mySupportConversations(
    @CurrentUser() user: CurrentUserData,
  ): Promise<PrismaSupportConversation[]> {
    return this.conversationService.findByUser(user.id);
  }

  @Query(() => [SupportConversation])
  @UseGuards(CookieAuthGuard)
  async unreadCountsByEvent(
    @Args('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PrismaSupportConversation[]> {
    return this.conversationService.getUnreadCountsByEvent(eventId, user);
  }

  @Mutation(() => SupportConversation)
  @UseGuards(CookieAuthGuard)
  async markConversationAsRead(
    @Args('conversationId') conversationId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PrismaSupportConversation> {
    return this.conversationService.markAsRead(conversationId, user);
  }

  @Mutation(() => SupportConversation)
  @UseGuards(CookieAuthGuard)
  async createSupportConversation(
    @CurrentUser() user: CurrentUserData,
    @Args('eventId') eventId: string,
    @Args('guestName') guestName: string,
    @Args('firstMessage') firstMessage: string,
    @Args('channel', { type: () => ConversationChannel })
    channel: ConversationChannel,
    @Args('invitationId', { nullable: true }) invitationId?: string,
    @Args('guestContact', { nullable: true }) guestContact?: string,
    @Args('subject', { nullable: true }) subject?: string,
  ): Promise<PrismaSupportConversation> {
    return this.conversationService.create(eventId, {
      invitationId,
      guestUserId: user.id,
      guestName,
      guestContact,
      subject,
      channel,
      firstMessage,
    });
  }

  @Mutation(() => SupportConversation)
  @UseGuards(CookieAuthGuard)
  async updateSupportConversation(
    @CurrentUser() user: CurrentUserData,
    @Args('id') id: string,
    @Args('subject', { nullable: true }) subject?: string,
    @Args('priority', { nullable: true, type: () => ConversationPriority })
    priority?: ConversationPriority,
  ): Promise<PrismaSupportConversation> {
    return this.conversationService.update(id, { subject, priority }, user);
  }

  @Query(() => Number)
  @UseGuards(CookieAuthGuard)
  async supportConversationCount(
    @CurrentUser() user: CurrentUserData,
    @Args('eventId') eventId: string,
    @Args('status', { nullable: true, type: () => ConversationStatus })
    status?: ConversationStatus,
  ): Promise<number> {
    return this.conversationService.countByEvent(eventId, user, status);
  }
}
