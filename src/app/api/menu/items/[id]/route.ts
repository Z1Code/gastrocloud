import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuItems, menuModifiers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
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
    isAvailable,
    modifiers: modifiersList,
  } = body;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (categoryId !== undefined) updateData.categoryId = categoryId;
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (price !== undefined) updateData.price = String(price);
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
  if (prepTimeMinutes !== undefined) updateData.prepTimeMinutes = prepTimeMinutes || null;
  if (ingredients !== undefined) updateData.ingredients = ingredients;
  if (allergens !== undefined) updateData.allergens = allergens;
  if (station !== undefined) updateData.station = station || null;
  if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

  const [updated] = await db
    .update(menuItems)
    .set(updateData)
    .where(and(eq(menuItems.id, id), eq(menuItems.organizationId, orgId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Plato no encontrado" }, { status: 404 });
  }

  if (modifiersList !== undefined) {
    await db.delete(menuModifiers).where(eq(menuModifiers.menuItemId, id));

    if (modifiersList.length > 0) {
      await db.insert(menuModifiers).values(
        modifiersList.map((m: { name: string; priceAdjustment: number; isDefault?: boolean }) => ({
          organizationId: orgId,
          menuItemId: id,
          name: m.name.trim(),
          priceAdjustment: String(m.priceAdjustment ?? 0),
          isDefault: m.isDefault ?? false,
        })),
      );
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  const [deleted] = await db
    .delete(menuItems)
    .where(
      and(
        eq(menuItems.id, id),
        eq(menuItems.organizationId, session.user.organizationId),
      ),
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Plato no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
