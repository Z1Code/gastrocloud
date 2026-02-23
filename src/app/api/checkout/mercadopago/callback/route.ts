import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, payments } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const orderId = searchParams.get('orderId');
  const paymentId = searchParams.get('payment_id');

  if (!slug || !orderId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    if (!paymentId) {
      return NextResponse.redirect(`${appUrl}/r/${slug}/order?payment=failure&orderId=${orderId}`);
    }

    // Verify payment status with MercadoPago API instead of trusting URL params
    const [payment] = await db.select().from(payments)
      .where(eq(payments.orderId, orderId));

    if (!payment) {
      return NextResponse.redirect(`${appUrl}/r/${slug}/order?payment=error`);
    }

    // Get the gateway config to retrieve access token
    const { getGatewayConfig } = await import('@/lib/payment');
    const config = await getGatewayConfig(payment.organizationId, 'mercadopago');

    if (!config) {
      return NextResponse.redirect(`${appUrl}/r/${slug}/order?payment=error`);
    }

    // Verify with MercadoPago API
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${config.credentials.accessToken}` },
    });

    if (!mpRes.ok) {
      return NextResponse.redirect(`${appUrl}/r/${slug}/order?payment=failure&orderId=${orderId}`);
    }

    const mpData = await mpRes.json();

    if (mpData.status === 'approved') {
      await db.update(orders)
        .set({ paymentStatus: 'paid', updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      await db.update(payments)
        .set({
          status: 'paid',
          externalReference: paymentId,
          gatewayData: { mpStatus: mpData.status, paymentId, verifiedAt: new Date().toISOString() },
        })
        .where(eq(payments.orderId, orderId));

      return NextResponse.redirect(`${appUrl}/r/${slug}/track/${orderId}`);
    } else {
      // Store the actual status for debugging
      await db.update(payments)
        .set({
          gatewayData: { mpStatus: mpData.status, paymentId },
        })
        .where(eq(payments.orderId, orderId));

      return NextResponse.redirect(`${appUrl}/r/${slug}/order?payment=failure&orderId=${orderId}`);
    }
  } catch {
    return NextResponse.redirect(`${appUrl}/r/${slug}/order?payment=error`);
  }
}
