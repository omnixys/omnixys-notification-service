/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

// src/auth/registration/notification-cache.service.ts

import { ValkeyKey } from '../../valkey/valkey.keys.js';
import { ValkeyService } from '../../valkey/valkey.service.js';
import {
  SignupAddressCacheDTO,
  SignupAuthCacheDTO,
  SignupUserCacheDTO,
} from '../models/dto/signup-verification-cache.dto.js';
import { Injectable } from '@nestjs/common';
import { CreateUserInput } from '@omnixys/graphql';
import { randomUUID } from 'crypto';

@Injectable()
export class NotificationCacheService {
  constructor(private readonly valkey: ValkeyService) {}

  async storeSignupVerificationPayload(
    input: CreateUserInput,
    meta?: { ip?: string; userAgent?: string },
    ttlSeconds = 60 * 15,
  ) {
    const verificationId = randomUUID();

    const authKey = ValkeyKey.signupVerificationAuth(verificationId);
    const userKey = ValkeyKey.signupVerificationUser(verificationId);
    const addressKey = ValkeyKey.signupVerificationAddress(verificationId);

    const baseMeta = {
      createdAt: new Date().toISOString(),
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    };

    const { username, password, securityQuestions, ...userDomainData } = input;
    type UserDomainPayload = Omit<CreateUserInput, 'password' | 'securityQuestions' | 'addresses'>;

    const userPayload: SignupUserCacheDTO<UserDomainPayload> = {
      userData: { username, ...userDomainData },
      meta: baseMeta,
    };

    const addressPayload: SignupAddressCacheDTO = {
      addresses: input.addresses,
      meta: baseMeta,
    };

    const authPayload: SignupAuthCacheDTO = {
      username,
      email: input.personalInfo.email,
      firstName: input.personalInfo.firstName,
      lastName: input.personalInfo.lastName,
      password, // ⚠️ see security note below
      securityQuestions,
      meta: baseMeta,
    };

    await Promise.all([
      this.valkey.client.set(authKey, JSON.stringify(authPayload), {
        EX: ttlSeconds,
      }),
      this.valkey.client.set(userKey, JSON.stringify(userPayload), {
        EX: ttlSeconds,
      }),

      this.valkey.client.set(addressKey, JSON.stringify(addressPayload), {
        EX: ttlSeconds,
      }),
    ]);

    return { verificationId, authKey, userKey };
  }
}
