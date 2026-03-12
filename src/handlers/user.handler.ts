// /* eslint-disable @typescript-eslint/no-explicit-any */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /**
//  * @license GPL-3.0-or-later
//  * Copyright (C) 2025 Caleb Gyamfi - Omnixys Technologies
//  *
//  * This program is free software: you can redistribute it and/or modify
//  * it under the terms of the GNU General Public License as published by
//  * the Free Software Foundation, either version 3 of the License, or
//  * (at your option) any later version.
//  *
//  * This program is distributed in the hope that it will be useful,
//  * but WITHOUT ANY WARRANTY; without even the implied warranty of
//  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
//  * See the GNU General Public License for more details.
//  *
//  * For more information, visit <https://www.gnu.org/licenses/>.
//  */

// import {
//   KafkaEvent,
//   KafkaHandler,
// } from '../kafka/decorators/kafka-event.decorator.js';
// import {
//   KafkaEventContext,
//   KafkaEventHandler,
// } from '../kafka/interface/kafka-event.interface.js';
// import { getTopic, getTopics } from '../kafka/kafka-topic.properties.js';
// import { LoggerPlusService } from '../logger/logger-plus.service.js';
// import { MailService } from '../messages/services/mail.service.js';
// import { MailDTO } from '../notification/models/dto/mail.dto.js';
// import { Channel } from '../notification/models/enums/channel.enum.js';
// import { NotificationWriteService } from '../notification/services/notification-write.service.js';
// import { TemplateRenderService } from '../notification/services/template-renderer.service.js';
// import { Injectable } from '@nestjs/common';

// /**
//  * Handles user-related security events such as password reset requests.
//  *
//  * @category Messaging
//  * @since 1.1.0
//  */
// @KafkaHandler('user')
// @Injectable()
// export class UserHandler implements KafkaEventHandler {
//   private readonly logger;

//   constructor(
//     private readonly loggerService: LoggerPlusService,
//     private readonly notificationWriteService: NotificationWriteService,
//     private readonly templateRenderService: TemplateRenderService,
//     private readonly mailService: MailService,
//   ) {
//     this.logger = this.loggerService.getLogger(this.constructor.name);
//   }

//   @KafkaEvent(...getTopics('resetPassword', 'sendSecurityAlert', 'createUser'))
//   async handle(
//     topic: string,
//     data: { payload: unknown },
//     context: KafkaEventContext,
//   ): Promise<void> {
//     this.logger.warn(`User security event received: ${topic}`);
//     this.logger.debug('Kafka context: %o', context);

//     switch (topic) {
//       case getTopic('resetPassword'):
//         await this.sendRegistrationMail(data.payload as MailDTO);
//         break;

//       // case getTopic('sendSecurityAlert'):
//       //   await this.handleSecurityAlert(
//       //     data as { payload: SecurityPasswordResetAlertDTO },
//       //   );
//       //   break;

//       // case getTopic('createUser'):
//       //   await this.handleUserRegistration(data as { payload: MailDTO });
//       //   break;

//       default:
//         this.logger.warn(`Unhandled user topic: ${topic}`);
//     }
//   }

//   /**
//    * Sends password reset confirmation email to the user.
//    */
//   // private async handlePasswordResetRequest(data: {
//   //   payload: PasswordResetRequestDTO;
//   // }): Promise<void> {
//   //   await this.notificationWriteService.sendPasswordResetRequest(data.payload);
//   // }

//   // /**
//   //  * Sends internal security alert to Omnixys team.
//   //  */
//   // private async handleSecurityAlert(data: {
//   //   payload: SecurityPasswordResetAlertDTO;
//   // }): Promise<void> {
//   //   await this.notificationWriteService.sendSecurityPasswordResetAlert(
//   //     data.payload,
//   //   );
//   // }

//   async sendRegistrationMail(dto: MailDTO): Promise<void> {
//     const verificationUrl = this.buildVerificationUrl(dto.username);

//     // 1️⃣ Render
//     const rendered = await this.templateRenderService.renderFromKey({
//       templateKey: 'account.registration.welcome',
//       channel: Channel.EMAIL,
//       variables: {
//         firstName: dto.firstName,
//         username: dto.username,
//         verificationUrl,
//       },
//     });

//     // 2️⃣ Persist Notification
//     const notification = await this.notificationWriteService.create({
//       recipientUsername: dto.email,
//       recipientAddress: dto.email,
//       channel: Channel.EMAIL,
//       templateId: rendered.templateId,
//       variables: {
//         firstName: dto.firstName,
//         username: dto.username,
//         verificationUrl,
//       },
//       createdBy: 'notification-service',
//     });

//     // 3️⃣ Send Mail
//     void this.mailService.send({
//       to: dto.email,
//       subject: rendered.renderedTitle ?? 'Willkommen bei Omnixys',
//       html: rendered.renderedBody,
//       format: 'HTML',
//       metadata: {
//         notificationId: notification.id,
//       },
//     });

//     // 4️⃣ Update Status
//     void this.notificationWriteService.markAsSent(notification.id);
//   }

//   private buildVerificationUrl(username: string): string {
//     const base = process.env.FRONTEND_URL ?? 'https://app.omnixys.com';
//     return `${base}/verify?u=${encodeURIComponent(username)}`;
//   }
// }
