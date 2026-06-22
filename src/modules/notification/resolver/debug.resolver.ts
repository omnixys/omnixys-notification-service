import { WhatsAppWebProvider } from '../../messages/providers/whatsapp/whatsapp-web.provider.js';
import { NotificationWriteService } from '../services/notification-write.service.js';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RequestCookies } from '@omnixys/context';
import { CreateUserInput } from '@omnixys/graphql';
import { OmnixysLogger } from '@omnixys/logger';
import { CookieAuthGuard, RoleGuard, Roles } from '@omnixys/security';
import { RealmRoleType } from '@omnixys/shared';
import type { OmnixysCookieRequest } from '@omnixys/shared';

@Resolver()
@UseGuards(CookieAuthGuard, RoleGuard)
@Roles(RealmRoleType.ADMIN)
export class DebugResolver {
  private readonly logger;

  constructor(
    loggerService: OmnixysLogger,
    private readonly notificationWriteService: NotificationWriteService,
    private readonly whatsAppProvider: WhatsAppWebProvider,
  ) {
    this.logger = loggerService.log(this.constructor.name);
  }

  @Query(() => String, { nullable: true })
  getQr(): string | null {
    const url = this.whatsAppProvider.getQrCodeUrl();

    this.logger.debug('QR requested: available=%s', Boolean(url));

    return url;
  }
  @Query(() => String)
  getWhatsappState(): string {
    return this.whatsAppProvider.getState();
  }

  @Mutation(() => String, { name: 'DEBUG_createSignupVerification' })
  async createSignupVerification(
    @Args('createUserInput') createUserInput: CreateUserInput,
    @RequestCookies() cookies: OmnixysCookieRequest,
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
