/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/notification/template/template.mask.ts

import { TemplateVariableMap } from './template.types.js';

export function maskSensitiveVariables(
  definitions: TemplateVariableMap,
  variables: Record<string, unknown>,
): Record<string, unknown> {
  const masked: Record<string, unknown> = { ...variables };

  for (const [key, def] of Object.entries(definitions)) {
    if (def.sensitive && key in masked) {
      masked[key] = '********';
    }
  }

  return masked;
}
