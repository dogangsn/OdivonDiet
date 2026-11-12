import { Injectable, signal } from '@angular/core';
import { BillingCycle, PlanId } from '../../domain/billing';

export interface PaymentCustomer {
  readonly email: string;
  readonly name: string;
  readonly phone: string;
  readonly address: string;
}

export interface PaymentSession {
  readonly oid: string;
  readonly iframeUrl: string;
}

export interface PaymentResult {
  readonly oid: string;
  readonly paid: boolean;
  readonly plan: PlanId;
  readonly cycle: BillingCycle;
  readonly message: string | null;
}

export class PaymentError extends Error {}

const ERRORS: Record<string, string> = {
  not_configured: 'Online ödeme henüz etkin değil.',
  invalid_customer: 'Ad, telefon, adres ve e-posta bilgilerini kontrol edin.',
  invalid_plan: 'Geçersiz paket seçimi.',
  provider_error: 'Ödeme sağlayıcısına ulaşılamadı. Biraz sonra tekrar deneyin.',
};

/**
 * Talks to the Worker's PayTR endpoints (`worker/index.ts`). The merchant key never reaches
 * the browser: the Worker signs the request and returns PayTR's secure iFrame URL.
 */
@Injectable({ providedIn: 'root' })
export class PaymentGateway {
  /** `null` until checked; `false` when PayTR is not configured (or no Worker, e.g. `ng serve`). */
  readonly enabled = signal<boolean | null>(null);

  async checkEnabled(): Promise<boolean> {
    try {
      const response = await fetch('/api/billing/config', { cache: 'no-store' });
      const body = (await response.json()) as { enabled?: boolean };
      this.enabled.set(response.ok && body.enabled === true);
    } catch {
      this.enabled.set(false);
    }
    return this.enabled() === true;
  }

  async start(
    plan: PlanId,
    cycle: BillingCycle,
    customer: PaymentCustomer,
  ): Promise<PaymentSession> {
    const response = await fetch('/api/billing/paytr/payment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plan, cycle, ...customer }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as
      (PaymentSession & { error?: string; reason?: string }) | null;
    if (!response?.ok || !body?.iframeUrl) {
      const code = body?.error ?? 'provider_error';
      throw new PaymentError(
        [ERRORS[code] ?? ERRORS['provider_error'], body?.reason].filter(Boolean).join(' '),
      );
    }
    return { oid: body.oid, iframeUrl: body.iframeUrl };
  }

  async status(oid: string): Promise<PaymentResult> {
    const response = await fetch(`/api/billing/paytr/status?oid=${encodeURIComponent(oid)}`, {
      cache: 'no-store',
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as PaymentResult | null;
    if (!response?.ok || !body) throw new PaymentError('Ödeme durumu alınamadı.');
    return body;
  }
}
