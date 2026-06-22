import { ContextAccessor } from '@omnixys/context';
import {
  FrameworkException,
  type FrameworkExceptionOptions,
} from '@omnixys/contracts';

function options(
  metadata: Readonly<Record<string, unknown>> = {},
  cause?: unknown,
): FrameworkExceptionOptions {
  const context = ContextAccessor.get();
  return {
    cause,
    context: {
      requestId: context?.requestId,
      correlationId: context?.correlationId,
      traceId: context?.trace?.traceId,
      actorId: context?.principal?.actorId,
      tenantId: context?.tenant?.tenantId ?? context?.principal?.tenantId,
    },
    metadata,
  };
}

export class NotificationDomainException extends FrameworkException {
  constructor(
    code: string,
    message: string,
    metadata: Readonly<Record<string, unknown>> = {},
    cause?: unknown,
  ) {
    super(code, message, options(metadata, cause));
  }
}

export class NotificationNotFoundException extends NotificationDomainException {
  constructor(notificationId: string) {
    super('NOTIFICATION_NOT_FOUND', 'Notification was not found', {
      notificationId,
    });
  }
}

export class NotificationStateException extends NotificationDomainException {
  constructor(reason: string, cause?: unknown) {
    super(
      'NOTIFICATION_STATE_INVALID',
      'Notification state is invalid or expired',
      { reason },
      cause,
    );
  }
}
