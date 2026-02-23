import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const organizationId = session.user.organizationId;

  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let lastCheck = new Date();

      // Send connected event immediately
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`
        )
      );

      const poll = async () => {
        if (cancelled) return;

        try {
          const now = new Date();

          // Query orders updated since lastCheck for this organization
          const updatedOrders = await db
            .select()
            .from(orders)
            .where(
              and(
                eq(orders.organizationId, organizationId),
                gte(orders.updatedAt, lastCheck)
              )
            );

          if (updatedOrders.length > 0) {
            // Fetch order items for all updated orders
            const orderIds = updatedOrders.map((o) => o.id);
            const items = await db
              .select()
              .from(orderItems)
              .where(inArray(orderItems.orderId, orderIds));

            // Group items by orderId
            const itemsByOrderId = items.reduce<Record<string, typeof items>>(
              (acc, item) => {
                if (!acc[item.orderId]) acc[item.orderId] = [];
                acc[item.orderId].push(item);
                return acc;
              },
              {}
            );

            for (const order of updatedOrders) {
              // Determine event type
              let eventType: string;
              if (order.createdAt >= lastCheck) {
                eventType = "order_created";
              } else if (order.status === "cancelled") {
                eventType = "order_cancelled";
              } else {
                eventType = "status_changed";
              }

              const event = {
                type: eventType,
                orderId: order.id,
                data: {
                  ...order,
                  items: itemsByOrderId[order.id] || [],
                },
                timestamp: new Date().toISOString(),
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
              );
            }
          }

          lastCheck = now;
        } catch (error) {
          // If the stream is already closed, stop polling
          if (cancelled) return;
          console.error("[SSE] Error polling orders:", error);
        }

        // Schedule next poll
        if (!cancelled) {
          timer = setTimeout(poll, 3000);
        }
      };

      // Start polling after initial delay
      timer = setTimeout(poll, 3000);
    },
    cancel() {
      cancelled = true;
      if (timer) clearTimeout(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
