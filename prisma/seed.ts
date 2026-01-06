import { PrismaClient } from '../src/prisma/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log('🚀 Starte Notification-Seed...');

  const template = await prisma.template.upsert({
    where: {
      key_channel_locale_version: {
        key: 'account.credentials.created',
        channel: 'IN_APP',
        locale: 'de-DE',
        version: 1,
      },
    },
    update: {},
    create: {
      key: 'account.credentials.created',
      title: 'Willkommen, {{firstName}}',
      body:
        'Dein Benutzername: {{username}}\n' +
        'Dein Passwort: {{password}}\n' +
        'Bitte ändere dein Passwort nach dem Login.',

      // ✅ CORRECT: VariableSchema, Prisma-safe JSON
      variables: {
        firstName: { required: true, type: 'string' },
        username: { required: true, type: 'string' },
        password: { required: true, type: 'string', sensitive: true },
      },

      channel: 'IN_APP',
      category: 'ACCOUNT',
      isActive: true,
      version: 1,
      tags: ['credentials', 'onboarding'],
    },
  });

  console.log('✅ Notification-Seed abgeschlossen. ID=%s', template.id);

  /* ---------------------------------------------------------
   * INVITATION – EMAIL (Standard)
   * ------------------------------------------------------- */
  await prisma.template.upsert({
    where: {
      key_channel_locale_version: {
        key: 'invitation.event.invite',
        channel: 'EMAIL',
        locale: 'de-DE',
        version: 1,
      },
    },
    update: {},
    create: {
      key: 'invitation.event.invite',
      title: 'Einladung: {{eventName}}',
      body:
        'Hallo {{firstName}},\n\n' +
        'du bist herzlich eingeladen zu:\n\n' +
        '📅 {{eventName}}\n' +
        '🕒 {{eventDate}}\n' +
        '📍 {{eventLocation}}\n\n' +
        'Bitte bestätige deine Teilnahme hier:\n' +
        '{{rsvpUrl}}\n\n' +
        'Wir freuen uns auf dich!\n\n' +
        '— {{hostName}}',

      variables: {
        firstName: { required: true, type: 'string' },
        eventName: { required: true, type: 'string' },
        eventDate: { required: true, type: 'string' },
        eventLocation: { required: true, type: 'string' },
        rsvpUrl: { required: true, type: 'url' },
        hostName: { required: true, type: 'string' },
      },

      channel: 'EMAIL',
      category: 'INVITATION',
      isActive: true,
      version: 1,
      tags: ['invitation', 'email', 'rsvp'],
    },
  });

  /* ---------------------------------------------------------
   * INVITATION – WHATSAPP (Kurzform)
   * ------------------------------------------------------- */
  await prisma.template.upsert({
    where: {
      key_channel_locale_version: {
        key: 'invitation.event.invite',
        channel: 'WHATSAPP',
        locale: 'de-DE',
        version: 1,
      },
    },
    update: {},
    create: {
      key: 'invitation.event.invite',
      body:
        'Hallo {{firstName}} 👋\n' +
        'Du bist eingeladen zu *{{eventName}}* 🎉\n\n' +
        '📅 {{eventDate}}\n' +
        '📍 {{eventLocation}}\n\n' +
        '👉 Teilnahme bestätigen:\n{{rsvpUrl}}',

      variables: {
        firstName: { required: true, type: 'string' },
        eventName: { required: true, type: 'string' },
        eventDate: { required: true, type: 'string' },
        eventLocation: { required: true, type: 'string' },
        rsvpUrl: { required: true, type: 'url' },
      },

      channel: 'WHATSAPP',
      category: 'INVITATION',
      isActive: true,
      version: 1,
      tags: ['invitation', 'whatsapp', 'rsvp'],
    },
  });

  /* ---------------------------------------------------------
   * RSVP CONFIRMATION – EMAIL
   * ------------------------------------------------------- */
  await prisma.template.upsert({
    where: {
      key_channel_locale_version: {
        key: 'invitation.rsvp.confirmed',
        channel: 'EMAIL',
        locale: 'de-DE',
        version: 1,
      },
    },
    update: {},
    create: {
      key: 'invitation.rsvp.confirmed',
      title: 'Teilnahme bestätigt – {{eventName}}',
      body:
        'Hallo {{firstName}},\n\n' +
        'vielen Dank für deine Rückmeldung.\n' +
        'Deine Teilnahme an *{{eventName}}* ist bestätigt.\n\n' +
        '🎟 Dein Ticket:\n{{ticketUrl}}\n\n' +
        'Bis bald!\n— {{hostName}}',

      variables: {
        firstName: { required: true, type: 'string' },
        eventName: { required: true, type: 'string' },
        ticketUrl: { required: true, type: 'url', sensitive: true },
        hostName: { required: true, type: 'string' },
      },

      channel: 'EMAIL',
      category: 'INVITATION',
      isActive: true,
      version: 1,
      tags: ['rsvp', 'confirmation', 'ticket'],
    },
  });

  /* ---------------------------------------------------------
   * EVENT REMINDER – WHATSAPP
   * ------------------------------------------------------- */
  await prisma.template.upsert({
    where: {
      key_channel_locale_version: {
        key: 'invitation.event.reminder',
        channel: 'WHATSAPP',
        locale: 'de-DE',
        version: 1,
      },
    },
    update: {},
    create: {
      key: 'invitation.event.reminder',
      body:
        '⏰ Erinnerung\n\n' +
        '*{{eventName}}* startet bald!\n' +
        '📅 {{eventDate}}\n' +
        '📍 {{eventLocation}}\n\n' +
        '🎟 Dein Ticket:\n{{ticketUrl}}',

      variables: {
        eventName: { required: true, type: 'string' },
        eventDate: { required: true, type: 'string' },
        eventLocation: { required: true, type: 'string' },
        ticketUrl: { required: true, type: 'url', sensitive: true },
      },

      channel: 'WHATSAPP',
      category: 'REMINDER',
      isActive: true,
      version: 1,
      tags: ['reminder', 'whatsapp', 'event'],
    },
  });

  console.log('✅ Notification Templates erfolgreich geseedet');

  /* ---------------------------------------------------------
   * PASSWORD RESET – EMAIL (User Confirmation)
   * ------------------------------------------------------- */
  await prisma.template.upsert({
    where: {
      key_channel_locale_version: {
        key: 'account.password.reset.requested',
        channel: 'EMAIL',
        locale: 'de-DE',
        version: 1,
      },
    },
    update: {},
    create: {
      key: 'account.password.reset.requested',
      title: 'Passwort zurücksetzen bestätigen',
      body:
        'Hallo {{firstName}},\n\n' +
        'du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.\n\n' +
        '🕒 Zeitpunkt: {{requestedAt}}\n' +
        '👉 Wenn du dein Passwort jetzt ändern möchtest, klicke bitte auf den folgenden Link:\n' +
        '{{resetUrl}}\n\n' +
        'Wenn du diese Anfrage nicht selbst gestellt hast, ignoriere diese E-Mail bitte.\n' +
        'Dein Passwort bleibt dann unverändert.\n\n' +
        '— Omnixys Security Team',

      variables: {
        firstName: { required: true, type: 'string' },
        requestedAt: { required: true, type: 'string' },
        resetUrl: { required: true, type: 'url', sensitive: true },
      },

      channel: 'EMAIL',
      category: 'SECURITY',
      isActive: true,
      version: 1,
      tags: ['password-reset', 'security', 'email'],
    },
  });

  /* ---------------------------------------------------------
   * PASSWORD RESET – SECURITY ALERT (Omnixys Team)
   * ------------------------------------------------------- */
  await prisma.template.upsert({
    where: {
      key_channel_locale_version: {
        key: 'security.password.reset.requested',
        channel: 'IN_APP',
        locale: 'de-DE',
        version: 1,
      },
    },
    update: {},
    create: {
      key: 'security.password.reset.requested',
      title: 'Security Alert: Passwort-Reset angefordert',
      body:
        'Ein Passwort-Reset wurde angefordert.\n\n' +
        '👤 Benutzer: {{username}}\n' +
        '📧 E-Mail: {{email}}\n' +
        '🕒 Zeitpunkt: {{requestedAt}}\n' +
        'Bitte prüfen, falls ungewöhnliche Aktivität vorliegt.',

      variables: {
        username: { required: true, type: 'string' },
        email: { required: true, type: 'string', sensitive: true },
        requestedAt: { required: true, type: 'string' },
      },

      channel: 'IN_APP',
      category: 'SECURITY',
      isActive: true,
      version: 1,
      tags: ['security', 'alert', 'password-reset'],
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
