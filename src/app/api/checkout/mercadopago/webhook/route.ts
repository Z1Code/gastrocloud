import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, payments } from '@/db/schema';
import { eq } from 'drizzle-orm';

// MercadoPago IPN (Instant Payment Notification)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, data } = body;

  if (type !== 'payment') {
    return NextResponse.json({ received: true });
  }

  try {
    const externalPaymentId = data?.id?.toString();
    if (!externalPaymentId) {
      return NextResponse.json({ received: true });
    }

    // Find payment by external reference
    const [payment] = await db.select().from(payments)
      .where(eq(payments.externalReference, externalPaymentId));

    if (!payment) {
      return NextResponse.json({ received: true });
    }

    // Update based on notification - in production, you'd verify with MP API
    await db.update(payments)
      .set({
        gatewayData: body,
      })
      .where(eq(payments.id, payment.id));

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'Error processing webhook' }, { status: 500 });
  }
}
