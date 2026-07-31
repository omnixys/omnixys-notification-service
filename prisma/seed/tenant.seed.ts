import { PrismaClient } from '../../src/prisma/generated/client.js';
import { OMNIXYS_TENANT_ID } from '@omnixys/contracts-ts';

export async function seedTenant(prisma: PrismaClient) {
  return prisma.tenant.upsert({
    where: { id: OMNIXYS_TENANT_ID },
    update: {},
    create: {
      id: OMNIXYS_TENANT_ID,
      name: 'Omnixys Tenant',
    },
  });
}
