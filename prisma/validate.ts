import { PrismaClient } from '../src/prisma/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenants = await prisma.tenant.count();
  const templates = await prisma.template.count();

  const result = {
    service: 'notification',
    checks: [
      { name: 'Tenants', ok: tenants > 0, count: tenants },
      { name: 'Templates', ok: templates > 0, count: templates },
    ],
  };

  console.log('VALIDATE_JSON:' + JSON.stringify(result));
}

main()
  .catch((e) => {
    console.error('❌ Validate failed', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
