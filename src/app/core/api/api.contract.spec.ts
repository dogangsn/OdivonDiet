import { describe, expect, it } from 'vitest';
import { PRODUCT } from '../../domain/product-manifest';
import { REQUIRED_CLIENT_HEADERS } from './client-contract';

describe('MainAPI product contract', () => {
  it('uses a versioned product namespace', () => {
    expect(PRODUCT.apiNamespace).toMatch(/^\/api\/v1\/[a-z0-9-]+$/);
  });

  it('declares the mandatory client version headers', () => {
    expect(REQUIRED_CLIENT_HEADERS).toEqual(['X-Client-Version', 'X-Build-ID']);
  });
});
