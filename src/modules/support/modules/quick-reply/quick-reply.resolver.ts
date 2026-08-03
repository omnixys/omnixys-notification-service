import type { SupportQuickReply } from '../../../../prisma/generated/client.js';
import { QuickReply } from './entities/quick-reply.entity.js';
import { QuickReplyService } from './quick-reply.service.js';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RealmRoleType } from '@omnixys/contracts-ts';
import { CookieAuthGuard, RoleGuard, Roles } from '@omnixys/security-ts';

@Resolver()
@UseGuards(CookieAuthGuard, RoleGuard)
@Roles(RealmRoleType.ADMIN)
export class QuickReplyResolver {
  constructor(private readonly quickReplyService: QuickReplyService) {}

  @Query(() => [QuickReply])
  async quickReplies(): Promise<SupportQuickReply[]> {
    return this.quickReplyService.findAll();
  }

  @Query(() => QuickReply)
  async quickReply(@Args('id') id: string): Promise<SupportQuickReply> {
    return this.quickReplyService.findById(id);
  }

  @Mutation(() => QuickReply)
  async createQuickReply(
    @Args('key') key: string,
    @Args('body') body: string,
    @Args('channel', { nullable: true }) channel?: string,
    @Args('tags', { type: () => [String], nullable: true }) tags?: string[],
  ): Promise<SupportQuickReply> {
    return this.quickReplyService.create({ key, body, channel, tags });
  }

  @Mutation(() => QuickReply)
  async updateQuickReply(
    @Args('id') id: string,
    @Args('key', { nullable: true }) key?: string,
    @Args('body', { nullable: true }) body?: string,
    @Args('channel', { nullable: true }) channel?: string,
    @Args('tags', { type: () => [String], nullable: true }) tags?: string[],
  ): Promise<SupportQuickReply> {
    return this.quickReplyService.update(id, { key, body, channel, tags });
  }

  @Mutation(() => Boolean)
  async deleteQuickReply(@Args('id') id: string): Promise<boolean> {
    await this.quickReplyService.delete(id);
    return true;
  }
}
