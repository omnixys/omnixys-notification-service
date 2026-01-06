/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/notification/template/template.validator.ts

import { TemplateValidationError } from './template.errors.js';
import type { TemplateVariableMap } from './template.types.js';

export function validateVariables(
  definitions: TemplateVariableMap,
  variables: Record<string, unknown>,
): void {
  for (const [key, def] of Object.entries(definitions)) {
    const value = variables[key];

    if (def.required && (value === undefined || value === null)) {
      throw new TemplateValidationError(
        `Missing required template variable: ${key}`,
      );
    }

    if (value == null) {
      continue;
    }

    if (def.type) {
      switch (def.type) {
        case 'string':
          if (typeof value !== 'string') {
            throw new TemplateValidationError(`Variable ${key} must be string`);
          }
          break;
        case 'number':
          if (typeof value !== 'number') {
            throw new TemplateValidationError(`Variable ${key} must be number`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            throw new TemplateValidationError(
              `Variable ${key} must be boolean`,
            );
          }
          break;
        case 'email':
          if (
            typeof value !== 'string' ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ) {
            throw new TemplateValidationError(`Variable ${key} must be email`);
          }
          break;
        case 'url':
          try {
            new URL(String(value));
          } catch {
            throw new TemplateValidationError(`Variable ${key} must be URL`);
          }
          break;
      }
    }
  }
}
