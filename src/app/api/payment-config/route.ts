import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { paymentGatewayConfigs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt, decrypt } from '@/lib/encryption';

async function getAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId || !['super_admin', 'owner', 'admin'].includes(session.user.role!)) {
    return null;
  }
  return session;
}

// GET: list configs for org (credentials masked)
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const configs = await db.select().from(paymentGatewayConfigs)
    .where(eq(paymentGatewayConfigs.organizationId, session.user.organizationId!));

  const masked = configs.map((c) => {
    let creds: Record<string, string> = {};
    try {
      creds = JSON.parse(decrypt(c.credentials));
    } catch {
      creds = {};
    }
    const maskedCreds: Record<string, string> = {};
    for (const [key, val] of Object.entries(creds)) {
      maskedCreds[key] = val ? `${'•'.repeat(Math.min(val.length, 8))}${val.slice(-4)}` : '';
    }
    return { ...c, credentials: maskedCreds };
  });

  return NextResponse.json(masked);
}

// POST: upsert gateway config
export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { gateway, credentials, isActive, isSandbox } = body;

  if (!gateway || !['mercadopago', 'transbank'].includes(gateway)) {
    return NextResponse.json({ error: 'Gateway invalido' }, { status: 400 });
  }
  if (!credentials || typeof credentials !== 'object') {
    return NextResponse.json({ error: 'Credenciales requeridas' }, { status: 400 });
  }

  const encryptedCreds = encrypt(JSON.stringify(credentials));
  const orgId = session.user.organizationId!;

  const [existing] = await db.select().from(paymentGatewayConfigs)
    .where(and(
      eq(paymentGatewayConfigs.organizationId, orgId),
      eq(paymentGatewayConfigs.gateway, gateway),
    ));

  if (existing) {
    await db.update(paymentGatewayConfigs)
      .set({
        credentials: encryptedCreds,
        isActive: isActive ?? existing.isActive,
        isSandbox: isSandbox ?? existing.isSandbox,
        updatedAt: new Date(),
      })
      .where(eq(paymentGatewayConfigs.id, existing.id));
  } else {
    await db.insert(paymentGatewayConfigs).values({
      organizationId: orgId,
      gateway,
      credentials: encryptedCreds,
      isActive: isActive ?? false,
      isSandbox: isSandbox ?? true,
    });
  }

  return NextResponse.json({ success: true });
}

// DELETE: remove gateway config
export async function DELETE(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { gateway } = await request.json();
  if (!gateway) return NextResponse.json({ error: 'Gateway requerido' }, { status: 400 });

  await db.delete(paymentGatewayConfigs)
    .where(and(
      eq(paymentGatewayConfigs.organizationId, session.user.organizationId!),
      eq(paymentGatewayConfigs.gateway, gateway),
    ));

  return NextResponse.json({ success: true });
}
