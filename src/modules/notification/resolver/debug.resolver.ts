import { NotificationWriteService } from '../services/notification-write.service.js';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { RequestCookies } from '@omnixys/context';
import { RealmRoleType } from '@omnixys/contracts';
import type { OmnixysCookieRequest } from '@omnixys/contracts';
import { CreateUserInput } from '@omnixys/graphql';
import { OmnixysLogger } from '@omnixys/logger';
import { CookieAuthGuard, RoleGuard, Roles } from '@omnixys/security';

@Resolver()
@UseGuards(CookieAuthGuard, RoleGuard)
@Roles(RealmRoleType.ADMIN)
export class DebugResolver {
  private readonly logger;

  constructor(
    loggerService: OmnixysLogger,
    private readonly notificationWriteService: NotificationWriteService,
  ) {
    this.logger = loggerService.log(this.constructor.name);
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
