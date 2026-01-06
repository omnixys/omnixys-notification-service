import { JsonScalar } from './json.scalar.js';
import { Module } from '@nestjs/common';

@Module({
  providers: [JsonScalar],
  exports: [JsonScalar],
})
export class ScalarsModule {}
