import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, payments, paymentGatewayConfigs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Only handle payment events
  if (body.type !== "payment" || !body.data?.id) {
    return NextResponse.json({ received: true });
  }

  const paymentId = String(body.data.id);

  try {
    // Find which org this payment belongs to by checking all active MP configs
    const configs = await db
      .select()
      .from(paymentGatewayConfigs)
      .where(
        and(
          eq(paymentGatewayConfigs.gateway, "mercadopago"),
          eq(paymentGatewayConfigs.isActive, true),
        ),
      );

    for (const config of configs) {
      try {
        const creds = JSON.parse(decrypt(config.credentials));
        const { MercadoPagoConfig, Payment } = await import("mercadopago");
        const client = new MercadoPagoConfig({
          accessToken: creds.accessToken,
        });
        const paymentClient = new Payment(client);

        // Try to fetch this payment with this config's credentials
        const mpPayment = await paymentClient.get({ id: paymentId });

        if (!mpPayment || !mpPayment.external_reference) continue;

        const orderId = mpPayment.external_reference;

        // Check if order exists for this org
        const [order] = await db
          .select()
          .from(orders)
          .where(
            and(
              eq(orders.id, orderId),
              eq(orders.organizationId, config.organizationId),
            ),
          );

        if (!order) continue;

        // Idempotency: skip if already paid
        if (order.paymentStatus === "paid") {
          return NextResponse.json({ received: true });
        }

        // Map MP status to our status
        const statusMap: Record<string, string> = {
          approved: "paid",
          rejected: "pending",
          refunded: "refunded",
        };
        const newPaymentStatus =
          statusMap[mpPayment.status || ""] || "pending";

        // Update payment record
        await db
          .update(payments)
          .set({
            status: newPaymentStatus as "paid" | "pending" | "refunded",
            externalReference: paymentId,
            gatewayData: mpPayment as unknown as Record<string, unknown>,
          })
          .where(eq(payments.orderId, orderId));

        // Update order payment status
        await db
          .update(orders)
          .set({
            paymentStatus: newPaymentStatus as "paid" | "pending" | "refunded",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));

        return NextResponse.json({ received: true });
      } catch {
        // This config didn't match, try next
        continue;
      }
    }
  } catch (error) {
    console.error("[MercadoPago Webhook] Error:", error);
  }

  // Always return 200
  return NextResponse.json({ received: true });
}
