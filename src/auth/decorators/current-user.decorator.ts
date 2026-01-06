// TODO resolve eslint
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { KeycloakRawOutput } from '../dto/kc-rwa.dto.js';
import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { FastifyRequest } from 'fastify';

export interface CurrentUserData {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];

  access_token: string;
  refresh_token: string;

  raw: KeycloakRawOutput; // full KC payload

  // duplicated raw for convenience
  sub: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  realm_access: { roles: string[] };
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserData | null => {
    const gqlCtx = GqlExecutionContext.create(context);
    const req: FastifyRequest = gqlCtx.getContext().req;

    const event = req.event;

    if (!event) {
      return null;
    }

    return {
      id: event.sub,
      username: event.preferred_username,
      email: event.email,

      firstName: event.given_name,
      lastName: event.family_name,

      roles: event.realm_access?.roles ?? [],

      access_token: event.access_token,
      refresh_token: event.refresh_token,

      raw: event.raw,

      // duplicated raw fields
      sub: event.sub,
      preferred_username: event.preferred_username,
      given_name: event.given_name,
      family_name: event.family_name,
      realm_access: event.realm_access,
    };
  },
);
