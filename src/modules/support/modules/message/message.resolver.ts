import type { SupportMessage as PrismaSupportMessage } from '../../../../prisma/generated/client.js';
import { SupportMessage } from './entities/support-message.entity.js';
import { MessageService } from './message.service.js';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  CookieAuthGuard,
  CurrentUser,
  CurrentUserData,
} from '@omnixys/security-ts';

@Resolver()
export class MessageResolver {
  constructor(private readonly messageService: MessageService) {}

  @Query(() => [SupportMessage])
  @UseGuards(CookieAuthGuard)
  async supportMessages(
    @CurrentUser() user: CurrentUserData,
    @Args('conversationId') conversationId: string,
    @Args('limit', { nullable: true, type: () => Number }) limit?: number,
  ): Promise<PrismaSupportMessage[]> {
    return this.messageService.getMessages(conversationId, user, limit);
  }

  @Mutation(() => SupportMessage)
  @UseGuards(CookieAuthGuard)
  async sendSupportMessage(
    @CurrentUser() user: CurrentUserData,
    @Args('conversationId') conversationId: string,
    @Args('body', { nullable: true }) body?: string,
    @Args('mediaUrl', { nullable: true }) mediaUrl?: string,
  ): Promise<PrismaSupportMessage> {
    return this.messageService.sendMessage(
      conversationId,
      { body, mediaUrl },
      user,
    );
  }
}
