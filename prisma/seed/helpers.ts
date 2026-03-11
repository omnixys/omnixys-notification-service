import { Channel, ContentFormat, PrismaClient } from '../../src/prisma/generated/client.js'

export async function ensureTemplate(
  prisma: PrismaClient,
  tenantId: string,
  key: string,
  channel: Channel,
  tags: string[] = [],
) {
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
      tags,
    },
  })
}

export async function ensureVersion(
  prisma: PrismaClient,
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
  })
}