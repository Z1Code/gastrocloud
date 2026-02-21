import { WebpayPlus, Options, Environment } from 'transbank-sdk';

interface TransbankCredentials {
  commerceCode: string;
  apiKey: string;
}

interface CreateTransactionParams {
  credentials: TransbankCredentials;
  isSandbox: boolean;
  buyOrder: string;
  sessionId: string;
  amount: number;
  returnUrl: string;
}

function buildTransaction(credentials: TransbankCredentials, isSandbox: boolean) {
  const environment = isSandbox ? Environment.Integration : Environment.Production;
  const options = new Options(credentials.commerceCode, credentials.apiKey, environment);
  return new WebpayPlus.Transaction(options);
}

export async function createTransbankTransaction({
  credentials,
  isSandbox,
  buyOrder,
  sessionId,
  amount,
  returnUrl,
}: CreateTransactionParams): Promise<{ url: string; token: string }> {
  const tx = buildTransaction(credentials, isSandbox);
  const response = await tx.create(buyOrder, sessionId, amount, returnUrl);
  return { url: response.url, token: response.token };
}

export async function confirmTransbankTransaction(
  token: string,
  credentials: TransbankCredentials,
  isSandbox: boolean,
) {
  const tx = buildTransaction(credentials, isSandbox);
  const response = await tx.commit(token);

  return {
    vci: response.vci,
    amount: response.amount,
    status: response.status,
    buyOrder: response.buy_order,
    sessionId: response.session_id,
    cardDetail: response.card_detail,
    accountingDate: response.accounting_date,
    transactionDate: response.transaction_date,
    authorizationCode: response.authorization_code,
    paymentTypeCode: response.payment_type_code,
    responseCode: response.response_code,
    installmentsAmount: response.installments_amount,
    installmentsNumber: response.installments_number,
    balance: response.balance,
  };
}
