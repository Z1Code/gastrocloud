import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, payments } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const orderId = searchParams.get('orderId');
  const status = searchParams.get('status');
  const paymentId = searchParams.get('payment_id');
  const mpStatus = searchParams.get('collection_status') || status;

  if (!slug || !orderId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    if (mpStatus === 'approved') {
      // Mark order as paid
      await db.update(orders)
        .set({ paymentStatus: 'paid', updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      await db.update(payments)
        .set({
          status: 'paid',
          externalReference: paymentId,
          gatewayData: { mpStatus, paymentId },
        })
        .where(eq(payments.orderId, orderId));

      return NextResponse.redirect(`${appUrl}/r/${slug}/track/${orderId}`);
    } else {
      return NextResponse.redirect(`${appUrl}/r/${slug}/order?payment=failure&orderId=${orderId}`);
    }
  } catch {
    return NextResponse.redirect(`${appUrl}/r/${slug}/order?payment=error`);
  }
}
