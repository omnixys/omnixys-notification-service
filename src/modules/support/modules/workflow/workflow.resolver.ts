import type { SupportConversation as PrismaSupportConversation } from '../../../../prisma/generated/client.js';
import { SupportConversation } from '../conversation/entities/support-conversation.entity.js';
import { WorkflowService } from './workflow.service.js';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
  CookieAuthGuard,
  CurrentUser,
  CurrentUserData,
} from '@omnixys/security-ts';

@Resolver()
export class WorkflowResolver {
  constructor(private readonly workflowService: WorkflowService) {}

  @Mutation(() => SupportConversation)
  @UseGuards(CookieAuthGuard)
  async assignSupportConversation(
    @Args('conversationId') conversationId: string,
    @Args('userId') userId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PrismaSupportConversation> {
    return this.workflowService.assignConversation(
      conversationId,
      userId,
      user,
    );
  }

  @Mutation(() => SupportConversation)
  @UseGuards(CookieAuthGuard)
  async closeSupportConversation(
    @Args('conversationId') conversationId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PrismaSupportConversation> {
    return this.workflowService.closeConversation(conversationId, user);
  }

  @Mutation(() => SupportConversation)
  @UseGuards(CookieAuthGuard)
  async reopenSupportConversation(
    @Args('conversationId') conversationId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PrismaSupportConversation> {
    return this.workflowService.reopenConversation(conversationId, user);
  }
}
