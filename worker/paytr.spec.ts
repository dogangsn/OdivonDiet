import { describe, expect, it } from 'vitest';
import { planById } from '../src/app/domain/billing';
import {
  amountKurus,
  amountMatches,
  hmacBase64,
  newOrderId,
  parseOrderId,
  tokenRequestBody,
  verifyCallback,
} from './paytr';

const cfg = { merchantId: '123456', merchantKey: 'KEY', merchantSalt: 'SALT', testMode: true };

describe('PayTR helpers', () => {
  it('computes HMAC-SHA256 as base64', async () => {
    // echo -n "message" | openssl dgst -sha256 -hmac "key" -binary | base64
    expect(await hmacBase64('message', 'key')).toBe('bp7ym3X//Ft6uuUn1Y/a2y/kLnIZARl2kXNDBl9Y7Uo=');
  });

  it('encodes the package in the order id', () => {
    const oid = newOrderId('clinic', 'yearly');
    expect(oid).toMatch(/^[A-Z0-9]+$/);
    expect(oid.length).toBeLessThanOrEqual(64);
    const parsed = parseOrderId(oid)!;
    expect(parsed.plan.id).toBe('clinic');
    expect(parsed.cycle).toBe('yearly');
    expect(parseOrderId('ODXM123456')).toBeNull();
  });

  it('charges the server-side price', () => {
    expect(amountKurus(planById('pro'), 'monthly')).toBe(99_900);
    expect(amountKurus(planById('pro'), 'yearly')).toBe(833 * 12 * 100);
    expect(amountMatches('999.00', 99_900)).toBe(true);
    expect(amountMatches('99900', 99_900)).toBe(true);
    expect(amountMatches('1.00', 99_900)).toBe(false);
  });

  it('signs the token request with the documented field order', async () => {
    const body = await tokenRequestBody(cfg, {
      oid: 'ODPMABC123',
      plan: planById('pro'),
      cycle: 'monthly',
      email: 'a@b.co',
      userIp: '1.2.3.4',
      name: 'Ayşe',
      phone: '05550000000',
      address: 'İstanbul',
      okUrl: 'https://x/ok',
      failUrl: 'https://x/fail',
    });
    const basket = body.get('user_basket')!;
    const expected = await hmacBase64(
      '123456' +
        '1.2.3.4' +
        'ODPMABC123' +
        'a@b.co' +
        '99900' +
        basket +
        '1' +
        '0' +
        'TL' +
        '1' +
        'SALT',
      'KEY',
    );
    expect(body.get('paytr_token')).toBe(expected);
    expect(body.get('payment_amount')).toBe('99900');
  });

  it('verifies callback hashes', async () => {
    const hash = await hmacBase64('ODPMABC123' + 'SALT' + 'success' + '99900', 'KEY');
    const fields = { merchant_oid: 'ODPMABC123', status: 'success', total_amount: '99900', hash };
    expect(await verifyCallback(cfg, fields)).toBe(true);
    expect(await verifyCallback(cfg, { ...fields, total_amount: '100' })).toBe(false);
  });
});
