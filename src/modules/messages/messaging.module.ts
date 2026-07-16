import { DispatchService } from './services/dispatch.service.js';
import { GatewayClientService } from './services/gateway-client.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  providers: [GatewayClientService, DispatchService],
  exports: [DispatchService],
})
export class MessagingModule {}
