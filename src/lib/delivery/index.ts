import { db } from '@/lib/db';
import { deliveryPlatformConfigs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';

export type DeliveryPlatform = 'uber_eats' | 'rappi' | 'whatsapp';

export async function getDeliveryConfig(organizationId: string, platform: DeliveryPlatform) {
  const [config] = await db.select().from(deliveryPlatformConfigs)
    .where(and(
      eq(deliveryPlatformConfigs.organizationId, organizationId),
      eq(deliveryPlatformConfigs.platform, platform),
      eq(deliveryPlatformConfigs.isActive, true),
    ));
  if (!config) return null;
  return {
    ...config,
    credentials: JSON.parse(decrypt(config.credentials)) as Record<string, string>,
  };
}

export async function getActiveDeliveryPlatforms(organizationId: string) {
  const configs = await db.select({
    platform: deliveryPlatformConfigs.platform,
    isActive: deliveryPlatformConfigs.isActive,
    isSandbox: deliveryPlatformConfigs.isSandbox,
    externalStoreId: deliveryPlatformConfigs.externalStoreId,
    lastSyncAt: deliveryPlatformConfigs.lastSyncAt,
  }).from(deliveryPlatformConfigs)
    .where(and(
      eq(deliveryPlatformConfigs.organizationId, organizationId),
      eq(deliveryPlatformConfigs.isActive, true),
    ));
  return configs;
}
