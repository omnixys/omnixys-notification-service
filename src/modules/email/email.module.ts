import { EmailSupportService } from './email-support.service.js';
import { EmailHandler } from './email.handler.js';
import { Module } from '@nestjs/common';

@Module({
  providers: [EmailSupportService, EmailHandler],
  exports: [EmailSupportService],
})
export class EmailModule {}
