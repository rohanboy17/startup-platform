import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function getCmsValue<T>(key: string, fallback: T): Promise<T> {
  const item = await prisma.cmsContent.findUnique({ where: { key } });
  if (!item) return fallback;
  try {
    return item.value as T;
  } catch {
    return fallback;
  }
}

export async function upsertCmsValue(key: string, value: unknown) {
  const normalized =
    value === null
      ? (Prisma.JsonNull as unknown as Prisma.InputJsonValue)
      : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);

  return prisma.cmsContent.upsert({
    where: { key },
    update: { value: normalized },
    create: { key, value: normalized },
  });
}

export async function getFeatureFlag(key: string, fallback = true) {
  const row = await prisma.featureFlag.findUnique({ where: { key } });
  return row ? row.enabled : fallback;
}
