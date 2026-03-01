// src/auth/registration/dto/signup-verification-cache.dto.ts

import type { AddSecurityQuestionInput } from '../inputs/security-question.input.js';

export interface SignupVerificationCacheDTO<TCreateUserInput> {
  input: TCreateUserInput;

  meta: {
    createdAt: string; // ISO
    ip?: string;
    userAgent?: string;
  };
}

// user/models/dto/signup-user-cache.dto.ts
export interface SignupUserCacheDTO<TUserPayload> {
  userData: TUserPayload;
  meta: {
    createdAt: string;
    ip?: string;
    userAgent?: string;
  };
}

// auth/models/dto/signup-auth-cache.dto.ts
export interface SignupAuthCacheDTO {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  securityQuestions?: AddSecurityQuestionInput[];
  meta: {
    createdAt: string;
    ip?: string;
    userAgent?: string;
  };
}
