import { db } from "./db";
import { organizations, restaurants, branches, staffMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function assignAdminRole(userId: string, email: string) {
  // Check if user already has a staff record
  const existing = await db
    .select()
    .from(staffMembers)
    .where(eq(staffMembers.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create organization
  const [org] = await db
    .insert(organizations)
    .values({
      name: "GastroCloud Demo",
      slug: `demo-${Date.now()}`,
    })
    .returning();

  // Create restaurant
  const [restaurant] = await db
    .insert(restaurants)
    .values({
      organizationId: org.id,
      name: "Mi Restaurante",
      slug: `mi-restaurante-${Date.now()}`,
    })
    .returning();

  // Create branch
  const [branch] = await db
    .insert(branches)
    .values({
      organizationId: org.id,
      restaurantId: restaurant.id,
      name: "Sucursal Principal",
    })
    .returning();

  // Assign owner role
  const [staff] = await db
    .insert(staffMembers)
    .values({
      organizationId: org.id,
      userId: userId,
      branchId: branch.id,
      role: "owner",
    })
    .returning();

  return staff;
}

export async function getStaffMember(userId: string) {
  const result = await db
    .select()
    .from(staffMembers)
    .where(eq(staffMembers.userId, userId))
    .limit(1);

  return result[0] ?? null;
}
