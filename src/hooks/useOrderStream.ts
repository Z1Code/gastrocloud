"use client";

import { useEffect, useRef, useCallback } from "react";

export interface OrderEvent {
  type:
    | "connected"
    | "order_created"
    | "status_changed"
    | "order_cancelled"
    | "item_bumped";
  orderId?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

interface UseOrderStreamOptions {
  onEvent?: (event: OrderEvent) => void;
  onOrderCreated?: (event: OrderEvent) => void;
  onStatusChanged?: (event: OrderEvent) => void;
  onOrderCancelled?: (event: OrderEvent) => void;
  enabled?: boolean;
}

export function useOrderStream(options: UseOrderStreamOptions = {}) {
  const {
    onEvent,
    onOrderCreated,
    onStatusChanged,
    onOrderCancelled,
    enabled = true,
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = new EventSource("/api/orders/stream");

    es.onmessage = (event) => {
      try {
        const parsed: OrderEvent = JSON.parse(event.data);

        // Call general callback
        onEvent?.(parsed);

        // Call specific callbacks based on event type
        switch (parsed.type) {
          case "order_created":
            onOrderCreated?.(parsed);
            break;
          case "status_changed":
            onStatusChanged?.(parsed);
            break;
          case "order_cancelled":
            onOrderCancelled?.(parsed);
            break;
        }
      } catch (error) {
        console.error("[useOrderStream] Failed to parse event:", error);
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;

      // Reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };

    eventSourceRef.current = es;
  }, [enabled, onEvent, onOrderCreated, onStatusChanged, onOrderCancelled]);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);
}
