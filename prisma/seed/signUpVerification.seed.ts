import { Channel, ContentFormat, PrismaClient } from "../../src/prisma/generated/client";
import { ensureTemplate, ensureVersion } from "./helpers";

export async function seedSignUpVerificationTemplates(
  prisma: PrismaClient,
  tenantId: string,
) {

  const template = await ensureTemplate(
    prisma,
    tenantId,
    "auth.sign-up-verification.request",
    Channel.EMAIL,
    ["auth", "signup", "verification"],
  );

  await ensureVersion(
    prisma,
    template.id,
    "de-DE",
    1,
    "Bitte bestätige deine Omnixys Registrierung",
    `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<title>E-Mail-Adresse bestätigen</title>
</head>

<body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
style="max-width:600px;background:#ffffff;border-radius:12px;padding:40px;">

<tr>
<td>

<h2 style="margin-top:0;color:#111;">E-Mail-Adresse bestätigen</h2>

<p>Hallo {{firstName}} {{lastName}},</p>

<p>vielen Dank für deine Registrierung bei <strong>Omnixys</strong>.</p>

<p>Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.</p>

<p style="text-align:center;margin:32px 0;">
<a href="{{actionUrl}}"
target="_blank"
rel="noopener noreferrer"
style="background:#111;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;display:inline-block;">
E-Mail-Adresse bestätigen
</a>
</p>

<p>Dieser Bestätigungslink ist <strong>{{expiresInMinutes}} Minuten</strong> gültig.</p>

<p style="font-size:13px;color:#666;">
Dieser Link kann nur einmal verwendet werden.
</p>

<hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />

<p style="font-size:13px;color:#666;">
Falls du dich nicht selbst registriert hast, kannst du diese E-Mail ignorieren.
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
      firstName: "string",
      lastName: "string",
      actionUrl: "string",
      expiresInMinutes: "number",
    },
  );

  await ensureVersion(
    prisma,
    template.id,
    "en-US",
    1,
    "Please verify your Omnixys account",
    `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Email Verification</title>
</head>

<body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
style="max-width:600px;background:#ffffff;border-radius:12px;padding:40px;">

<tr>
<td>

<h2 style="margin-top:0;color:#111;">Verify your email address</h2>

<p>Hello {{firstName}} {{lastName}},</p>

<p>Thank you for registering at <strong>Omnixys</strong>.</p>

<p>Please confirm your email address to activate your account.</p>

<p style="text-align:center;margin:32px 0;">
<a href="{{actionUrl}}"
target="_blank"
rel="noopener noreferrer"
style="background:#111;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;display:inline-block;">
Verify Email Address
</a>
</p>

<p>This verification link expires in <strong>{{expiresInMinutes}} minutes</strong>.</p>

<p style="font-size:13px;color:#666;">
This link can only be used once.
</p>

<hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />

<p style="font-size:13px;color:#666;">
If you did not create this account, you can safely ignore this email.
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
      firstName: "string",
      lastName: "string",
      actionUrl: "string",
      expiresInMinutes: "number",
    },
  );

  console.log("✅ Email verification templates seeded (de-DE & en-US)");
}