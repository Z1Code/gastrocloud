import type { OrderSource } from '@/types';
import { getDeliveryConfig } from '@/lib/delivery';
import {
  getUberEatsToken,
  acceptUberEatsOrder,
  denyUberEatsOrder,
} from '@/lib/delivery/ubereats';
import {
  getRappiToken,
  acceptRappiOrder,
  markRappiOrderReady,
  rejectRappiOrder,
} from '@/lib/delivery/rappi';
import { sendOrderStatusUpdate } from '@/lib/delivery/whatsapp';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncParams {
  orderId: string;
  organizationId: string;
  source: OrderSource;
  externalOrderId?: string;
  newStatus: string;
  customerPhone?: string;
  estimatedMinutes?: number;
}

// ---------------------------------------------------------------------------
// Status mapping for WhatsApp messages
// ---------------------------------------------------------------------------

const WHATSAPP_STATUS_MAP: Record<string, string> = {
  accepted: 'siendo preparado',
  preparing: 'en preparacion',
  ready: 'listo para retiro/entrega',
  completed: 'completado',
};

// ---------------------------------------------------------------------------
// Platform-specific sync handlers
// ---------------------------------------------------------------------------

async function syncToUberEats(
  organizationId: string,
  externalOrderId: string,
  newStatus: string,
): Promise<void> {
  const config = await getDeliveryConfig(organizationId, 'uber_eats');
  if (!config) {
    console.warn(`[status-sync] No active Uber Eats config for org ${organizationId}`);
    return;
  }

  const { access_token } = await getUberEatsToken(
    config.credentials.client_id,
    config.credentials.client_secret,
    config.isSandbox,
  );

  if (newStatus === 'accepted') {
    await acceptUberEatsOrder(externalOrderId, access_token, config.isSandbox);
  } else if (newStatus === 'cancelled') {
    await denyUberEatsOrder(
      externalOrderId,
      access_token,
      'Cancelado por el restaurante',
      config.isSandbox,
    );
  }
}

async function syncToRappi(
  organizationId: string,
  externalOrderId: string,
  newStatus: string,
  estimatedMinutes?: number,
): Promise<void> {
  const config = await getDeliveryConfig(organizationId, 'rappi');
  if (!config) {
    console.warn(`[status-sync] No active Rappi config for org ${organizationId}`);
    return;
  }

  const { access_token } = await getRappiToken(
    config.credentials.client_id,
    config.credentials.client_secret,
    config.isSandbox,
  );

  if (newStatus === 'accepted') {
    const cookingTime = estimatedMinutes ?? 20;
    await acceptRappiOrder(externalOrderId, cookingTime, access_token, config.isSandbox);
  } else if (newStatus === 'ready') {
    await markRappiOrderReady(externalOrderId, access_token, config.isSandbox);
  } else if (newStatus === 'cancelled') {
    await rejectRappiOrder(externalOrderId, access_token, config.isSandbox);
  }
}

async function syncToWhatsApp(
  organizationId: string,
  orderId: string,
  newStatus: string,
  customerPhone?: string,
  estimatedMinutes?: number,
): Promise<void> {
  if (!customerPhone) {
    console.warn(`[status-sync] No customer phone for WhatsApp order ${orderId}`);
    return;
  }

  const config = await getDeliveryConfig(organizationId, 'whatsapp');
  if (!config) {
    console.warn(`[status-sync] No active WhatsApp config for org ${organizationId}`);
    return;
  }

  const mappedStatus = WHATSAPP_STATUS_MAP[newStatus] ?? newStatus;

  await sendOrderStatusUpdate(
    config.credentials.phone_number_id,
    config.credentials.access_token,
    customerPhone,
    orderId,
    mappedStatus,
    estimatedMinutes,
  );
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

/**
 * Syncs an order status change from GastroCloud back to the originating
 * delivery platform.
 *
 * This is best-effort: errors are logged but never thrown so the caller's
 * order-status update flow is not interrupted.
 */
export async function syncOrderStatusToDeliveryPlatform(
  params: SyncParams,
): Promise<void> {
  const {
    orderId,
    organizationId,
    source,
    externalOrderId,
    newStatus,
    customerPhone,
    estimatedMinutes,
  } = params;

  try {
    switch (source) {
      case 'uber_eats': {
        if (!externalOrderId) {
          console.warn(`[status-sync] Missing externalOrderId for Uber Eats order ${orderId}`);
          return;
        }
        await syncToUberEats(organizationId, externalOrderId, newStatus);
        break;
      }

      case 'rappi': {
        if (!externalOrderId) {
          console.warn(`[status-sync] Missing externalOrderId for Rappi order ${orderId}`);
          return;
        }
        await syncToRappi(organizationId, externalOrderId, newStatus, estimatedMinutes);
        break;
      }

      case 'whatsapp': {
        await syncToWhatsApp(
          organizationId,
          orderId,
          newStatus,
          customerPhone,
          estimatedMinutes,
        );
        break;
      }

      default:
        // For sources like 'web', 'qr_table', 'pos_inhouse' there is no
        // external platform to sync to.
        return;
    }
  } catch (error) {
    console.error(
      `[status-sync] Failed to sync status "${newStatus}" for order ${orderId} to ${source}:`,
      error,
    );
  }
}
