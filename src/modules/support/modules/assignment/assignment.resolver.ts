import type { SupportConversation as PrismaSupportConversation } from '../../../../prisma/generated/client.js';
import { SupportConversation } from '../conversation/entities/support-conversation.entity.js';
import { AssignmentService } from './assignment.service.js';
import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { getLogger } from '@omnixys/logger';
import {
  CookieAuthGuard,
  CurrentUser,
  CurrentUserData,
} from '@omnixys/security';

@Resolver()
export class AssignmentResolver {
  readonly #logger = getLogger(AssignmentResolver.name);

  constructor(private readonly assignmentService: AssignmentService) {}

  @Query(() => [SupportConversation])
  @UseGuards(CookieAuthGuard)
  async supportQueue(
    @Args('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PrismaSupportConversation[]> {
    return this.assignmentService.getQueue(eventId, user);
  }

  @Query(() => [SupportConversation])
  @UseGuards(CookieAuthGuard)
  async supportUnassigned(
    @Args('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PrismaSupportConversation[]> {
    return this.assignmentService.getUnassigned(eventId, user);
  }

  @Query(() => [SupportConversation])
  @UseGuards(CookieAuthGuard)
  async supportAssignedToMe(
    @Args('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PrismaSupportConversation[]> {
    return this.assignmentService.getAssignedToMe(eventId, user.id, user);
  }
}
