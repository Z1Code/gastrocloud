import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  organizations,
  restaurants,
  branches,
  staffMembers,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Check if user already has a staff record
  const existing = await db
    .select()
    .from(staffMembers)
    .where(eq(staffMembers.userId, session.user.id))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Ya tienes una organización configurada" },
      { status: 409 },
    );
  }

  const body = await request.json();
  const { orgName, restaurantName, cuisineType, address } = body;

  if (!orgName || !restaurantName) {
    return NextResponse.json(
      { error: "Nombre de organización y restaurante son requeridos" },
      { status: 400 },
    );
  }

  // Generate slug from name
  const slug = orgName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Date.now().toString(36);

  const restaurantSlug = restaurantName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Date.now().toString(36);

  const [org] = await db
    .insert(organizations)
    .values({ name: orgName, slug })
    .returning();

  const [restaurant] = await db
    .insert(restaurants)
    .values({
      organizationId: org.id,
      name: restaurantName,
      slug: restaurantSlug,
      description: cuisineType ? `Cocina ${cuisineType}` : undefined,
      address: address || undefined,
    })
    .returning();

  const [branch] = await db
    .insert(branches)
    .values({
      organizationId: org.id,
      restaurantId: restaurant.id,
      name: "Sucursal Principal",
      address: address || undefined,
    })
    .returning();

  const [staff] = await db
    .insert(staffMembers)
    .values({
      organizationId: org.id,
      userId: session.user.id,
      branchId: branch.id,
      role: "owner",
    })
    .returning();

  return NextResponse.json({
    organization: org,
    restaurant,
    branch,
    staff,
  });
}
