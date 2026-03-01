/* eslint-disable @typescript-eslint/explicit-function-return-type */

// src/auth/registration/notification-cache.service.ts

import { ValkeyKey } from '../../valkey/valkey.keys.js';
import { ValkeyService } from '../../valkey/valkey.service.js';
import {
  SignupAuthCacheDTO,
  SignupUserCacheDTO,
} from '../models/dto/signup-verification-cache.dto.js';
import { CreateUserInput } from '../models/inputs/create-user.input.js';
import { Injectable } from '@nestjs/common';
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

    const baseMeta = {
      createdAt: new Date().toISOString(),
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    };

    const { username, password, securityQuestions, ...userDomainData } = input;
    type UserDomainPayload = Omit<CreateUserInput, 'password' | 'securityQuestions'>;

    const userPayload: SignupUserCacheDTO<UserDomainPayload> = {
      userData: { username, ...userDomainData },
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
    ]);

    return { verificationId, authKey, userKey };
  }
}
