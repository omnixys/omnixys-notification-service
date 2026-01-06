import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { LoggerPlus } from '../../logger/logger-plus.js';
import { LoggerPlusService } from '../../logger/logger-plus.service.js';

import { CreateTemplateInput } from '../models/inputs/create-template.input.js';
import { UpdateTemplateInput } from '../models/inputs/update-template.input.js';
import { TemplateMapper } from '../models/mappers/template.mapper.js';
import { TemplatePayload } from '../models/payloads/template.payload.js';
import { TemplateWriteService } from '../services/template-write.service.js';

// Optional – adapt to your auth setup
// import { RolesGuard } from '../../auth/guards/roles.guard';
// import { Roles } from '../../auth/decorators/roles.decorator';

@Resolver()
export class TemplateMutationResolver {
  private readonly logger: LoggerPlus;

  constructor(
    loggerService: LoggerPlusService,
    private readonly templateWriteService: TemplateWriteService,
  ) {
    this.logger = loggerService.getLogger(TemplateMutationResolver.name);
  }

  /**
   * ADMIN / SERVICE mutation.
   */
  // @UseGuards(RolesGuard)
  // @Roles('ADMIN')
  @Mutation(() => TemplatePayload)
  async createTemplate(
    @Args('input') input: CreateTemplateInput,
  ): Promise<TemplatePayload> {
    this.logger.info('createTemplate: key=%s', input.key);

    const template = await this.templateWriteService.create(input);
    return TemplateMapper.toPayload(template);
  }

  /**
   * ADMIN / SERVICE mutation.
   */
  // @UseGuards(RolesGuard)
  // @Roles('ADMIN')
  @Mutation(() => TemplatePayload)
  async updateTemplate(
    @Args('input') input: UpdateTemplateInput,
  ): Promise<TemplatePayload> {
    this.logger.info(
      'updateTemplate: id=%s bumpVersion=%s',
      input.id,
      input.bumpVersion,
    );

    const template = await this.templateWriteService.update(input);
    return TemplateMapper.toPayload(template);
  }
}
