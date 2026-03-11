import { PrismaClient, Channel, ContentFormat } from '../../src/prisma/generated/client.js'
import { ensureTemplate, ensureVersion } from './helpers.js'

export async function seedAccountTemplates(
  prisma: PrismaClient,
  tenantId: string,
) {
  const template = await ensureTemplate(
    prisma,
    tenantId,
    'account.credentials.created',
    Channel.IN_APP,
  )

  await ensureVersion(
    prisma,
    template.id,
    'de-DE',
    1,
    null,
    `
Willkommen {{firstName}}

Dein Benutzername: {{username}}
Dein Passwort: {{password}}

Bitte ändere dein Passwort nach dem Login.
`,
    ContentFormat.TEXT,
    {
      firstName: 'string',
      username: 'string',
      password: { type: 'string', sensitive: true },
    },
  )
}