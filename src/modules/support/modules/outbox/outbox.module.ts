import { AnalyticsOutboxService } from './analytics-outbox.service.js';
import { OutboxPublisherService } from './outbox-publisher.service.js';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [AnalyticsOutboxService, OutboxPublisherService],
  exports: [AnalyticsOutboxService, OutboxPublisherService],
})
export class OutboxModule {}
