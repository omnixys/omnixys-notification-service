import type {
  InternalConversation as PrismaInternalConversation,
  InternalMessage as PrismaInternalMessage,
  InternalParticipant as PrismaInternalParticipant,
} from '../../prisma/generated/client.js';
import {
  InternalConversation,
  InternalConversationType,
  InternalMessage,
  InternalMessagePriority,
  InternalParticipant,
} from './entities/internal-conversation.entity.js';
import { InternalService } from './internal.service.js';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  CookieAuthGuard,
  CurrentUser,
  CurrentUserData,
} from '@omnixys/security';

@Resolver()
export class InternalResolver {
  constructor(private readonly internalService: InternalService) {}

  @Query(() => [InternalConversation])
  @UseGuards(CookieAuthGuard)
  async internalConversations(
    @Args('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PrismaInternalConversation[]> {
    return this.internalService.findConversations(eventId, user);
  }

  @Query(() => InternalConversation)
  @UseGuards(CookieAuthGuard)
  async internalConversation(
    @Args('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PrismaInternalConversation> {
    return this.internalService.findConversationById(id, user);
  }

  @Query(() => [InternalMessage])
  @UseGuards(CookieAuthGuard)
  async internalMessages(
    @Args('conversationId') conversationId: string,
    @CurrentUser() user: CurrentUserData,
    @Args('limit', { nullable: true, type: () => Number }) limit?: number,
  ): Promise<PrismaInternalMessage[]> {
    return this.internalService.findMessages(conversationId, user, limit);
  }

  @Mutation(() => InternalConversation)
  @UseGuards(CookieAuthGuard)
  async createInternalConversation(
    @CurrentUser() user: CurrentUserData,
    @Args('eventId') eventId: string,
    @Args('title') title: string,
    @Args('type', { type: () => InternalConversationType })
    type: InternalConversationType,
    @Args('description', { nullable: true }) description?: string,
    @Args('participantIds', { nullable: true, type: () => [String] })
    participantIds?: string[],
  ): Promise<PrismaInternalConversation> {
    return this.internalService.createConversation(
      eventId,
      {
        title,
        description,
        type,
        participantIds,
      },
      user,
    );
  }

  @Mutation(() => InternalMessage)
  @UseGuards(CookieAuthGuard)
  async sendInternalMessage(
    @CurrentUser() user: CurrentUserData,
    @Args('conversationId') conversationId: string,
    @Args('body') body: string,
    @Args('priority', { nullable: true, type: () => InternalMessagePriority })
    priority?: InternalMessagePriority,
  ): Promise<PrismaInternalMessage> {
    return this.internalService.sendMessage(
      conversationId,
      {
        body,
        priority,
      },
      user,
    );
  }

  @Mutation(() => InternalParticipant)
  @UseGuards(CookieAuthGuard)
  async markInternalConversationRead(
    @CurrentUser() user: CurrentUserData,
    @Args('conversationId') conversationId: string,
  ): Promise<PrismaInternalParticipant> {
    return this.internalService.markAsRead(conversationId, user);
  }

  @Mutation(() => InternalConversation)
  @UseGuards(CookieAuthGuard)
  async archiveInternalConversation(
    @CurrentUser() user: CurrentUserData,
    @Args('id') id: string,
  ): Promise<PrismaInternalConversation> {
    return this.internalService.archiveConversation(id, user);
  }
}
