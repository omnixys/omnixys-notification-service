import { NotificationWriteService } from '../services/notification-write.service.js';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { RequestCookies } from '@omnixys/context-ts';
import { RealmRoleType } from '@omnixys/contracts-ts';
import type { OmnixysCookieRequest } from '@omnixys/contracts-ts';
import { CreateUserInput } from '@omnixys/graphql-ts';
import { OmnixysLogger } from '@omnixys/logger-ts';
import { CookieAuthGuard, RoleGuard, Roles } from '@omnixys/security-ts';

@Resolver()
@UseGuards(CookieAuthGuard, RoleGuard)
@Roles(RealmRoleType.ADMIN)
export class DebugResolver {
  private readonly logger;

  constructor(
    loggerService: OmnixysLogger,
    private readonly notificationWriteService: NotificationWriteService,
  ) {
    this.logger = loggerService.log(
      this.constructor.name,
    );
  }

  @Mutation(() => String, { name: 'DEBUG_createSignupVerification' })
  async createSignupVerification(
    @Args('createUserInput') createUserInput: CreateUserInput,
    @RequestCookies() cookies: OmnixysCookieRequest,
  ): Promise<string> {
    const locale = cookies.locale ?? 'en-US';

    this.logger.debug(
      'createSignupVerification: input=%o locale=%s',
      createUserInput,
      locale,
    );

    const payload =
      await this.notificationWriteService.createSignupVerification({
        createUserInput,
        locale,
      });

    return payload;
  }
}
