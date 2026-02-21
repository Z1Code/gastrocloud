import { createHmac, timingSafeEqual } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UberEatsMenuModifierOption {
  id: string;
  title: string;
  price_info: {
    price: number;
    overrides?: Array<{
      context_type: 'ITEM';
      context_value: string;
      price: number;
    }>;
  };
  quantity_info?: {
    quantity: {
      max_permitted: number;
      default_quantity?: number;
    };
  };
  tax_info?: {
    tax_rate: number;
  };
}

export interface UberEatsModifierGroup {
  id: string;
  title: string;
  quantity_info?: {
    quantity: {
      min_permitted: number;
      max_permitted: number;
    };
  };
  modifier_options: UberEatsMenuModifierOption[];
}

export interface UberEatsMenuItem {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  price_info: {
    price: number;
    overrides?: Array<{
      context_type: 'ITEM';
      context_value: string;
      price: number;
    }>;
  };
  quantity_info?: {
    quantity: {
      max_permitted: number;
    };
  };
  tax_info?: {
    tax_rate: number;
  };
  modifier_group_ids?: {
    ids: string[];
    overrides?: Array<{
      context_type: 'ITEM';
      context_value: string;
      ids: string[];
    }>;
  };
  suspension_info?: {
    suspension: {
      suspend_until: number;
      reason: string;
    };
  };
}

export interface UberEatsCategory {
  id: string;
  title: string;
  subtitle?: string;
  entities: Array<{
    id: string;
    type: 'ITEM';
  }>;
}

export interface UberEatsMenu {
  id: string;
  title: string;
  subtitle?: string;
  service_availability: Array<{
    day_of_week: string;
    time_periods: Array<{
      start_time: string;
      end_time: string;
    }>;
  }>;
  category_ids: string[];
}

export interface UberEatsMenuPayload {
  menus: UberEatsMenu[];
  categories: UberEatsCategory[];
  items: UberEatsMenuItem[];
  modifier_groups: UberEatsModifierGroup[];
}

export interface UberEatsTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface UberEatsOrder {
  id: string;
  display_id: string;
  store: { id: string; name: string };
  eater: { first_name: string; last_name: string };
  cart: {
    items: Array<{
      id: string;
      title: string;
      quantity: number;
      price: { unit_price: { amount: number }; total_price: { amount: number } };
      selected_modifier_groups?: Array<{
        id: string;
        title: string;
        selected_items: Array<{
          id: string;
          title: string;
          quantity: number;
          price: { unit_price: { amount: number }; total_price: { amount: number } };
        }>;
      }>;
    }>;
  };
  payment: { charges: { total: { amount: number; currency_code: string } } };
  placed_at: string;
  estimated_ready_for_pickup_at?: string;
  type: 'PICK_UP' | 'DINE_IN' | 'DELIVERY_BY_UBER' | 'DELIVERY_BY_RESTAURANT';
  current_state: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SANDBOX_AUTH_URL = 'https://sandbox-login.uber.com/oauth/v2/token';
const PRODUCTION_AUTH_URL = 'https://auth.uber.com/oauth/v2/token';
const SANDBOX_API_BASE = 'https://sandbox-api.uber.com';
const PRODUCTION_API_BASE = 'https://api.uber.com';

/**
 * Returns the correct API base URL depending on the environment.
 */
export function buildUberBaseUrl(isSandbox: boolean): string {
  return isSandbox ? SANDBOX_API_BASE : PRODUCTION_API_BASE;
}

function buildAuthUrl(isSandbox: boolean): string {
  return isSandbox ? SANDBOX_AUTH_URL : PRODUCTION_AUTH_URL;
}

class UberEatsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'UberEatsApiError';
  }
}

async function handleResponse<T>(response: Response, context: string): Promise<T> {
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => null);
    }
    throw new UberEatsApiError(
      `Uber Eats API error on ${context}: ${response.status} ${response.statusText}`,
      response.status,
      body,
    );
  }

  // Some endpoints return 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/**
 * Obtains an OAuth 2.0 access token using the client_credentials grant.
 */
export async function getUberEatsToken(
  clientId: string,
  clientSecret: string,
  isSandbox: boolean,
): Promise<UberEatsTokenResponse> {
  const url = buildAuthUrl(isSandbox);

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope: 'eats.deliveries eats.order eats.store eats.store.orders.read',
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  return handleResponse<UberEatsTokenResponse>(response, 'getUberEatsToken');
}

/**
 * Uploads / replaces the full menu for a given store.
 */
export async function syncMenuToUberEats(
  storeId: string,
  token: string,
  menuData: UberEatsMenuPayload,
  isSandbox: boolean,
): Promise<void> {
  const base = buildUberBaseUrl(isSandbox);
  const url = `${base}/v2/eats/stores/${encodeURIComponent(storeId)}/menus`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(menuData),
  });

  await handleResponse<void>(response, `syncMenuToUberEats(${storeId})`);
}

/**
 * Accepts an incoming Uber Eats order via the POS integration endpoint.
 */
export async function acceptUberEatsOrder(
  orderId: string,
  token: string,
  isSandbox: boolean,
): Promise<void> {
  const base = buildUberBaseUrl(isSandbox);
  const url = `${base}/v2/eats/orders/${encodeURIComponent(orderId)}/accept_pos_order`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  await handleResponse<void>(response, `acceptUberEatsOrder(${orderId})`);
}

/**
 * Denies an incoming Uber Eats order with a reason.
 */
export async function denyUberEatsOrder(
  orderId: string,
  token: string,
  reason: string,
  isSandbox: boolean,
): Promise<void> {
  const base = buildUberBaseUrl(isSandbox);
  const url = `${base}/v2/eats/orders/${encodeURIComponent(orderId)}/deny_pos_order`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason: { explanation: reason },
    }),
  });

  await handleResponse<void>(response, `denyUberEatsOrder(${orderId})`);
}

/**
 * Retrieves the full details of a single Uber Eats order.
 */
export async function getUberEatsOrder(
  orderId: string,
  token: string,
  isSandbox: boolean,
): Promise<UberEatsOrder> {
  const base = buildUberBaseUrl(isSandbox);
  const url = `${base}/v2/eats/orders/${encodeURIComponent(orderId)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return handleResponse<UberEatsOrder>(response, `getUberEatsOrder(${orderId})`);
}

/**
 * Updates a store's online/offline status on Uber Eats.
 */
export async function updateStoreStatus(
  storeId: string,
  token: string,
  isOnline: boolean,
  isSandbox: boolean,
): Promise<void> {
  const base = buildUberBaseUrl(isSandbox);
  const url = `${base}/v2/eats/store/${encodeURIComponent(storeId)}/status`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: isOnline ? 'ONLINE' : 'OFFLINE',
    }),
  });

  await handleResponse<void>(response, `updateStoreStatus(${storeId})`);
}

// ---------------------------------------------------------------------------
// Webhook Verification
// ---------------------------------------------------------------------------

/**
 * Verifies the HMAC-SHA256 signature of an incoming Uber Eats webhook request.
 *
 * @param payload  - The raw request body as a string.
 * @param signature - The value of the `X-Uber-Signature` header.
 * @param clientSecret - The OAuth client secret used as the HMAC key.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
export function verifyUberWebhookSignature(
  payload: string,
  signature: string,
  clientSecret: string,
): boolean {
  const expected = createHmac('sha256', clientSecret)
    .update(payload)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    // Buffers with different lengths throw — that means invalid signature
    return false;
  }
}
