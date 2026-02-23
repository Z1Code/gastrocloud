import { db } from "./db";
import {
  restaurants,
  branches,
  menuItems,
  paymentGatewayConfigs,
  deliveryPlatformConfigs,
  tables,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface SetupProgress {
  hasLogo: boolean;
  hasOperatingHours: boolean;
  hasMenu: boolean;
  hasPayment: boolean;
  hasDelivery: boolean;
  hasTables: boolean;
  menuItemCount: number;
  completedSteps: number;
  totalSteps: number;
  canActivateStorefront: boolean;
  canReceiveDelivery: boolean;
}

export async function getSetupProgress(organizationId: string): Promise<SetupProgress> {
  const [restaurantRows, branchRows, menuItemRows, paymentRows, deliveryRows, tableRows] =
    await Promise.all([
      db
        .select({ logoUrl: restaurants.logoUrl })
        .from(restaurants)
        .where(eq(restaurants.organizationId, organizationId))
        .limit(1),
      db
        .select({ operatingHours: branches.operatingHours })
        .from(branches)
        .where(eq(branches.organizationId, organizationId))
        .limit(1),
      db
        .select({ id: menuItems.id })
        .from(menuItems)
        .where(eq(menuItems.organizationId, organizationId))
        .limit(1),
      db
        .select({ id: paymentGatewayConfigs.id })
        .from(paymentGatewayConfigs)
        .where(
          and(
            eq(paymentGatewayConfigs.organizationId, organizationId),
            eq(paymentGatewayConfigs.isActive, true),
          ),
        )
        .limit(1),
      db
        .select({ id: deliveryPlatformConfigs.id })
        .from(deliveryPlatformConfigs)
        .where(
          and(
            eq(deliveryPlatformConfigs.organizationId, organizationId),
            eq(deliveryPlatformConfigs.isActive, true),
          ),
        )
        .limit(1),
      db
        .select({ id: tables.id })
        .from(tables)
        .where(eq(tables.organizationId, organizationId))
        .limit(1),
    ]);

  const hasLogo = !!restaurantRows[0]?.logoUrl;
  const hasOperatingHours = !!branchRows[0]?.operatingHours;
  const hasMenu = menuItemRows.length > 0;
  const hasPayment = paymentRows.length > 0;
  const hasDelivery = deliveryRows.length > 0;
  const hasTables = tableRows.length > 0;

  const steps = [hasLogo, hasOperatingHours, hasMenu, hasPayment, hasTables];
  const completedSteps = steps.filter(Boolean).length;

  return {
    hasLogo,
    hasOperatingHours,
    hasMenu,
    hasPayment,
    hasDelivery,
    hasTables,
    menuItemCount: menuItemRows.length,
    completedSteps,
    totalSteps: steps.length,
    canActivateStorefront: hasMenu && hasPayment,
    canReceiveDelivery: hasMenu && hasPayment && hasDelivery,
  };
}
