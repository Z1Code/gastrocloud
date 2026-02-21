import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { deliveryPlatformConfigs, menuCategories, menuItems, menuModifiers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';
import { getRappiToken, syncMenuToRappi } from '@/lib/delivery/rappi';
import type { RappiMenuPayload, RappiMenuCategory, RappiMenuItem } from '@/lib/delivery/rappi';

async function getAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId || !['super_admin', 'owner', 'admin'].includes(session.user.role!)) {
    return null;
  }
  return session;
}

export async function POST() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const orgId = session.user.organizationId!;

    // Load Rappi delivery config
    const [config] = await db.select().from(deliveryPlatformConfigs)
      .where(and(
        eq(deliveryPlatformConfigs.organizationId, orgId),
        eq(deliveryPlatformConfigs.platform, 'rappi'),
      ));

    if (!config) {
      return NextResponse.json({ error: 'Configuracion de Rappi no encontrada' }, { status: 404 });
    }
    if (!config.externalStoreId) {
      return NextResponse.json({ error: 'ID de tienda externa no configurado' }, { status: 400 });
    }

    // Decrypt credentials
    let creds: { client_id: string; client_secret: string };
    try {
      creds = JSON.parse(decrypt(config.credentials));
    } catch {
      return NextResponse.json({ error: 'Error al descifrar credenciales' }, { status: 500 });
    }

    // Get OAuth token
    const tokenResponse = await getRappiToken(creds.client_id, creds.client_secret, config.isSandbox);

    // Fetch menu data from DB
    const categories = await db.select().from(menuCategories)
      .where(eq(menuCategories.organizationId, orgId));

    const items = await db.select().from(menuItems)
      .where(eq(menuItems.organizationId, orgId));

    const modifiers = await db.select().from(menuModifiers)
      .where(eq(menuModifiers.organizationId, orgId));

    // Group modifiers by menuItemId
    const modifiersByItem = new Map<string, typeof modifiers>();
    for (const mod of modifiers) {
      const existing = modifiersByItem.get(mod.menuItemId) ?? [];
      existing.push(mod);
      modifiersByItem.set(mod.menuItemId, existing);
    }

    // Group items by categoryId
    const itemsByCategory = new Map<string, typeof items>();
    for (const item of items) {
      const existing = itemsByCategory.get(item.categoryId) ?? [];
      existing.push(item);
      itemsByCategory.set(item.categoryId, existing);
    }

    // Build Rappi menu payload
    const rappiCategories: RappiMenuCategory[] = [];

    for (const cat of categories) {
      const catItems = itemsByCategory.get(cat.id) ?? [];

      const rappiItems: RappiMenuItem[] = catItems.map((item) => {
        const itemModifiers = modifiersByItem.get(item.id) ?? [];

        const rappiItem: RappiMenuItem = {
          id: item.id,
          name: item.name,
          description: item.description ?? '',
          price: parseFloat(item.price),
          image_url: item.imageUrl ?? '',
          is_available: item.isAvailable,
        };

        if (itemModifiers.length > 0) {
          rappiItem.modifier_groups = [
            {
              id: `mod_group_${item.id}`,
              name: `Opciones - ${item.name}`,
              min_quantity: 0,
              max_quantity: itemModifiers.length,
              modifiers: itemModifiers.map((mod) => ({
                id: mod.id,
                name: mod.name,
                price: parseFloat(mod.priceAdjustment),
                is_available: true,
              })),
            },
          ];
        }

        return rappiItem;
      });

      rappiCategories.push({
        id: cat.id,
        name: cat.name,
        items: rappiItems,
      });
    }

    const menuPayload: RappiMenuPayload = {
      store_id: config.externalStoreId,
      categories: rappiCategories,
    };

    // Sync menu to Rappi
    await syncMenuToRappi(tokenResponse.access_token, menuPayload, config.isSandbox);

    // Update lastSyncAt
    await db.update(deliveryPlatformConfigs)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(deliveryPlatformConfigs.id, config.id));

    return NextResponse.json({
      success: true,
      message: 'Menu sincronizado con Rappi exitosamente',
      stats: {
        categories: rappiCategories.length,
        items: rappiCategories.reduce((sum, c) => sum + c.items.length, 0),
      },
    });
  } catch (error) {
    console.error('Error sincronizando menu con Rappi:', error);
    return NextResponse.json(
      { error: 'Error al sincronizar menu con Rappi', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
