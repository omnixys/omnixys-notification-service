import {
  SignupAddressCacheDTO,
  SignupAuthCacheDTO,
  SignupUserCacheDTO,
} from '../models/dto/signup-verification-cache.dto.js';
import { Injectable } from '@nestjs/common';
import { ValkeyKey, ValkeyService } from '@omnixys/cache';
import {
  SignUpTokenPayload,
  GuestSignUpTokenPayload,
  GuestAuthKey,
  GuestEventKey,
  GuestSeatKey,
  CreatePendingUserDTO,
  GuestUserKey,
} from '@omnixys/contracts';
import { CreateUserInput } from '@omnixys/graphql';
import { OmnixysLogger } from '@omnixys/logger';
import { TraceRunner } from '@omnixys/observability';

function normalizeOptionalEmail(value?: string | null): string | undefined {
  return value ?? undefined;
}

@Injectable()
export class NotificationCacheService {
  private readonly logger;

  constructor(
    loggerService: OmnixysLogger,
    private readonly cache: ValkeyService,
  ) {
    this.logger = loggerService.log(this.constructor.name);
  }

  async storeSignupVerificationPayload(
    input: CreateUserInput,
    meta?: { ip?: string; userAgent?: string },
    ttlSeconds = 60 * 15,
  ): Promise<SignUpTokenPayload> {
    return TraceRunner.run('Store SignUp PAyload', async () => {
      const baseMeta = {
        createdAt: new Date().toISOString(),
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      };

      const { username, password, securityQuestions, ...userDomainData } = input;
      type UserDomainPayload = Omit<
        CreateUserInput,
        'password' | 'securityQuestions' | 'addresses'
      >;

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
        password,
        securityQuestions,
        meta: baseMeta,
      };

      this.logger.debug(
        '[TRACE] securityQuestions at cache-serialize boundary: %s %o from %s',
        authPayload.firstName,
        authPayload.securityQuestions,
        authPayload.username,
      );

      const [authKey, userKey, addressKey] = await Promise.all([
        this.cache.set(ValkeyKey.signupVerificationAuth, JSON.stringify(authPayload), ttlSeconds),
        this.cache.set(ValkeyKey.signupVerificationUser, JSON.stringify(userPayload), ttlSeconds),
        this.cache.set(
          ValkeyKey.signupVerificationAddress,
          JSON.stringify(addressPayload),
          ttlSeconds,
        ),
      ]);

      return { addressKey, authKey, userKey };
    });
  }

  async storeGuestVerificationPayload(
    input: CreatePendingUserDTO,
    ttlSeconds = 60 * 15,
  ): Promise<GuestSignUpTokenPayload> {
    return TraceRunner.run('Store Guest SignUp Payload', async () => {
      /**
       * Normalize invitees (main + plusOnes)
       */
      const invitees = [
        {
          invitationId: input.invitationId,
          firstName: input.firstName,
          lastName: input.lastName,
          email: normalizeOptionalEmail(input.email),
          phoneNumbers: input.phoneNumbers,
          isPrimary: true,
        },
        ...(input.plusOnes ?? []).map((p) => ({
          invitationId: p.invitationId,
          firstName: p.firstName,
          lastName: p.lastName,
          email: normalizeOptionalEmail(p.email),
          phoneNumbers: undefined,
          isPrimary: false,
        })),
      ];

      /**
       * AUTH → only identity relevant data
       */
      const authPayload: GuestAuthKey = {
        actorId: input.actorId,
        eventEndsAt: input.eventEndsAt,
        invitees: invitees.map((i) => ({
          invitationId: i.invitationId,
          email: normalizeOptionalEmail(i.email),
          firstName: i.firstName,
          lastName: i.lastName,
        })),
      };

      /**
       * USER → user creation data
       */
      const userPayload: GuestUserKey = {
        actorId: input.actorId,
        users: invitees.map((i) => ({
          invitationId: i.invitationId,
          firstName: i.firstName,
          lastName: i.lastName,
          email: normalizeOptionalEmail(i.email),
          phoneNumbers: i.phoneNumbers,
        })),
      };

      /**
       * EVENT → only mapping
       */
      const eventPayload: GuestEventKey = {
        eventId: input.eventId,
        actorId: input.actorId,
        invitationIds: invitees.map((i) => i.invitationId),
      };

      /**
       * SEAT → deterministic assignment
       */
      const seatPayload: GuestSeatKey = {
        eventId: input.eventId,
        actorId: input.actorId,

        assignments: [
          {
            invitationId: input.invitationId,
            seatId: input.seatId, // nur main user
            note: input.note,
          },

          ...(input.plusOnes ?? []).map((p) => ({
            invitationId: p.invitationId,
            seatId: undefined, // 🔥 wichtig → auto assignment
            note: undefined,
          })),
        ],
      };

      /**
       * Persist keys
       */
      const [authKey, userKey, eventKey, seatKey] = await Promise.all([
        this.cache.set(ValkeyKey.guestVerificationAuth, JSON.stringify(authPayload), ttlSeconds),
        this.cache.set(ValkeyKey.guestVerificationUser, JSON.stringify(userPayload), ttlSeconds),
        this.cache.set(ValkeyKey.guestVerificationEvent, JSON.stringify(eventPayload), ttlSeconds),
        this.cache.set(ValkeyKey.guestVerificationSeat, JSON.stringify(seatPayload), ttlSeconds),
      ]);

      return { eventKey, authKey, userKey, seatKey, eventEndAt: input.eventEndsAt };
    });
  }
}
