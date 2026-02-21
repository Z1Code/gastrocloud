import { createHmac, timingSafeEqual } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WhatsAppApiError {
  status: number;
  message: string;
  details?: unknown;
}

interface WhatsAppApiResponse {
  messaging_product: string;
  contacts?: { input: string; wa_id: string }[];
  messages?: { id: string }[];
}

interface MenuCategory {
  name: string;
  items: { id: string; title: string; description: string }[];
}

interface OrderDetails {
  orderNumber: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  estimatedMinutes: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WA_BASE_URL = 'https://graph.facebook.com/v21.0';

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
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

    const error: WhatsAppApiError = {
      status: response.status,
      message: `WhatsApp API error: ${response.status} ${response.statusText}`,
      details,
    };
    throw error;
  }

  return response.json() as Promise<T>;
}

/**
 * Format a number as Chilean Pesos with dot separator.
 * e.g. 4500 → "$4.500"
 */
export function formatCLP(amount: number): string {
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${formatted}`;
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

/**
 * Send a plain text message.
 */
export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
): Promise<WhatsAppApiResponse> {
  const url = `${WA_BASE_URL}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: text },
    }),
  });

  return handleResponse<WhatsAppApiResponse>(response);
}

/**
 * Send an interactive LIST message with the restaurant menu.
 * WhatsApp limits: max 10 sections, max 10 rows per section.
 */
export async function sendMenuList(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  menuCategories: MenuCategory[],
): Promise<WhatsAppApiResponse> {
  const url = `${WA_BASE_URL}/${phoneNumberId}/messages`;

  // Enforce WhatsApp limits
  const sections = menuCategories.slice(0, 10).map((cat) => ({
    title: cat.name.slice(0, 24),
    rows: cat.items.slice(0, 10).map((item) => ({
      id: item.id,
      title: item.title.slice(0, 24),
      description: item.description.slice(0, 72),
    })),
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: { type: 'text', text: 'Menu del Restaurante' },
        body: { text: 'Selecciona una categoria para ver los platos:' },
        footer: { text: 'Precios en pesos chilenos (CLP)' },
        action: {
          button: 'Ver Menu',
          sections,
        },
      },
    }),
  });

  return handleResponse<WhatsAppApiResponse>(response);
}

/**
 * Send an interactive BUTTON message (max 3 buttons).
 */
export async function sendReplyButtons(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string,
  buttons: { id: string; title: string }[],
): Promise<WhatsAppApiResponse> {
  const url = `${WA_BASE_URL}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.slice(0, 3).map((btn) => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title.slice(0, 20),
            },
          })),
        },
      },
    }),
  });

  return handleResponse<WhatsAppApiResponse>(response);
}

/**
 * Send a formatted order confirmation message with itemized list,
 * total in CLP, and estimated time.
 */
export async function sendOrderConfirmation(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  orderDetails: OrderDetails,
): Promise<WhatsAppApiResponse> {
  const itemLines = orderDetails.items.map(
    (item) => `  ${item.qty}x ${item.name} — ${formatCLP(item.price * item.qty)}`,
  );

  const text = [
    `Pedido confirmado! #${orderDetails.orderNumber}`,
    '',
    ...itemLines,
    '',
    `*Total: ${formatCLP(orderDetails.total)}*`,
    '',
    `Tiempo estimado: ~${orderDetails.estimatedMinutes} min`,
    '',
    'Te avisaremos cuando este listo. Gracias!',
  ].join('\n');

  return sendTextMessage(phoneNumberId, accessToken, to, text);
}

/**
 * Send an order status update message.
 */
export async function sendOrderStatusUpdate(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  orderNumber: string,
  status: string,
  estimatedMinutes?: number,
): Promise<WhatsAppApiResponse> {
  const statusMessages: Record<string, string> = {
    pending: 'recibido y pendiente de confirmacion',
    accepted: 'aceptado',
    preparing: 'siendo preparado',
    ready: 'listo para retirar',
    completed: 'completado',
    cancelled: 'cancelado',
  };

  const statusText = statusMessages[status] ?? status;
  let text = `Tu pedido #${orderNumber} esta ${statusText}.`;

  if (estimatedMinutes !== undefined && status !== 'ready' && status !== 'completed' && status !== 'cancelled') {
    text += ` Tiempo estimado: ~${estimatedMinutes} min`;
  }

  if (status === 'ready') {
    text += ' Puedes pasar a retirarlo!';
  }

  return sendTextMessage(phoneNumberId, accessToken, to, text);
}

// ---------------------------------------------------------------------------
// Mark as read
// ---------------------------------------------------------------------------

/**
 * Mark a received message as read.
 */
export async function markMessageAsRead(
  phoneNumberId: string,
  accessToken: string,
  messageId: string,
): Promise<void> {
  const url = `${WA_BASE_URL}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  });

  await handleResponse<unknown>(response);
}

// ---------------------------------------------------------------------------
// Webhook verification
// ---------------------------------------------------------------------------

/**
 * Verify a WhatsApp webhook subscription (GET request).
 * Returns the challenge string if verification passes, or null otherwise.
 */
export function verifyWhatsAppWebhook(
  token: string,
  mode: string,
  challenge: string,
  verifyToken: string,
): string | null {
  if (mode === 'subscribe' && token === verifyToken) {
    return challenge;
  }
  return null;
}

/**
 * Verify the SHA256 HMAC signature on incoming webhook payloads.
 */
export function verifyWhatsAppSignature(
  payload: string,
  signature: string,
  appSecret: string,
): boolean {
  const expectedSignature = createHmac('sha256', appSecret)
    .update(payload, 'utf8')
    .digest('hex');

  const signatureValue = signature.startsWith('sha256=')
    ? signature.slice(7)
    : signature;

  try {
    return timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signatureValue, 'hex'),
    );
  } catch {
    // If buffers have different lengths, timingSafeEqual throws
    return false;
  }
}
