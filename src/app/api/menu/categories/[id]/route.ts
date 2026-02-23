import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuCategories, menuItems } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, description, isActive } = body;

  const [updated] = await db
    .update(menuCategories)
    .set({
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(menuCategories.id, id),
        eq(menuCategories.organizationId, session.user.organizationId),
      ),
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
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

  const [itemCount] = await db
    .select({ count: count() })
    .from(menuItems)
    .where(eq(menuItems.categoryId, id));

  if (Number(itemCount.count) > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar una categoría con platos. Mueve o elimina los platos primero." },
      { status: 409 },
    );
  }

  const [deleted] = await db
    .delete(menuCategories)
    .where(
      and(
        eq(menuCategories.id, id),
        eq(menuCategories.organizationId, session.user.organizationId),
      ),
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
