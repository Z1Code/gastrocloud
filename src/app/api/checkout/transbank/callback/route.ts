import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { restaurants, orders, payments, paymentGatewayConfigs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';
import { confirmTransbankTransaction } from '@/lib/payment/transbank';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const tokenWs = formData.get('token_ws') as string;
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const orderId = searchParams.get('orderId');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!tokenWs || !slug || !orderId) {
    return NextResponse.redirect(`${appUrl}/r/${slug || ''}/order?payment=error`);
  }

  try {
    // Get the order and restaurant to find gateway config
    const [order] = await db.select().from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      return NextResponse.redirect(`${appUrl}/r/${slug}/order?payment=error`);
    }

    const [config] = await db.select().from(paymentGatewayConfigs)
      .where(and(
        eq(paymentGatewayConfigs.organizationId, order.organizationId),
        eq(paymentGatewayConfigs.gateway, 'transbank'),
      ));

    if (!config) {
      return NextResponse.redirect(`${appUrl}/r/${slug}/order?payment=error`);
    }

    const credentials = JSON.parse(decrypt(config.credentials));

    const result = await confirmTransbankTransaction(tokenWs, {
      commerceCode: credentials.commerceCode,
      apiKey: credentials.apiKey,
    }, config.isSandbox);

    if (result.responseCode === 0) {
      // Payment approved
      await db.update(orders)
        .set({ paymentStatus: 'paid', updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      await db.update(payments)
        .set({
          status: 'paid',
          externalReference: result.authorizationCode,
          gatewayData: result,
        })
        .where(eq(payments.orderId, orderId));

      return NextResponse.redirect(`${appUrl}/r/${slug}/track/${orderId}`);
    } else {
      return NextResponse.redirect(`${appUrl}/r/${slug}/order?payment=failure`);
    }
  } catch {
    return NextResponse.redirect(`${appUrl}/r/${slug}/order?payment=error`);
  }
}
