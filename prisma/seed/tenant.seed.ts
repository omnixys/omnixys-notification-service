import { PrismaClient } from '../../src/prisma/generated/client.js'

export async function seedTenant(prisma: PrismaClient) {
  return prisma.tenant.upsert({
    where: { id: 'omnixys' },
    update: {},
    create: {
      id: 'omnixys',
      name: 'Omnixys Tenant',
    },
  })
}