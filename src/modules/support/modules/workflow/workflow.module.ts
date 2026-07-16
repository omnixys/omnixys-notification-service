import { SupportCommonModule } from '../../common/support-common.module.js';
import { WorkflowResolver } from './workflow.resolver.js';
import { WorkflowService } from './workflow.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [SupportCommonModule],
  providers: [WorkflowService, WorkflowResolver],
  exports: [WorkflowService],
})
export class WorkflowModule {}
