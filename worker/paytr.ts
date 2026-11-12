/**
 * PayTR iFrame API helpers (https://dev.paytr.com). Runs only in the Cloudflare Worker,
 * because the merchant key and salt must never reach the browser.
 */
import { BillingCycle, PLANS, Plan, PlanId, yearlyTotal } from '../src/app/domain/billing';

export const PAYTR_TOKEN_URL = 'https://www.paytr.com/odeme/api/get-token';
export const PAYTR_STATUS_URL = 'https://www.paytr.com/odeme/durum-sorgu';
export const PAYTR_IFRAME_URL = 'https://www.paytr.com/odeme/guvenli/';

export interface PaytrConfig {
  readonly merchantId: string;
  readonly merchantKey: string;
  readonly merchantSalt: string;
  readonly testMode: boolean;
}

const PLAN_CODES: Record<PlanId, string> = { starter: 'S', pro: 'P', clinic: 'C' };
const CYCLE_CODES: Record<BillingCycle, string> = { monthly: 'M', yearly: 'Y' };

/** Amount charged for a package, in kuruş (PayTR expects price × 100). */
export function amountKurus(plan: Plan, cycle: BillingCycle): number {
  return Math.round((cycle === 'yearly' ? yearlyTotal(plan) : plan.monthlyPrice) * 100);
}

/** PayTR order numbers must be alphanumeric; the package is encoded so it can be checked later. */
export function newOrderId(plan: PlanId, cycle: BillingCycle, now = Date.now()): string {
  const random = new Uint8Array(5);
  crypto.getRandomValues(random);
  const suffix = [...random].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `OD${PLAN_CODES[plan]}${CYCLE_CODES[cycle]}${now.toString(36)}${suffix}`.toUpperCase();
}

export function parseOrderId(oid: string): { plan: Plan; cycle: BillingCycle } | null {
  const match = /^OD([SPC])([MY])[A-Z0-9]{6,40}$/.exec(oid);
  if (!match) return null;
  const planId = (Object.keys(PLAN_CODES) as PlanId[]).find((id) => PLAN_CODES[id] === match[1]);
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return null;
  return { plan, cycle: match[2] === 'Y' ? 'yearly' : 'monthly' };
}

export async function hmacBase64(message: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  let binary = '';
  for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64Utf8(text: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export interface TokenInput {
  readonly oid: string;
  readonly plan: Plan;
  readonly cycle: BillingCycle;
  readonly email: string;
  readonly userIp: string;
  readonly name: string;
  readonly phone: string;
  readonly address: string;
  readonly okUrl: string;
  readonly failUrl: string;
}

/** Builds the form body for PayTR's get-token call (iFrame API step 1). */
export async function tokenRequestBody(
  config: PaytrConfig,
  input: TokenInput,
): Promise<URLSearchParams> {
  const amount = String(amountKurus(input.plan, input.cycle));
  const label = `OdivonDiet ${input.plan.name} (${input.cycle === 'yearly' ? 'yıllık' : 'aylık'})`;
  const basket = base64Utf8(JSON.stringify([[label, (Number(amount) / 100).toFixed(2), 1]]));
  const noInstallment = '1';
  const maxInstallment = '0';
  const currency = 'TL';
  const testMode = config.testMode ? '1' : '0';
  const hashStr =
    config.merchantId +
    input.userIp +
    input.oid +
    input.email +
    amount +
    basket +
    noInstallment +
    maxInstallment +
    currency +
    testMode;
  const token = await hmacBase64(hashStr + config.merchantSalt, config.merchantKey);
  return new URLSearchParams({
    merchant_id: config.merchantId,
    user_ip: input.userIp,
    merchant_oid: input.oid,
    email: input.email,
    payment_amount: amount,
    paytr_token: token,
    user_basket: basket,
    debug_on: config.testMode ? '1' : '0',
    no_installment: noInstallment,
    max_installment: maxInstallment,
    user_name: input.name,
    user_address: input.address,
    user_phone: input.phone,
    merchant_ok_url: input.okUrl,
    merchant_fail_url: input.failUrl,
    timeout_limit: '30',
    currency,
    test_mode: testMode,
    lang: 'tr',
  });
}

/** Verifies the hash PayTR sends to the notification (callback) URL. */
export async function verifyCallback(
  config: PaytrConfig,
  fields: { merchant_oid: string; status: string; total_amount: string; hash: string },
): Promise<boolean> {
  const expected = await hmacBase64(
    fields.merchant_oid + config.merchantSalt + fields.status + fields.total_amount,
    config.merchantKey,
  );
  return expected === fields.hash;
}

/** Form body for PayTR's order status query. */
export async function statusRequestBody(
  config: PaytrConfig,
  oid: string,
): Promise<URLSearchParams> {
  const token = await hmacBase64(config.merchantId + oid + config.merchantSalt, config.merchantKey);
  return new URLSearchParams({
    merchant_id: config.merchantId,
    merchant_oid: oid,
    paytr_token: token,
  });
}

/** PayTR reports amounts in TL (e.g. "999.00") on status queries; accept kuruş too. */
export function amountMatches(
  reported: string | number | undefined,
  expectedKurus: number,
): boolean {
  if (reported === undefined || reported === null || reported === '') return false;
  const value = Number(String(reported).replace(',', '.'));
  if (!Number.isFinite(value)) return false;
  return Math.round(value * 100) === expectedKurus || Math.round(value) === expectedKurus;
}
