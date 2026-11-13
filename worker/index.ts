/**
 * OdivonDiet Worker: serves the Angular app from static assets and handles the PayTR
 * subscription payment endpoints under `/api/billing/`.
 *
 * Secrets (Cloudflare dashboard → Workers → odivon-diet → Settings → Variables and Secrets):
 *   PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY, PAYTR_MERCHANT_SALT, MAIN_API_WEBHOOK_SECRET
 * Optional variable: PAYTR_TEST_MODE = "1" while testing with PayTR's test cards.
 */
import { BillingCycle, PlanId, planById } from '../src/app/domain/billing';
import {
  PAYTR_IFRAME_URL,
  PAYTR_STATUS_URL,
  PAYTR_TOKEN_URL,
  PaytrConfig,
  amountKurus,
  amountMatches,
  newOrderId,
  parseOrderId,
  statusRequestBody,
  tokenRequestBody,
  verifyCallback,
} from './paytr';

interface Env {
  readonly ASSETS: { fetch(request: Request): Promise<Response> };
  readonly PAYTR_MERCHANT_ID?: string;
  readonly PAYTR_MERCHANT_KEY?: string;
  readonly PAYTR_MERCHANT_SALT?: string;
  readonly PAYTR_TEST_MODE?: string;
  readonly MAIN_API_BASE_URL?: string;
  readonly MAIN_API_WEBHOOK_SECRET?: string;
}

/** Edge-local cache of verified PayTR callbacks for instant status confirmation. */
const verifiedCallbackOrders = new Map<string, { paid: boolean; verifiedAt: string }>();

const SECURITY_HEADERS: Record<string, string> = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(self), microphone=(), geolocation=()',
};

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function config(env: Env): PaytrConfig | null {
  if (!env.PAYTR_MERCHANT_ID || !env.PAYTR_MERCHANT_KEY || !env.PAYTR_MERCHANT_SALT) return null;
  return {
    merchantId: env.PAYTR_MERCHANT_ID,
    merchantKey: env.PAYTR_MERCHANT_KEY,
    merchantSalt: env.PAYTR_MERCHANT_SALT,
    testMode: env.PAYTR_TEST_MODE === '1',
  };
}

function json(body: unknown, status = 200): Response {
  return withSecurityHeaders(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    }),
  );
}

const PLAN_IDS: readonly PlanId[] = ['starter', 'pro', 'clinic'];
const CYCLES: readonly BillingCycle[] = ['monthly', 'yearly'];

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function createPayment(request: Request, env: Env): Promise<Response> {
  const cfg = config(env);
  if (!cfg) return json({ error: 'not_configured' }, 503);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  const planId = body['plan'] as PlanId;
  const cycle = body['cycle'] as BillingCycle;
  const email = clean(body['email'], 100);
  const name = clean(body['name'], 60);
  const phone = clean(body['phone'], 20);
  const address = clean(body['address'], 400);
  if (!PLAN_IDS.includes(planId) || !CYCLES.includes(cycle)) {
    return json({ error: 'invalid_plan' }, 400);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name || phone.length < 10 || !address) {
    return json({ error: 'invalid_customer' }, 400);
  }
  const plan = planById(planId);
  const oid = newOrderId(planId, cycle);
  const origin = new URL(request.url).origin;
  const back = `${origin}/billing?oid=${oid}`;
  const form = await tokenRequestBody(cfg, {
    oid,
    plan,
    cycle,
    email,
    name,
    phone,
    address,
    userIp: request.headers.get('cf-connecting-ip') ?? '127.0.0.1',
    okUrl: `${back}&payment=ok`,
    failUrl: `${back}&payment=fail`,
  });
  const response = await fetch(PAYTR_TOKEN_URL, { method: 'POST', body: form });
  const result = (await response.json().catch(() => null)) as {
    status?: string;
    token?: string;
    reason?: string;
  } | null;
  if (result?.status !== 'success' || !result.token) {
    console.error('PayTR get-token failed', result?.reason);
    return json({ error: 'provider_error', reason: result?.reason ?? 'unknown' }, 502);
  }
  return json({
    oid,
    iframeUrl: PAYTR_IFRAME_URL + result.token,
    amount: amountKurus(plan, cycle),
  });
}

