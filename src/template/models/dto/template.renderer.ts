/* eslint-disable @typescript-eslint/no-explicit-any */

// src/notification/template/template.renderer.ts

import type { Template } from '../../../prisma/generated/client.js';
import type { RenderResult } from './template.types.js';
import { validateVariables } from './template.validator.js';
import Handlebars from 'handlebars';

export function renderTemplate(
  template: Template,
  variables: Record<string, unknown>,
): RenderResult {
  const variableDefinitions = template.variables as Record<string, any>;

  // 1. Validate variables
  validateVariables(variableDefinitions, variables);

  // 2. Compile templates
  const bodyCompiler = Handlebars.compile(template.body, {
    noEscape: true,
  });

  const titleCompiler = template.title
    ? Handlebars.compile(template.title, { noEscape: true })
    : null;

  // 3. Render content
  const renderedBody = bodyCompiler(variables);
  const renderedTitle = titleCompiler ? titleCompiler(variables) : undefined;

  return {
    renderedBody,
    renderedTitle,
  };
}
