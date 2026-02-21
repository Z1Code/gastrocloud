import { MercadoPagoConfig, Preference } from 'mercadopago';

export function createMercadoPagoClient(accessToken: string) {
  return new MercadoPagoConfig({ accessToken });
}

interface CheckoutItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

interface CreateCheckoutPreferenceParams {
  accessToken: string;
  items: CheckoutItem[];
  orderId: string;
  backUrls: {
    success: string;
    failure: string;
    pending: string;
  };
  isSandbox?: boolean;
}

export async function createCheckoutPreference({
  accessToken,
  items,
  orderId,
  backUrls,
}: CreateCheckoutPreferenceParams): Promise<string> {
  const client = createMercadoPagoClient(accessToken);
  const preference = new Preference(client);

  const response = await preference.create({
    body: {
      items: items.map((item, idx) => ({
        id: `item-${idx}`,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: item.currency_id || 'CLP',
      })),
      back_urls: {
        success: backUrls.success,
        failure: backUrls.failure,
        pending: backUrls.pending,
      },
      external_reference: orderId,
      auto_return: 'approved',
    },
  });

  // Return the init_point URL for redirect
  return response.init_point || response.sandbox_init_point || '';
}
