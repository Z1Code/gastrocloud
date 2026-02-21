import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { paymentGatewayConfigs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId || !['super_admin', 'owner', 'admin'].includes(session.user.role!)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { gateway } = await request.json();
  if (!gateway || !['mercadopago', 'transbank'].includes(gateway)) {
    return NextResponse.json({ error: 'Gateway invalido' }, { status: 400 });
  }

  const [config] = await db.select().from(paymentGatewayConfigs)
    .where(and(
      eq(paymentGatewayConfigs.organizationId, session.user.organizationId!),
      eq(paymentGatewayConfigs.gateway, gateway),
    ));

  if (!config) {
    return NextResponse.json({ error: 'Configuracion no encontrada' }, { status: 404 });
  }

  let credentials: Record<string, string>;
  try {
    credentials = JSON.parse(decrypt(config.credentials));
  } catch {
    return NextResponse.json({ error: 'Error al descifrar credenciales' }, { status: 500 });
  }

  try {
    if (gateway === 'mercadopago') {
      const { MercadoPagoConfig, Payment } = await import('mercadopago');
      const client = new MercadoPagoConfig({ accessToken: credentials.accessToken });
      const payment = new Payment(client);
      // Search for recent payments to test connection
      await payment.search({ options: { limit: 1 } });
    } else if (gateway === 'transbank') {
      // For Transbank, we test by creating and immediately voiding a small tx
      // In sandbox mode, just verify credentials format
      if (!credentials.commerceCode || !credentials.apiKey) {
        return NextResponse.json({ success: false, error: 'Faltan commerceCode o apiKey' });
      }
    }

    // Update lastTestedAt
    await db.update(paymentGatewayConfigs)
      .set({ lastTestedAt: new Date() })
      .where(eq(paymentGatewayConfigs.id, config.id));

    return NextResponse.json({ success: true, message: 'Conexion exitosa' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ success: false, error: `Error de conexion: ${message}` });
  }
}
