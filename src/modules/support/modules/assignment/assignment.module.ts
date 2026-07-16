import { SupportCommonModule } from '../../common/support-common.module.js';
import { AssignmentResolver } from './assignment.resolver.js';
import { AssignmentService } from './assignment.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [SupportCommonModule],
  providers: [AssignmentService, AssignmentResolver],
  exports: [AssignmentService],
})
export class AssignmentModule {}
