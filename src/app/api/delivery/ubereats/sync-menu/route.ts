import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { deliveryPlatformConfigs, menuCategories, menuItems, menuModifiers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';
import { getUberEatsToken, syncMenuToUberEats } from '@/lib/delivery/ubereats';
import type { UberEatsMenuPayload, UberEatsCategory, UberEatsMenuItem, UberEatsModifierGroup } from '@/lib/delivery/ubereats';

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

    // Load Uber Eats delivery config
    const [config] = await db.select().from(deliveryPlatformConfigs)
      .where(and(
        eq(deliveryPlatformConfigs.organizationId, orgId),
        eq(deliveryPlatformConfigs.platform, 'uber_eats'),
      ));

    if (!config) {
      return NextResponse.json({ error: 'Configuracion de Uber Eats no encontrada' }, { status: 404 });
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
    const tokenResponse = await getUberEatsToken(creds.client_id, creds.client_secret, config.isSandbox);

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

    // Build Uber Eats menu payload
    const uberCategories: UberEatsCategory[] = [];
    const uberItems: UberEatsMenuItem[] = [];
    const uberModifierGroups: UberEatsModifierGroup[] = [];

    for (const cat of categories) {
      const catItems = itemsByCategory.get(cat.id) ?? [];
      const entityIds: { id: string; type: 'ITEM' }[] = [];

      for (const item of catItems) {
        const priceInCents = Math.round(parseFloat(item.price) * 100);
        const itemModifiers = modifiersByItem.get(item.id) ?? [];

        // Build modifier group for this item if it has modifiers
        const modifierGroupIds: string[] = [];
        if (itemModifiers.length > 0) {
          const groupId = `mod_group_${item.id}`;
          modifierGroupIds.push(groupId);

          uberModifierGroups.push({
            id: groupId,
            title: `Opciones - ${item.name}`,
            quantity_info: {
              quantity: {
                min_permitted: 0,
                max_permitted: itemModifiers.length,
              },
            },
            modifier_options: itemModifiers.map((mod) => ({
              id: mod.id,
              title: mod.name,
              price_info: {
                price: Math.round(parseFloat(mod.priceAdjustment) * 100),
              },
            })),
          });
        }

        const uberItem: UberEatsMenuItem = {
          id: item.id,
          title: item.name,
          description: item.description ?? undefined,
          image_url: item.imageUrl ?? undefined,
          price_info: {
            price: priceInCents,
          },
        };

        if (modifierGroupIds.length > 0) {
          uberItem.modifier_group_ids = { ids: modifierGroupIds };
        }

        uberItems.push(uberItem);
        entityIds.push({ id: item.id, type: 'ITEM' });
      }

      uberCategories.push({
        id: cat.id,
        title: cat.name,
        entities: entityIds,
      });
    }

    const menuPayload: UberEatsMenuPayload = {
      menus: [
        {
          id: `menu_${orgId}`,
          title: 'Menu Principal',
          service_availability: [
            { day_of_week: 'monday', time_periods: [{ start_time: '00:00', end_time: '23:59' }] },
            { day_of_week: 'tuesday', time_periods: [{ start_time: '00:00', end_time: '23:59' }] },
            { day_of_week: 'wednesday', time_periods: [{ start_time: '00:00', end_time: '23:59' }] },
            { day_of_week: 'thursday', time_periods: [{ start_time: '00:00', end_time: '23:59' }] },
            { day_of_week: 'friday', time_periods: [{ start_time: '00:00', end_time: '23:59' }] },
            { day_of_week: 'saturday', time_periods: [{ start_time: '00:00', end_time: '23:59' }] },
            { day_of_week: 'sunday', time_periods: [{ start_time: '00:00', end_time: '23:59' }] },
          ],
          category_ids: uberCategories.map((c) => c.id),
        },
      ],
      categories: uberCategories,
      items: uberItems,
      modifier_groups: uberModifierGroups,
    };

    // Sync menu to Uber Eats
    await syncMenuToUberEats(config.externalStoreId, tokenResponse.access_token, menuPayload, config.isSandbox);

    // Update lastSyncAt
    await db.update(deliveryPlatformConfigs)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(deliveryPlatformConfigs.id, config.id));

    return NextResponse.json({
      success: true,
      message: 'Menu sincronizado con Uber Eats exitosamente',
      stats: {
        categories: uberCategories.length,
        items: uberItems.length,
        modifierGroups: uberModifierGroups.length,
      },
    });
  } catch (error) {
    console.error('Error sincronizando menu con Uber Eats:', error);
    return NextResponse.json(
      { error: 'Error al sincronizar menu con Uber Eats', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
