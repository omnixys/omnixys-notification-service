import { Channel, ContentFormat, PrismaClient } from '../src/prisma/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function ensureTemplate(tenantId: string, key: string, channel: Channel) {
  return prisma.template.upsert({
    where: {
      tenantId_key_channel: {
        tenantId,
        key,
        channel,
      },
    },
    update: {},
    create: {
      tenantId,
      key,
      channel,
      tags: [],
    },
  });
}

async function ensureVersion(
  templateId: string,
  locale: string,
  version: number,
  subject: string | null,
  body: string,
  format: ContentFormat,
  variables: any,
) {
  return prisma.templateVersion.upsert({
    where: {
      templateId_locale_version: {
        templateId,
        locale,
        version,
      },
    },
    update: {
      isActive: true,
    },
    create: {
      templateId,
      locale,
      version,
      subject,
      body,
      format,
      variables,
      isActive: true,
    },
  });
}

async function main(): Promise<void> {
  console.log('🚀 Starte Notification-Seed (neues Schema)...');

  // ─────────────────────────────────────────────
  // Tenant
  // ─────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { id: 'omnixys' },
    update: {},
    create: {
      id: 'omnixys',
      name: 'Omnixys Tenant',
    },
  });

  // =========================================================
  // ACCOUNT CREDENTIALS CREATED (IN_APP)
  // =========================================================
  const accountTemplate = await ensureTemplate(
    tenant.id,
    'account.credentials.created',
    Channel.IN_APP,
  );

  await ensureVersion(
    accountTemplate.id,
    'de-DE',
    1,
    null,
    `
Willkommen, {{firstName}}

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
  );

  // =========================================================
  // INVITATION – EMAIL
  // =========================================================
  const inviteEmailTemplate = await ensureTemplate(
    tenant.id,
    'invitation.event.invite',
    Channel.EMAIL,
  );

  await ensureVersion(
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
  );

  // =========================================================
  // INVITATION – WHATSAPP
  // =========================================================
  const inviteWhatsappTemplate = await ensureTemplate(
    tenant.id,
    'invitation.event.invite',
    Channel.WHATSAPP,
  );

  await ensureVersion(
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
  );

  // =========================================================
  // PASSWORD RESET – EMAIL
  // =========================================================
  const passwordResetTemplate = await ensureTemplate(
    tenant.id,
    'account.password.reset.requested',
    Channel.EMAIL,
  );

  await ensureVersion(
    passwordResetTemplate.id,
    'de-DE',
    1,
    'Passwort zurücksetzen bestätigen',
    `
Hallo {{firstName}},

du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.

🕒 Zeitpunkt: {{requestedAt}}

👉 Hier Passwort zurücksetzen:
{{resetUrl}}

Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.
    `,
    ContentFormat.TEXT,
    {
      firstName: 'string',
      requestedAt: 'string',
      resetUrl: { type: 'string', sensitive: true },
    },
  );

  console.log('🌱 Seeding sign-up-verification template...');

  // ─────────────────────────────────────────────
  // Create template (EMAIL)
  // ─────────────────────────────────────────────
  const template = await prisma.template.upsert({
    where: {
      tenantId_key_channel: {
        tenantId: tenant.id,
        key: 'sign-up-verification',
        channel: Channel.EMAIL,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      key: 'sign-up-verification',
      channel: Channel.EMAIL,
      tags: ['signup', 'verification', 'auth'],
    },
  });

  // ─────────────────────────────────────────────
  // German Version
  // ─────────────────────────────────────────────
  await prisma.templateVersion.upsert({
    where: {
      templateId_locale_version: {
        templateId: template.id,
        locale: 'de-DE',
        version: 1,
      },
    },
    update: {
      isActive: true,
    },
    create: {
      templateId: template.id,
      locale: 'de-DE',
      version: 1,
      subject: 'Bitte bestätige dein Omnixys Konto',
      body: `
<p>Hallo {{firstName}} {{lastName}},</p>

<p>vielen Dank für deine Registrierung bei <strong>Omnixys</strong>.</p>

<p>Bitte bestätige dein Konto, indem du auf folgenden Link klickst:</p>

<p>
  <a href="{{verifyUrl}}" target="_blank">
    Konto jetzt bestätigen
  </a>
</p>

<p>Dieser Link ist {{expiresInMinutes}} Minuten gültig.</p>

<p>Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.</p>

<p>Viele Grüße<br/>Dein Omnixys Team</p>
      `,
      format: ContentFormat.HTML,
      variables: {
        firstName: 'string',
        lastName: 'string',
        username: 'string',
        verifyUrl: 'string',
        expiresInMinutes: 'number',
      },
      isActive: true,
    },
  });

  // ─────────────────────────────────────────────
  // English Version
  // ─────────────────────────────────────────────
  await prisma.templateVersion.upsert({
    where: {
      templateId_locale_version: {
        templateId: template.id,
        locale: 'en-US',
        version: 1,
      },
    },
    update: {
      isActive: true,
    },
    create: {
      templateId: template.id,
      locale: 'en-US',
      version: 1,
      subject: 'Please verify your Omnixys account',
      body: `
<p>Hello {{firstName}} {{lastName}},</p>

<p>Thank you for registering at <strong>Omnixys</strong>.</p>

<p>Please verify your account by clicking the link below:</p>

<p>
  <a href="{{verifyUrl}}" target="_blank">
    Verify account now
  </a>
</p>

<p>This link expires in {{expiresInMinutes}} minutes.</p>

<p>If you did not create this account, you may safely ignore this email.</p>

<p>Best regards,<br/>The Omnixys Team</p>
      `,
      format: ContentFormat.HTML,
      variables: {
        firstName: 'string',
        lastName: 'string',
        username: 'string',
        verifyUrl: 'string',
        expiresInMinutes: 'number',
      },
      isActive: true,
    },
  });

  console.log('✅ sign-up-verification template seeded successfully');

  // ─────────────────────────────────────────────
  // TEMPLATE: AUTH_PASSWORD_RESET (EMAIL)
  // ─────────────────────────────────────────────

  const template_reset = await prisma.template.upsert({
    where: {
      tenantId_key_channel: {
        tenantId: tenant.id,
        key: 'AUTH_PASSWORD_RESET',
        channel: Channel.EMAIL,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      key: 'AUTH_PASSWORD_RESET',
      channel: Channel.EMAIL,
      tags: ['auth', 'security', 'password', 'reset'],
    },
  });

  // Common Variables Definition
  const variables = {
    firstName: 'string',
    resetUrl: 'string (absolute URL)',
    expiresInMinutes: 'number',
    ipAddress: 'string',
    device: 'string',
    location: 'string',
    supportEmail: 'string',
    year: 'number',
  };

  // ─────────────────────────────────────────────
  // VERSION 1 – GERMAN
  // ─────────────────────────────────────────────

  await prisma.templateVersion.upsert({
    where: {
      templateId_locale_version: {
        templateId: template_reset.id,
        locale: 'de-DE',
        version: 1,
      },
    },
    update: {},
    create: {
      templateId: template_reset.id,
      locale: 'de-DE',
      version: 1,
      format: ContentFormat.HTML,
      subject: 'Passwort zurücksetzen – Sicherheitsbenachrichtigung',
      variables,
      body: `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<title>Passwort zurücksetzen</title>
</head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:40px;">
<tr>
<td>

<h2 style="margin-top:0;color:#111;">Passwort zurücksetzen</h2>

<p>Hallo {{firstName}},</p>

<p>wir haben eine Anfrage erhalten, dein Passwort zurückzusetzen.</p>

<p style="text-align:center;margin:32px 0;">
<a href="{{resetUrl}}"
style="background:#111;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">
Passwort jetzt zurücksetzen
</a>
</p>

<p>Dieser Link ist <strong>{{expiresInMinutes}} Minuten</strong> gültig.</p>

<hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />

<p style="font-size:13px;color:#666;">
Anfragedetails:
</p>
<ul style="font-size:13px;color:#666;">
<li>IP-Adresse: {{ipAddress}}</li>
<li>Gerät: {{device}}</li>
<li>Standort: {{location}}</li>
</ul>

<p style="font-size:13px;color:#666;">
Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.
Dein Passwort bleibt unverändert.
</p>

<p style="font-size:13px;color:#666;">
Support: <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>
</p>

<p style="margin-top:40px;font-size:12px;color:#aaa;">
© {{year}} Omnixys Technologies
</p>

</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
      `,
    },
  });

  // ─────────────────────────────────────────────
  // VERSION 1 – ENGLISH
  // ─────────────────────────────────────────────

  await prisma.templateVersion.upsert({
    where: {
      templateId_locale_version: {
        templateId: template_reset.id,
        locale: 'en-US',
        version: 1,
      },
    },
    update: {},
    create: {
      templateId: template_reset.id,
      locale: 'en-US',
      version: 1,
      format: ContentFormat.HTML,
      subject: 'Reset your password – Security Notice',
      variables,
      body: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Password Reset</title>
</head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:40px;">
<tr>
<td>

<h2 style="margin-top:0;color:#111;">Reset your password</h2>

<p>Hello {{firstName}},</p>

<p>We received a request to reset your password.</p>

<p style="text-align:center;margin:32px 0;">
<a href="{{resetUrl}}"
style="background:#111;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">
Reset Password
</a>
</p>

<p>This link expires in <strong>{{expiresInMinutes}} minutes</strong>.</p>

<hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />

<p style="font-size:13px;color:#666;">
Request Details:
</p>
<ul style="font-size:13px;color:#666;">
<li>IP Address: {{ipAddress}}</li>
<li>Device: {{device}}</li>
<li>Location: {{location}}</li>
</ul>

<p style="font-size:13px;color:#666;">
If you did not request this, you can safely ignore this email.
</p>

<p style="font-size:13px;color:#666;">
Support: <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>
</p>

<p style="margin-top:40px;font-size:12px;color:#aaa;">
© {{year}} Omnixys Technologies
</p>

</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
      `,
    },
  });

  console.log('✅ Password reset templates seeded (de-DE & en-US)');
  console.log('✅ Templates erfolgreich im neuen Schema geseedet');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });