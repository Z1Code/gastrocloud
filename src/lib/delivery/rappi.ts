import { createHmac, timingSafeEqual } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RappiTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface RappiMenuItemModifierGroup {
  id: string;
  name: string;
  min_quantity: number;
  max_quantity: number;
  modifiers: {
    id: string;
    name: string;
    price: number;
    is_available: boolean;
  }[];
}

export interface RappiMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
  modifier_groups?: RappiMenuItemModifierGroup[];
}

export interface RappiMenuCategory {
  id: string;
  name: string;
  items: RappiMenuItem[];
}

export interface RappiMenuPayload {
  store_id: string;
  categories: RappiMenuCategory[];
}

interface RappiApiError {
  status: number;
  message: string;
  details?: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RAPPI_BASE_DEV = 'https://api.dev.rappi.com/restaurants';
const RAPPI_BASE_PROD = 'https://api.rappi.com/restaurants';

export function buildRappiBaseUrl(isSandbox: boolean): string {
  return isSandbox ? RAPPI_BASE_DEV : RAPPI_BASE_PROD;
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = await response.text().catch(() => null);
    }

    const error: RappiApiError = {
      status: response.status,
      message: `Rappi API error: ${response.status} ${response.statusText}`,
      details,
    };
    throw error;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function getRappiToken(
  clientId: string,
  clientSecret: string,
  isSandbox: boolean,
): Promise<RappiTokenResponse> {
  const baseUrl = buildRappiBaseUrl(isSandbox);
  const url = `${baseUrl}/auth/v1/token/login/integrations`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  return handleResponse<RappiTokenResponse>(response);
}

// ---------------------------------------------------------------------------
// Menu sync
// ---------------------------------------------------------------------------

export async function syncMenuToRappi(
  token: string,
  menuData: RappiMenuPayload,
  isSandbox: boolean,
): Promise<void> {
  const baseUrl = buildRappiBaseUrl(isSandbox);
  const url = `${baseUrl}/menu`;

  const response = await fetch(url, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(menuData),
  });

  await handleResponse<unknown>(response);
}

// ---------------------------------------------------------------------------
// Order management
// ---------------------------------------------------------------------------

export async function acceptRappiOrder(
  orderId: string,
  cookingTime: number,
  token: string,
  isSandbox: boolean,
): Promise<void> {
  const baseUrl = buildRappiBaseUrl(isSandbox);
  const url = `${baseUrl}/orders/${orderId}/take/${cookingTime}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(token),
  });

  await handleResponse<unknown>(response);
}

export async function rejectRappiOrder(
  orderId: string,
  token: string,
  isSandbox: boolean,
): Promise<void> {
  const baseUrl = buildRappiBaseUrl(isSandbox);
  const url = `${baseUrl}/orders/${orderId}/reject`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(token),
  });

  await handleResponse<unknown>(response);
}

export async function markRappiOrderReady(
  orderId: string,
  token: string,
  isSandbox: boolean,
): Promise<void> {
  const baseUrl = buildRappiBaseUrl(isSandbox);
  const url = `${baseUrl}/orders/${orderId}/ready-for-pickup`;

  const response = await fetch(url, {
    method: 'POST',
    headers: authHeaders(token),
  });

  await handleResponse<unknown>(response);
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

export function verifyRappiWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const computed = createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    // If buffers have different lengths, timingSafeEqual throws
    return false;
  }
}
