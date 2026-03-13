/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { LoggerPlus } from '../../logger/logger-plus.js';
import { LoggerPlusService } from '../../logger/logger-plus.service.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { NotificationWriteService } from '../services/notification-write.service.js';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CookieAuthGuard, RoleGuard, Roles } from '@omnixys/auth';
import { RequestCookies } from '@omnixys/context';
import { RealmRoleType } from '@omnixys/contracts';
import { CreateUserInput } from '@omnixys/graphql';

@Resolver()
@UseInterceptors(ResponseTimeInterceptor)
export class DebugResolver {
  private readonly logger: LoggerPlus;

  constructor(
    loggerService: LoggerPlusService,
    private readonly notificationWriteService: NotificationWriteService,
  ) {
    this.logger = loggerService.getLogger(this.constructor.name);
  }

  @Mutation(() => String, { name: 'DEBUG_createSignupVerification' })
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.ADMIN)
  async createSignupVerification(
    @Args('createUserInput') createUserInput: CreateUserInput,
    @RequestCookies() cookies: Record<string, string>,
  ): Promise<string> {
    const locale = cookies.locale ?? 'en-US';

    this.logger.debug(
      'createSignupVerification: username=%s locale=%s',
      createUserInput.username,
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
