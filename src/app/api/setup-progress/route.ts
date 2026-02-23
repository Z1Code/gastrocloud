import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSetupProgress } from "@/lib/setup-progress";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const progress = await getSetupProgress(session.user.organizationId);
  return NextResponse.json(progress);
}
