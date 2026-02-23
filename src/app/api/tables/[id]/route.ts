import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { tables } from "@/db/schema";
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
  const body = await request.json();
  const { number, zone, capacity, status } = body;

  const [updated] = await db
    .update(tables)
    .set({
      ...(number !== undefined && { number }),
      ...(zone !== undefined && { zone }),
      ...(capacity !== undefined && { capacity }),
      ...(status !== undefined && { status }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tables.id, id),
        eq(tables.organizationId, session.user.organizationId),
      ),
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
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
    .delete(tables)
    .where(
      and(
        eq(tables.id, id),
        eq(tables.organizationId, session.user.organizationId),
      ),
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
