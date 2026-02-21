import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { deliveryPlatformConfigs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt, decrypt } from '@/lib/encryption';

async function getAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId || !['super_admin', 'owner', 'admin'].includes(session.user.role!)) {
    return null;
  }
  return session;
}

const VALID_PLATFORMS = ['uber_eats', 'rappi', 'whatsapp'] as const;

// GET: list delivery platform configs for org (credentials masked)
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const configs = await db.select().from(deliveryPlatformConfigs)
    .where(eq(deliveryPlatformConfigs.organizationId, session.user.organizationId!));

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

// POST: upsert delivery platform config
export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { platform, credentials, externalStoreId, webhookSecret, isActive, isSandbox, metadata } = body;

  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: 'Plataforma invalida' }, { status: 400 });
  }
  if (!credentials || typeof credentials !== 'object') {
    return NextResponse.json({ error: 'Credenciales requeridas' }, { status: 400 });
  }

  const encryptedCreds = encrypt(JSON.stringify(credentials));
  const orgId = session.user.organizationId!;

  const [existing] = await db.select().from(deliveryPlatformConfigs)
    .where(and(
      eq(deliveryPlatformConfigs.organizationId, orgId),
      eq(deliveryPlatformConfigs.platform, platform),
    ));

  if (existing) {
    await db.update(deliveryPlatformConfigs)
      .set({
        credentials: encryptedCreds,
        externalStoreId: externalStoreId ?? existing.externalStoreId,
        webhookSecret: webhookSecret !== undefined ? webhookSecret : existing.webhookSecret,
        isActive: isActive ?? existing.isActive,
        isSandbox: isSandbox ?? existing.isSandbox,
        metadata: metadata !== undefined ? metadata : existing.metadata,
        updatedAt: new Date(),
      })
      .where(eq(deliveryPlatformConfigs.id, existing.id));
  } else {
    await db.insert(deliveryPlatformConfigs).values({
      organizationId: orgId,
      platform,
      credentials: encryptedCreds,
      externalStoreId: externalStoreId ?? null,
      webhookSecret: webhookSecret ?? null,
      isActive: isActive ?? false,
      isSandbox: isSandbox ?? true,
      metadata: metadata ?? null,
    });
  }

  return NextResponse.json({ success: true });
}

// DELETE: remove delivery platform config
export async function DELETE(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { platform } = await request.json();
  if (!platform) return NextResponse.json({ error: 'Plataforma requerida' }, { status: 400 });

  await db.delete(deliveryPlatformConfigs)
    .where(and(
      eq(deliveryPlatformConfigs.organizationId, session.user.organizationId!),
      eq(deliveryPlatformConfigs.platform, platform),
    ));

  return NextResponse.json({ success: true });
}
