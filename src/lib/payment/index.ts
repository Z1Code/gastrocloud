import { db } from '@/lib/db';
import { paymentGatewayConfigs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';

export async function getGatewayConfig(organizationId: string, gateway: 'mercadopago' | 'transbank') {
  const [config] = await db.select().from(paymentGatewayConfigs)
    .where(and(
      eq(paymentGatewayConfigs.organizationId, organizationId),
      eq(paymentGatewayConfigs.gateway, gateway),
      eq(paymentGatewayConfigs.isActive, true),
    ));
  if (!config) return null;
  return { ...config, credentials: JSON.parse(decrypt(config.credentials)) };
}

export async function getActiveGateways(organizationId: string) {
  const configs = await db.select({
    gateway: paymentGatewayConfigs.gateway,
    isActive: paymentGatewayConfigs.isActive,
    isSandbox: paymentGatewayConfigs.isSandbox,
  }).from(paymentGatewayConfigs)
    .where(and(
      eq(paymentGatewayConfigs.organizationId, organizationId),
      eq(paymentGatewayConfigs.isActive, true),
    ));
  return configs;
}
