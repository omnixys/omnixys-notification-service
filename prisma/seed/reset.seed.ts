import { Channel, ContentFormat, PrismaClient } from "../../src/prisma/generated/client"
import { ensureTemplate, ensureVersion } from "./helpers"

export async function seedResetPasswordTemplates(
  prisma: PrismaClient,
  tenantId: string,
) {

  const passwordResetTemplate = await ensureTemplate(
      prisma,
      tenantId,
    "auth.password-reset.request",
    Channel.EMAIL,
      ['auth', 'security', 'password', 'reset'],
    );
  
  await ensureVersion(
      prisma,
      passwordResetTemplate.id,
      'de-DE',
      1,
      'Passwort zurücksetzen – Sicherheitsbenachrichtigung',
      `
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
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;padding:40px;">
<tr>
<td>

<h2 style="margin-top:0;color:#111;">Passwort zurücksetzen</h2>

<p>Hallo {{username}},</p>

<p>wir haben eine Anfrage erhalten, um das Passwort für dein Omnixys-Konto zurückzusetzen.</p>

<p>
Um ein neues Passwort zu erstellen, klicke bitte auf den folgenden Button:
</p>

<p style="text-align:center;margin:32px 0;">
<a href="{{actionUrl}}"
style="background:#111;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;display:inline-block;">
Passwort jetzt zurücksetzen
</a>
</p>

<p>Dieser Link ist <strong>{{expiresInMinutes}} Minuten</strong> gültig und kann nur einmal verwendet werden.</p>

<hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />

<p style="font-size:13px;color:#666;">
Anfragedetails:
</p>
<ul style="font-size:13px;color:#666;">
<li>Zeitpunkt der Anfrage: {{requestTime}}</li>
<li>IP-Adresse: {{ip}}</li>
<li>Gerät: {{device}}</li>
<li>Standort: {{location}}</li>
</ul>

<p style="font-size:13px;color:#666;">
Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.
Dein Passwort bleibt unverändert.
</p>


<p style="font-size:13px;color:#666;">
Bei Fragen kontaktiere uns unter
Support: <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>
</p>

<p style="margin-top:40px;font-size:12px;color:#aaa;">
© 2026 Omnixys Technologies
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
      ContentFormat.HTML,
      {
    username: 'string',
    actionUrl: 'string',
    expiresInMinutes: 'number',
    requestTime: 'string',
    ip: 'string',
    device: 'string',
    location: 'string',
    supportEmail: 'string',
  },
  );
  
    await ensureVersion(
      prisma,
      passwordResetTemplate.id,
      'en-US',
      1,
      'Reset your password – Security Notice',
      `
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
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;padding:40px;">
<tr>
<td>

<h2 style="margin-top:0;color:#111;">Reset your password</h2>

<p>Hello {{username}},</p>

<p>We received a request to reset the password for your Omnixys account.</p>

<p style="text-align:center;margin:32px 0;">
<a href="{{actionUrl}}"
style="background:#111;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;display:inline-block;">
Reset Password
</a>
</p>

<p>This link expires in <strong>{{expiresInMinutes}} minutes</strong> and can only be used once.</p>

<hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />

<p style="font-size:13px;color:#666;">
Request Details:
</p>
<ul style="font-size:13px;color:#666;">
<li>Request time: {{requestTime}}</li>
<li>IP Address: {{ip}}</li>
<li>Device: {{device}}</li>
<li>Location: {{location}}</li>
</ul>

<p style="font-size:13px;color:#666;">
If you did not request this, you can safely ignore this email.
Your password will remain unchanged.
</p>

<hr/>


<p style="font-size:13px;color:#666;">
If you need assistance, contact us at
<a href="mailto:{{supportEmail}}">{{supportEmail}}</a>.
</p>

<p style="margin-top:40px;font-size:12px;color:#aaa;">
© 2026 Omnixys Technologies
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
      ContentFormat.HTML,
      {
    username: 'string',
    actionUrl: 'string',
    expiresInMinutes: 'number',
    requestTime: 'string',
    ip: 'string',
    device: 'string',
    location: 'string',
    supportEmail: 'string',
  },
    );
  
  console.log('✅ Password reset templates seeded (de-DE & en-US)');
}