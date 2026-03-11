import { Channel, ContentFormat, PrismaClient } from '../src/prisma/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

import 'dotenv/config';
import { seedTenant } from './seed/tenant.seed.js';
import { seedInviteTemplates } from './seed/invite.seed.js';
import { seedAccountTemplates } from './seed/account.seed.js';
import { seedMagicLinkTemplates } from './seed/magicLink.seed.js';
import { seedResetPasswordTemplates } from './seed/reset.seed.js';
import { seedSignUpVerificationTemplates } from './seed/signUpVerification.seed.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log('🚀 Starte Notification-Seed (neues Schema)...');

   const tenant = await seedTenant(prisma)

  await seedInviteTemplates(prisma, tenant.id);
  await seedAccountTemplates(prisma, tenant.id);
  await seedMagicLinkTemplates(prisma, tenant.id);
  await seedSignUpVerificationTemplates(prisma, tenant.id);
  await seedResetPasswordTemplates(prisma, tenant.id);

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