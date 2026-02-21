import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assignAdminRole } from "@/lib/admin";
import { db } from "@/lib/db";
import { staffMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if any admin/owner already exists
  const existingAdmins = await db
    .select()
    .from(staffMembers)
    .where(eq(staffMembers.role, "owner"))
    .limit(1);

  // Also check if current user already has a role
  const currentUserStaff = await db
    .select()
    .from(staffMembers)
    .where(eq(staffMembers.userId, session.user.id))
    .limit(1);

  if (currentUserStaff.length > 0) {
    return NextResponse.json({
      message: "User already has a role",
      role: currentUserStaff[0].role,
    });
  }

  if (existingAdmins.length > 0) {
    return NextResponse.json(
      { error: "An admin already exists. Contact your administrator." },
      { status: 403 }
    );
  }

  const staff = await assignAdminRole(session.user.id, session.user.email!);

  return NextResponse.json({
    message: "Admin role assigned successfully",
    role: staff.role,
    organizationId: staff.organizationId,
  });
}