async function paymentStatus(url: URL, env: Env): Promise<Response> {
  const cfg = config(env);
  if (!cfg) return json({ error: 'not_configured' }, 503);
  const oid = url.searchParams.get('oid') ?? '';
  const order = parseOrderId(oid);
  if (!order) return json({ error: 'invalid_order' }, 400);

  const cached = verifiedCallbackOrders.get(oid);
  if (cached?.paid) {
    return json({
      oid,
      paid: true,
      plan: order.plan.id,
      cycle: order.cycle,
      message: null,
    });
  }

  const response = await fetch(PAYTR_STATUS_URL, {
    method: 'POST',
    body: await statusRequestBody(cfg, oid),
  });
  const result = (await response.json().catch(() => null)) as {
    status?: string;
    payment_amount?: string;
    err_msg?: string;
  } | null;
  const expected = amountKurus(order.plan, order.cycle);
  const paid = result?.status === 'success' && amountMatches(result.payment_amount, expected);
  return json({
    oid,
    paid,
    plan: order.plan.id,
    cycle: order.cycle,
    message: paid ? null : (result?.err_msg ?? 'Ödeme henüz onaylanmadı.'),
  });
}

/** PayTR's server-to-server notification. It must answer the plain text "OK". */
async function paymentCallback(request: Request, env: Env): Promise<Response> {
  const cfg = config(env);
  if (!cfg) return withSecurityHeaders(new Response('not configured', { status: 503 }));
  const form = await request.formData();
  const fields = {
    merchant_oid: String(form.get('merchant_oid') ?? ''),
    status: String(form.get('status') ?? ''),
    total_amount: String(form.get('total_amount') ?? ''),
    hash: String(form.get('hash') ?? ''),
  };
  if (!(await verifyCallback(cfg, fields))) {
    console.error('PayTR callback: bad hash', fields.merchant_oid);
    return withSecurityHeaders(new Response('PAYTR notification failed: bad hash', { status: 400 }));
  }

  const order = parseOrderId(fields.merchant_oid);
  const expectedKurus = order ? amountKurus(order.plan, order.cycle) : 0;
  const isPaid =
    order !== null &&
    fields.status === 'success' &&
    amountMatches(fields.total_amount, expectedKurus);

  if (order) {
    verifiedCallbackOrders.set(fields.merchant_oid, {
      paid: isPaid,
      verifiedAt: new Date().toISOString(),
    });
    const mainApiBase = env.MAIN_API_BASE_URL ?? 'https://mainapi.odivon.com/api/v1';
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (env.MAIN_API_WEBHOOK_SECRET) {
      headers['x-odivon-webhook-secret'] = env.MAIN_API_WEBHOOK_SECRET;
    }
    await fetch(`${mainApiBase}/diet/billing/paytr-webhook`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        oid: fields.merchant_oid,
        plan: order.plan.id,
        cycle: order.cycle,
        status: fields.status,
        paid: isPaid,
        totalAmount: fields.total_amount,
        verifiedAt: new Date().toISOString(),
      }),
    }).catch((err) => {
      console.warn('MainAPI webhook forward skipped/failed', err);
    });
  }

  console.log('PayTR payment', fields.merchant_oid, fields.status, fields.total_amount);
  return withSecurityHeaders(new Response('OK'));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      return json({
        status: 'ok',
        service: 'odivon-diet-worker',
        paytrConfigured: config(env) !== null,
      });
    }
    if (url.pathname === '/api/billing/paytr/payment' && request.method === 'POST') {
      return createPayment(request, env);
    }
    if (url.pathname === '/api/billing/paytr/status' && request.method === 'GET') {
      return paymentStatus(url, env);
    }
    if (url.pathname === '/api/billing/paytr/callback' && request.method === 'POST') {
      return paymentCallback(request, env);
    }
    if (url.pathname === '/api/billing/config') {
      return json({ provider: 'paytr', enabled: config(env) !== null });
    }
    if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
    const assetResponse = await env.ASSETS.fetch(request);
    return withSecurityHeaders(assetResponse);
  },
};
