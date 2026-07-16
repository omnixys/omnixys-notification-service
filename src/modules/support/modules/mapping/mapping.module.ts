import { MappingService } from './mapping.service.js';
import { Module } from '@nestjs/common';

@Module({
  providers: [MappingService],
  exports: [MappingService],
})
export class MappingModule {}
