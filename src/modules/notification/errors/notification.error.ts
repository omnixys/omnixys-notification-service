import { ContextAccessor } from '@omnixys/context';
import {
  ErrorCode,
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
  constructor(notificationId?: string) {
    super(ErrorCode.NOTIFICATION_NOT_FOUND, 'Notification was not found', {
      notificationId,
    });
  }
}

export class NotificationStateException extends NotificationDomainException {
  constructor(
    reason: string,
    cause?: unknown,
    metadata: Readonly<Record<string, unknown>> = {},
  ) {
    super(
      ErrorCode.NOTIFICATION_STATE_INVALID,
      'Notification state is invalid or expired',
      { reason, ...metadata },
      cause,
    );
  }
}

export class NotificationInputException extends NotificationDomainException {
  constructor(
    reason: string,
    metadata: Readonly<Record<string, unknown>> = {},
  ) {
    super(
      ErrorCode.NOTIFICATION_INPUT_INVALID,
      'Notification input is invalid',
      {
        reason,
        ...metadata,
      },
    );
  }
}

export class NotificationDeliveryException extends NotificationDomainException {
  constructor(
    channel: string,
    cause?: unknown,
    metadata: Readonly<Record<string, unknown>> = {},
  ) {
    super(
      ErrorCode.NOTIFICATION_DELIVERY_FAILED,
      'Notification delivery failed',
      { channel, ...metadata },
      cause,
    );
  }
}

export class NotificationChannelUnavailableException extends NotificationDomainException {
  constructor(channel: string, reason = 'provider-unavailable') {
    super(
      ErrorCode.NOTIFICATION_CHANNEL_UNAVAILABLE,
      'Notification channel is unavailable',
      { channel, reason },
    );
  }
}

export class TemplateNotFoundException extends NotificationDomainException {
  constructor(metadata: Readonly<Record<string, unknown>> = {}) {
    super(
      ErrorCode.TEMPLATE_NOT_FOUND,
      'Notification template was not found',
      metadata,
    );
  }
}

export class TemplateAlreadyExistsException extends NotificationDomainException {
  constructor(metadata: Readonly<Record<string, unknown>> = {}) {
    super(
      ErrorCode.TEMPLATE_ALREADY_EXISTS,
      'Notification template already exists',
      metadata,
    );
  }
}

export class TemplateStateException extends NotificationDomainException {
  constructor(
    reason: string,
    metadata: Readonly<Record<string, unknown>> = {},
  ) {
    super(
      ErrorCode.TEMPLATE_STATE_INVALID,
      'Notification template state is invalid',
      {
        reason,
        ...metadata,
      },
    );
  }
}

export class ChatNotFoundException extends NotificationDomainException {
  constructor(chatId?: string) {
    super(ErrorCode.CHAT_NOT_FOUND, 'Chat was not found', { chatId });
  }
}

export class ChatAccessDeniedException extends NotificationDomainException {
  constructor(chatId?: string, reason = 'insufficient-permission') {
    super(ErrorCode.CHAT_ACCESS_DENIED, 'Chat access is not authorized', {
      chatId,
      reason,
    });
  }
}

export class ChatStateException extends NotificationDomainException {
  constructor(chatId: string, state: string) {
    super(
      ErrorCode.CHAT_STATE_INVALID,
      'Chat state does not allow this operation',
      {
        chatId,
        state,
      },
    );
  }
}

export class ChatAssignmentConflictException extends NotificationDomainException {
  constructor(chatId: string) {
    super(
      ErrorCode.CHAT_ASSIGNMENT_CONFLICT,
      'Chat assignment is already in progress',
      {
        chatId,
      },
    );
  }
}

export class MessageInputException extends NotificationDomainException {
  constructor(
    reason: string,
    metadata: Readonly<Record<string, unknown>> = {},
  ) {
    super(ErrorCode.MESSAGE_INPUT_INVALID, 'Message input is invalid', {
      reason,
      ...metadata,
    });
  }
}

// Support Conversation exceptions
export class ConversationNotFoundException extends NotificationDomainException {
  constructor(conversationId?: string) {
    super(
      ErrorCode.CONVERSATION_NOT_FOUND,
      'Support conversation was not found',
      { conversationId },
    );
  }
}

export class ConversationAccessDeniedException extends NotificationDomainException {
  constructor(conversationId?: string, reason = 'insufficient-permission') {
    super(
      ErrorCode.CONVERSATION_ACCESS_DENIED,
      'Access denied to support conversation',
      { conversationId, reason },
    );
  }
}

export class ConversationStateException extends NotificationDomainException {
  constructor(conversationId: string, state: string) {
    super(
      ErrorCode.CONVERSATION_STATE_INVALID,
      'Support conversation state does not allow this operation',
      { conversationId, state },
    );
  }
}

export class ConversationAssignmentConflictException extends NotificationDomainException {
  constructor(conversationId: string) {
    super(
      ErrorCode.CONVERSATION_ASSIGNMENT_CONFLICT,
      'Conversation assignment is already in progress',
      { conversationId },
    );
  }
}

export class ConversationClosedException extends NotificationDomainException {
  constructor(conversationId?: string) {
    super(ErrorCode.CONVERSATION_CLOSED, 'Support conversation is closed', {
      conversationId,
    });
  }
}

export class ConversationChannelUnavailableException extends NotificationDomainException {
  constructor(channel: string, reason = 'provider-unavailable') {
    super(
      ErrorCode.CONVERSATION_CHANNEL_UNAVAILABLE,
      'Support conversation channel is unavailable',
      { channel, reason },
    );
  }
}

export class ConversationDuplicateException extends NotificationDomainException {
  constructor(conversationId?: string) {
    super(
      ErrorCode.CONVERSATION_DUPLICATE,
      'A conversation with these parameters already exists',
      { conversationId },
    );
  }
}

export class QuickReplyNotFoundException extends NotificationDomainException {
  constructor(keyOrId?: string) {
    super(ErrorCode.QUICK_REPLY_NOT_FOUND, 'Quick reply was not found', {
      keyOrId,
    });
  }
}

export class QuickReplyDuplicateException extends NotificationDomainException {
  constructor(key?: string) {
    super(
      ErrorCode.QUICK_REPLY_DUPLICATE,
      'Quick reply with this key already exists',
      {
        key,
      },
    );
  }
}
