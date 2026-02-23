import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { tables, restaurants } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const orgId = session.user.organizationId;

  const rows = await db
    .select()
    .from(tables)
    .where(eq(tables.organizationId, orgId))
    .orderBy(asc(tables.number));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const branchId = session.user.branchId;

  if (!branchId) {
    return NextResponse.json({ error: "Sucursal no seleccionada" }, { status: 400 });
  }

  const body = await request.json();
  const { number, zone, capacity, count } = body;

  // Get restaurant slug for QR code URL
  const [restaurant] = await db
    .select({ slug: restaurants.slug })
    .from(restaurants)
    .where(eq(restaurants.organizationId, orgId))
    .limit(1);

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://gastrocloud.vercel.app";

  // ── Bulk create ──────────────────────────────────────────────────────────
  if (count && count > 0) {
    const bulkCount = Math.min(count, 50);

    // Find highest existing table number for this org
    const existing = await db
      .select({ number: tables.number })
      .from(tables)
      .where(eq(tables.organizationId, orgId))
      .orderBy(asc(tables.number));

    const highestNumber = existing.length > 0 ? existing[existing.length - 1].number : 0;

    const valuesToInsert = Array.from({ length: bulkCount }, (_, i) => {
      const tableNumber = highestNumber + 1 + i;
      return {
        organizationId: orgId,
        branchId,
        number: tableNumber,
        zone: zone ?? null,
        capacity: capacity ?? 4,
        qrCode: `${baseUrl}/r/${restaurant.slug}/menu?table=${tableNumber}`,
      };
    });

    const created = await db.insert(tables).values(valuesToInsert).returning();

    return NextResponse.json(created, { status: 201 });
  }

  // ── Single create ────────────────────────────────────────────────────────
  if (!number || !capacity) {
    return NextResponse.json(
      { error: "Número y capacidad son requeridos" },
      { status: 400 },
    );
  }

  // Check for duplicate number within org
  const [duplicate] = await db
    .select({ id: tables.id })
    .from(tables)
    .where(and(eq(tables.organizationId, orgId), eq(tables.number, number)))
    .limit(1);

  if (duplicate) {
    return NextResponse.json(
      { error: `Ya existe una mesa con el número ${number}` },
      { status: 409 },
    );
  }

  const [created] = await db
    .insert(tables)
    .values({
      organizationId: orgId,
      branchId,
      number,
      zone: zone ?? null,
      capacity,
      qrCode: `${baseUrl}/r/${restaurant.slug}/menu?table=${number}`,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
