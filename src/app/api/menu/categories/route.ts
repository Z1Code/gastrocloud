import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuCategories, menuItems, restaurants } from "@/db/schema";
import { eq, and, count, asc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const orgId = session.user.organizationId;

  const [restaurant] = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.organizationId, orgId))
    .limit(1);

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 });
  }

  const cats = await db
    .select({
      id: menuCategories.id,
      name: menuCategories.name,
      description: menuCategories.description,
      displayOrder: menuCategories.displayOrder,
      imageUrl: menuCategories.imageUrl,
      isActive: menuCategories.isActive,
    })
    .from(menuCategories)
    .where(eq(menuCategories.restaurantId, restaurant.id))
    .orderBy(asc(menuCategories.displayOrder));

  const counts = await db
    .select({
      categoryId: menuItems.categoryId,
      count: count(),
    })
    .from(menuItems)
    .where(eq(menuItems.organizationId, orgId))
    .groupBy(menuItems.categoryId);

  const countMap = new Map(counts.map((c) => [c.categoryId, Number(c.count)]));

  const result = cats.map((cat) => ({
    ...cat,
    itemCount: countMap.get(cat.id) ?? 0,
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
  const { name, description } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nombre es requerido" }, { status: 400 });
  }

  const [restaurant] = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.organizationId, orgId))
    .limit(1);

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 });
  }

  const existing = await db
    .select({ displayOrder: menuCategories.displayOrder })
    .from(menuCategories)
    .where(eq(menuCategories.restaurantId, restaurant.id))
    .orderBy(asc(menuCategories.displayOrder));

  const nextOrder = existing.length > 0 ? existing[existing.length - 1].displayOrder + 1 : 0;

  const [category] = await db
    .insert(menuCategories)
    .values({
      organizationId: orgId,
      restaurantId: restaurant.id,
      name: name.trim(),
      description: description?.trim() || null,
      displayOrder: nextOrder,
    })
    .returning();

  return NextResponse.json(category, { status: 201 });
}
