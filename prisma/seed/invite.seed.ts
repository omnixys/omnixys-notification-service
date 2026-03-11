import { PrismaClient, Channel, ContentFormat } from '../../src/prisma/generated/client.js'
import { ensureTemplate, ensureVersion } from './helpers.js'

export async function seedInviteTemplates(
  prisma: PrismaClient,
  tenantId: string,
) {
  // EMAIL
  const inviteEmailTemplate = await ensureTemplate(
    prisma,
    tenantId,
    'invitation.event.invite',
    Channel.EMAIL,
  )

  await ensureVersion(
    prisma,
    inviteEmailTemplate.id,
    'de-DE',
    1,
    'Einladung: {{eventName}}',
    `
Hallo {{firstName}},

du bist herzlich eingeladen zu:

📅 {{eventName}}
🕒 {{eventDate}}
📍 {{eventLocation}}

Bitte bestätige deine Teilnahme hier:
{{rsvpUrl}}

Wir freuen uns auf dich!
— {{hostName}}
`,
    ContentFormat.TEXT,
    {
      firstName: 'string',
      eventName: 'string',
      eventDate: 'string',
      eventLocation: 'string',
      rsvpUrl: 'string',
      hostName: 'string',
    },
  )

  // WHATSAPP
  const inviteWhatsappTemplate = await ensureTemplate(
    prisma,
    tenantId,
    'invitation.event.invite',
    Channel.WHATSAPP,
  )

  await ensureVersion(
    prisma,
    inviteWhatsappTemplate.id,
    'de-DE',
    1,
    null,
    `
Hallo {{firstName}} 👋
Du bist eingeladen zu *{{eventName}}* 🎉

📅 {{eventDate}}
📍 {{eventLocation}}

👉 Teilnahme bestätigen:
{{rsvpUrl}}
`,
    ContentFormat.TEXT,
    {
      firstName: 'string',
      eventName: 'string',
      eventDate: 'string',
      eventLocation: 'string',
      rsvpUrl: 'string',
    },
  )
}