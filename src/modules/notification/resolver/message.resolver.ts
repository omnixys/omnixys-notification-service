import { UseGuards } from '@nestjs/common';
import { Args, Field, InputType, Mutation, Resolver } from '@nestjs/graphql';
import { OmnixysLogger } from '@omnixys/logger-ts';
import {
  CookieAuthGuard,
  CurrentUser,
  CurrentUserData,
} from '@omnixys/security-ts';

@InputType()
export class SendInAppMessageInput {
  @Field()
  userId!: string;

  @Field()
  message!: string;

  @Field(() => Boolean, { nullable: true })
  important?: boolean;

  @Field(() => Boolean, { nullable: true })
  secret?: boolean;

  @Field(() => Boolean, { nullable: true })
  viewOnce?: boolean;
}

@InputType()
export class SendEmail {
  @Field()
  email!: string;

  @Field()
  subject!: string;

  @Field()
  body!: string;
}

@Resolver()
export class MessageResolver {
  readonly log;
  constructor(readonly omnixysLogger: OmnixysLogger) {
    this.log = omnixysLogger.log(this.constructor.name);
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async sendInAppMessage(
    @Args('input') input: SendInAppMessageInput,
    @CurrentUser() user: CurrentUserData,
  ): Promise<boolean> {
    this.log.debug(
      'sendInAppMessage called: recipientId=%s actorId=%s',
      input.userId,
      user.id,
    );
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async sendEmail(
    @Args('input') input: SendEmail,
    @CurrentUser() user: CurrentUserData,
  ): Promise<boolean> {
    this.log.debug('sendEmail called: to=%s actorId=%s', input.email, user.id);
    return true;
  }
}
