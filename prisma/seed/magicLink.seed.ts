import { Channel, ContentFormat, PrismaClient } from "../../src/prisma/generated/client"
import { ensureTemplate, ensureVersion } from "./helpers"

export async function seedMagicLinkTemplates(
  prisma: PrismaClient,
  tenantId: string,
) {

  const magicLinkTemplate = await ensureTemplate(
      prisma,
      tenantId,
 "auth.magic-link.request",
    Channel.EMAIL,
      ['auth', 'security', 'magic-link'],
    );
  
  await ensureVersion(
      prisma,
      magicLinkTemplate.id,
      'de-DE',
      1,
      'Dein Omnixys Login-Link',
      `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<title>Dein Omnixys Login-Link</title>
</head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;padding:40px;">
<tr>
<td>

<h2 style="margin-top:0;color:#111;">Sicherer Login-Link</h2>

<p>Hallo {{userName}},</p>

<p>du hast einen sicheren Login-Link für dein Omnixys-Konto angefordert.</p>

<p>
Klicke auf den folgenden Button, um dich direkt anzumelden:
</p>

<p style="text-align:center;margin:32px 0;">
<a href="{{actionUrl}}"
style="background:#111;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;display:inline-block;"
rel="noopener noreferrer">
Bei Omnixys anmelden
</a>
</p>

<p>Dieser Link ist <strong>{{expiresInMinutes}} Minuten</strong> gültig and can only be used once.</p>

<hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />

<p style="font-size:13px;color:#666;">
Anfragedetails:
</p>
<ul style="font-size:13px;color:#666;">
<li>Zeitpunkt der Anfrage: {{requestTime}}</li>
<li>IP-Adresse: {{ipAddress}}</li>
<li>Gerät: {{device}}</li>
<li>Standort: {{location}}</li>
</ul>

<p style="font-size:13px;color:#666;">
Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.
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
  userName: "string",
  actionUrl: "string",
  ipAddress: "string",
        requestTime: "string",
    device: "string",
  location: "string",
  expiresInMinutes: "number",
        supportEmail: "string",
},
  );
  
    await ensureVersion(
      prisma,
      magicLinkTemplate.id,
      'en-US',
      1,
      'Your Omnixys sign-in link',
      `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Your Omnixys sign-in link</title>
</head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;padding:40px;">
<tr>
<td>

<h2 style="margin-top:0;color:#111;">Secure sign-in link</h2>

<p>Hello {{userName}},</p>

<p>You requested a secure sign-in link for your Omnixys account.</p>

<p>
Click the button below to sign in instantly:
</p>

<p style="text-align:center;margin:32px 0;">
<a href="{{actionUrl}}"
style="background:#111;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;display:inline-block;"
rel="noopener noreferrer">
Sign in to Omnixys
</a>
</p>

<p>This link expires in <strong>{{expiresInMinutes}} minutes</strong> und kann nur einmal verwendet werden.</p>

<hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />

<p style="font-size:13px;color:#666;">
Request Details:
</p>
<ul style="font-size:13px;color:#666;">
<li>Request time: {{requestTime}}</li>
<li>IP Address: {{ipAddress}}</li>
<li>Device: {{device}}</li>
<li>Location: {{location}}</li>
</ul>

<p style="font-size:13px;color:#666;">
If you did not request this, you can safely ignore this email.
</p>

<hr/>

<p style="font-size:13px;color:#666;">
Need help? Contact us at
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
  userName: "string",
  actionUrl: "string",
  ipAddress: "string",
        requestTime: "string",
    device: "string",
  location: "string",
  expiresInMinutes: "number",
        supportEmail: "string",
},
    );
  
  console.log("✅ Magic link templates seeded (de-DE & en-US)");
}