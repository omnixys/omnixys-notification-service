import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CookieAuthGuard } from '../../auth/guards/cookie-auth.guard.js';
import { RoleGuard } from '../../auth/guards/role.guard.js';
import { LoggerPlus } from '../../logger/logger-plus.js';
import { LoggerPlusService } from '../../logger/logger-plus.service.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { NotificationWriteService } from '../services/notification-write.service.js';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
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
  @Roles('ADMIN')
  async createSignupVerification(
    @Args('createUserInput') createUserInput: CreateUserInput,
    @Context() ctx: any,
  ): Promise<string> {
    const cookieReq = ctx.req;
    const locale: string = cookieReq.cookies.locale ?? 'de-DE';

    this.logger.info(
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
