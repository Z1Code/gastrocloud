import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  const [item] = await db
    .select({ isAvailable: menuItems.isAvailable })
    .from(menuItems)
    .where(and(eq(menuItems.id, id), eq(menuItems.organizationId, session.user.organizationId)))
    .limit(1);

  if (!item) {
    return NextResponse.json({ error: "Plato no encontrado" }, { status: 404 });
  }

  const [updated] = await db
    .update(menuItems)
    .set({ isAvailable: !item.isAvailable, updatedAt: new Date() })
    .where(and(eq(menuItems.id, id), eq(menuItems.organizationId, session.user.organizationId)))
    .returning();

  return NextResponse.json(updated);
}
