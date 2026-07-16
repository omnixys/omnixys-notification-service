import { OutboxPublisherService } from './outbox-publisher.service.js';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [OutboxPublisherService],
  exports: [OutboxPublisherService],
})
export class OutboxModule {}
