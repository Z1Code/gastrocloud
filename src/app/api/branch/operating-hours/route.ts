import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { branches } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId || !session?.user?.branchId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const branch = await db.query.branches.findFirst({
    columns: { operatingHours: true },
    where: eq(branches.id, session.user.branchId),
  });

  return NextResponse.json({
    operatingHours: branch?.operatingHours ?? null,
  });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId || !session?.user?.branchId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { operatingHours } = body;

  if (!operatingHours || typeof operatingHours !== "object") {
    return NextResponse.json(
      { error: "operatingHours es requerido y debe ser un objeto" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(branches)
    .set({
      operatingHours,
      updatedAt: new Date(),
    })
    .where(eq(branches.id, session.user.branchId))
    .returning({ operatingHours: branches.operatingHours });

  if (!updated) {
    return NextResponse.json(
      { error: "Sucursal no encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    operatingHours: updated.operatingHours,
  });
}
