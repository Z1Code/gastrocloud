import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuItems, menuModifiers } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");

  const conditions = [eq(menuItems.organizationId, session.user.organizationId)];
  if (categoryId) {
    conditions.push(eq(menuItems.categoryId, categoryId));
  }

  const items = await db
    .select()
    .from(menuItems)
    .where(and(...conditions))
    .orderBy(asc(menuItems.displayOrder));

  let modifiers: (typeof menuModifiers.$inferSelect)[] = [];
  if (items.length > 0) {
    modifiers = await db
      .select()
      .from(menuModifiers)
      .where(eq(menuModifiers.organizationId, session.user.organizationId));
  }

  const modifiersByItem = new Map<string, typeof modifiers>();
  for (const mod of modifiers) {
    const existing = modifiersByItem.get(mod.menuItemId) ?? [];
    existing.push(mod);
    modifiersByItem.set(mod.menuItemId, existing);
  }

  const result = items.map((item) => ({
    ...item,
    modifiers: modifiersByItem.get(item.id) ?? [],
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const body = await request.json();
  const {
    categoryId,
    name,
    description,
    price,
    imageUrl,
    prepTimeMinutes,
    ingredients,
    allergens,
    station,
    modifiers: modifiersList,
  } = body;

  if (!categoryId || !name?.trim() || price === undefined) {
    return NextResponse.json(
      { error: "Categoría, nombre y precio son requeridos" },
      { status: 400 },
    );
  }

  const [item] = await db
    .insert(menuItems)
    .values({
      organizationId: orgId,
      categoryId,
      name: name.trim(),
      description: description?.trim() || null,
      price: String(price),
      imageUrl: imageUrl || null,
      prepTimeMinutes: prepTimeMinutes || null,
      ingredients: ingredients || null,
      allergens: allergens || null,
      station: station || null,
    })
    .returning();

  if (modifiersList?.length > 0) {
    await db.insert(menuModifiers).values(
      modifiersList.map((m: { name: string; priceAdjustment: number; isDefault?: boolean }) => ({
        organizationId: orgId,
        menuItemId: item.id,
        name: m.name.trim(),
        priceAdjustment: String(m.priceAdjustment ?? 0),
        isDefault: m.isDefault ?? false,
      })),
    );
  }

  return NextResponse.json(item, { status: 201 });
}
