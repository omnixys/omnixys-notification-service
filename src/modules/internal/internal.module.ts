import { SupportCommonModule } from '../support/common/support-common.module.js';
import { InternalResolver } from './internal.resolver.js';
import { InternalService } from './internal.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [SupportCommonModule],
  providers: [InternalService, InternalResolver],
  exports: [InternalService],
})
export class InternalModule {}
