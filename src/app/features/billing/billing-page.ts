import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from '../../core/auth/auth-store';
import { PaymentError, PaymentGateway } from '../../core/billing/payment-gateway';
import { SubscriptionStore } from '../../core/billing/subscription-store';
import { DietStore } from '../../core/data/diet-store';
import { Notify } from '../../core/notify/notify';
import {
  BillingCycle,
  PLANS,
  Plan,
  TRIAL_DAYS,
  formatTry,
  planById,
  yearlyTotal,
} from '../../domain/billing';
import { PageHeader } from '../../shared/ui/page-header';

interface Checkout {
  readonly plan: Plan;
  readonly cycle: BillingCycle;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly address: string;
  readonly busy: boolean;
  readonly error: string | null;
  readonly iframeUrl: SafeResourceUrl | null;
}

@Component({
  selector: 'app-billing-page',
  imports: [PageHeader, DatePipe, DecimalPipe],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Sistem"
        title="Abonelik ve paketler"
        description="Paketinizi seçin, deneme sürenizi ve kullanımınızı takip edin."
      />

      @if (subs.isSample()) {
        <section
          class="odv-card flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900 dark:bg-amber-950/30"
        >
          <div class="flex items-start gap-3">
            <span class="material-symbols-rounded text-amber-600" aria-hidden="true">science</span>
            <div class="text-sm">
              <strong class="block">Demo hesabındasınız</strong>
              <span class="text-slate-600 dark:text-slate-300"
                >Ücretsiz hesap açtığınızda boş bir muayenehaneyle başlarsınız ve {{ trialDays }} gün
                boyunca Profesyonel paketin tamamını denersiniz.</span
              >
            </div>
          </div>
          <button
            type="button"
            class="odv-btn-soft !min-h-9 text-xs"
            (click)="runScenario('trial_14')"
          >
            Gün Sayacı & Kilitleme Simülatörünü Başlat
          </button>
        </section>
      }

      <!-- CANLI ABONELİK, GÜN SAYACI & EKRAN KİLİDİ DOĞRULAMA PANELİ -->
      <section
        class="odv-card border-violet-200/80 p-4 sm:p-5 dark:border-violet-900/50"
        aria-label="Abonelik gün sayacı ve ekran kilitleme simülatörü"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span class="odv-eyebrow text-violet-600">Canlı Test & Doğrulama</span>
            <h2 class="text-sm font-extrabold">
              Gün Sayma, Süre Bitimi Ekran Kilitleme ve Paket Limitlerini Canlı Test Edin
            </h2>
            <p class="text-xs text-slate-500">
              Aşağıdaki senaryolardan birine tıkladığınızda sol menüdeki gün sayacı, kilit ikonları ve
              ekran engellemeleri anında devreye girer.
            </p>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              type="button"
              class="rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100 dark:bg-violet-950/60 dark:text-violet-200"
              (click)="runScenario('trial_14')"
            >
              14 Gün Deneme
            </button>
            <button
              type="button"
              class="rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-200"
              (click)="runScenario('trial_2')"
            >
              Son 2 Gün Uyarısı
            </button>
            <button
              type="button"
              class="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-200"
              (click)="runScenario('expired')"
            >
              Süre Bitti (0 Gün · Ekranları Kilitle)
            </button>
            <button
              type="button"
              class="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              (click)="runScenario('starter_active')"
            >
              Başlangıç Paketi (Portal Kilitli · 1 Koltuk)
            </button>
            <button
              type="button"
              class="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-200"
              (click)="runScenario('clinic_active')"
            >
              Klinik Paket (5 Koltuk · Sınırsız)
            </button>
            @if (subs.sandboxOverride()) {
              <button
                type="button"
                class="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:border-slate-700"
                (click)="runScenario('reset')"
              >
                Sıfırla
              </button>
            }
          </div>
        </div>
      </section>

      @if (subs.state(); as s) {
        @if (s.expired) {
          <section
            role="alert"
            class="odv-card flex flex-col gap-3 border-rose-200 bg-rose-50/70 p-5 dark:border-rose-900 dark:bg-rose-950/30 sm:flex-row sm:items-center"
          >
            <span
              class="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-200"
            >
              <span class="material-symbols-rounded" aria-hidden="true">lock_clock</span>
            </span>
            <div class="flex-1 text-sm">
              <strong class="block text-base">
                {{
                  s.subscription.status === 'active'
                    ? 'Abonelik süreniz doldu'
                    : 'Deneme süreniz doldu'
                }}
              </strong>
              <span class="text-slate-600 dark:text-slate-300"
                >Verileriniz güvende. Panele devam etmek için aşağıdan bir paket seçin.</span
              >
            </div>
          </section>
        }

        <section class="odv-card grid gap-5 p-5 sm:p-6 md:grid-cols-[1.3fr_1fr]">
          <div>
            <p class="odv-label !mb-1">Mevcut durum</p>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-xl font-extrabold tracking-tight">{{ s.plan.name }}</h2>
              <span
                class="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                [class]="statusClass()"
                >{{ statusLabel() }}</span
              >
            </div>
            @if (s.trialing) {
              <p class="mt-1 text-sm text-slate-500">
                Deneme
                <strong class="text-slate-900 dark:text-white">{{
                  s.subscription.trialEndsAt | date: 'd MMMM y'
                }}</strong>
                tarihinde bitiyor · <strong class="tabular">{{ s.daysLeft }} gün</strong> kaldı
              </p>
              <div
                class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                role="progressbar"
                aria-label="Deneme süresi"
                [attr.aria-valuenow]="s.trialUsedPct | number: '1.0-0'"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  class="h-full rounded-full"
                  [class]="s.daysLeft <= 3 ? 'bg-amber-500' : 'bg-violet-600'"
                  [style.width.%]="s.trialUsedPct"
                ></div>
              </div>
            } @else if (s.status === 'active') {
              <p class="mt-1 text-sm text-slate-500">
                Sonraki yenileme
                {{ s.subscription.currentPeriodEnd | date: 'd MMMM y' }}
              </p>
            }
            @if (s.subscription.requestedPlan; as requested) {
              <div
                class="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-violet-50 px-3 py-2.5 text-xs text-violet-800 dark:bg-violet-500/15 dark:text-violet-200"
              >
                <span class="material-symbols-rounded !text-base" aria-hidden="true">schedule</span>
                <span class="flex-1"
                  ><strong>{{ requestedName() }}</strong> ({{
                    s.subscription.requestedCycle === 'yearly' ? 'yıllık' : 'aylık'
                  }}) talebiniz alındı. Ödeme bağlantısı e-posta ile gönderilecek.</span
                >
                <button type="button" class="font-bold underline" (click)="subs.cancelRequest()">
                  Vazgeç
                </button>
              </div>
            }
          </div>
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <dt class="text-xs text-slate-500">Aktif danışan</dt>
              <dd class="tabular mt-1 text-lg font-extrabold">
                {{ activeClients()
                }}<span class="text-sm font-semibold text-slate-400">
                  / {{ s.plan.clientLimit ?? '∞' }}</span
                >
              </dd>
            </div>
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <dt class="text-xs text-slate-500">Diyetisyen / ekip hesabı</dt>
              <dd class="tabular mt-1 text-lg font-extrabold">
                {{ auth.activeStaffCount() }}<span class="text-sm font-semibold text-slate-400"> / {{ s.plan.seats }}</span>
              </dd>
            </div>
          </dl>
        </section>
      }

      <section aria-labelledby="plans-title" class="space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="plans-title" class="odv-section-title">Paketler</h2>
          <div
            class="inline-flex self-start rounded-xl border border-slate-200 bg-white p-1 text-xs font-bold sm:self-auto dark:border-slate-700 dark:bg-slate-900"
            role="radiogroup"
            aria-label="Ödeme dönemi"
          >
            @for (option of cycles; track option.id) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="cycle() === option.id"
                class="rounded-lg px-3 py-1.5 transition"
                [class]="
                  cycle() === option.id
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                "
                (click)="cycle.set(option.id)"
              >
                {{ option.label }}
                @if (option.id === 'yearly') {
                  <span
                    class="ms-1 rounded-full px-1.5 py-0.5 text-[10px]"
                    [class]="
                      cycle() === 'yearly'
                        ? 'bg-white/20'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    "
                    >2 ay bedava</span
                  >
                }
              </button>
            }
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
          @for (plan of plans; track plan.id) {
            <article
              class="odv-card relative flex flex-col p-5 sm:p-6"
              [class.ring-2]="plan.highlight"
              [class.ring-violet-500]="plan.highlight"
            >
              @if (plan.highlight) {
                <span
                  class="absolute -top-3 start-5 rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-bold text-white shadow"
                  >En çok tercih edilen</span
                >
              }
              <h3 class="text-lg font-extrabold">{{ plan.name }}</h3>
              <p class="mt-1 min-h-10 text-xs text-slate-500">{{ plan.tagline }}</p>
              <p class="mt-4 flex items-end gap-1">
                <span class="tabular text-3xl font-extrabold tracking-tight">{{
                  price(plan)
                }}</span>
                <span class="pb-1 text-xs font-semibold text-slate-500">/ ay</span>
              </p>
              <p class="mt-1 h-4 text-[11px] text-slate-500">
                @if (cycle() === 'yearly') {
                  Yıllık {{ yearly(plan) }} olarak faturalanır
                } @else {
                  KDV dahil, aylık faturalanır
                }
              </p>
              <ul class="mt-5 flex-1 space-y-2.5 text-sm">
                @for (feature of plan.features; track feature) {
                  <li class="flex gap-2">
                    <span
                      class="material-symbols-rounded !text-lg text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                      >check_circle</span
                    >{{ feature }}
                  </li>
                }
              </ul>
              <button
                type="button"
                class="mt-6 w-full justify-center"
                [class]="plan.highlight ? 'odv-btn-primary' : 'odv-btn-secondary'"
                [disabled]="subs.isSample() || isRequested(plan)"
                (click)="choose(plan)"
              >
                {{ buttonLabel(plan) }}
              </button>
            </article>
          }
        </div>
        <p class="text-center text-xs text-slate-500">
          Tüm paketlerde KVKK uyumlu veri saklama ve SSL bulunur. İstediğiniz zaman paket
          değiştirebilir ya da iptal edebilirsiniz.
          @if (payments.enabled()) {
            <span class="mt-1 flex items-center justify-center gap-1">
              <span class="material-symbols-rounded !text-sm" aria-hidden="true">lock</span>Ödemeler
              PayTR güvenli ödeme altyapısıyla alınır; kart bilgileriniz bize ulaşmaz.
            </span>
          }
        </p>
      </section>
    </div>

    @if (checkout(); as c) {
      <div
        class="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-title"
          class="odv-card w-full max-w-lg overflow-hidden"
        >
          <header
            class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800"
          >
            <div>
              <h2 id="checkout-title" class="odv-section-title">
                {{ c.plan.name }} · {{ c.cycle === 'yearly' ? 'Yıllık' : 'Aylık' }}
              </h2>
              <p class="tabular text-xs text-slate-500">
                Ödenecek tutar
                <strong class="text-slate-900 dark:text-white">{{ total(c.plan, c.cycle) }}</strong>
                (KDV dahil)
              </p>
            </div>
            <button type="button" class="odv-icon-btn" aria-label="Kapat" (click)="closeCheckout()">
              <span class="material-symbols-rounded">close</span>
            </button>
          </header>

          @if (c.iframeUrl) {
            <iframe
              [src]="c.iframeUrl"
              title="PayTR güvenli ödeme"
              class="block h-[640px] max-h-[75vh] w-full border-0 bg-white"
              allow="payment"
            ></iframe>
          } @else {
            <form class="space-y-4 p-5" (submit)="pay($event)">
              <p class="text-xs text-slate-500">
                Fatura bilgileriniz PayTR'ye iletilir. Kart bilgilerini bir sonraki adımda PayTR'nin
                güvenli sayfasına gireceksiniz.
              </p>
              <label class="block">
                <span class="odv-label">Ad soyad / firma</span>
                <input
                  class="odv-input"
                  name="name"
                  autocomplete="name"
                  required
                  [value]="c.name"
                  (input)="setField('name', $event)"
                />
              </label>
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="block">
                  <span class="odv-label">E-posta</span>
                  <input
                    class="odv-input"
                    type="email"
                    name="email"
                    autocomplete="email"
                    required
                    [value]="c.email"
                    (input)="setField('email', $event)"
                  />
                </label>
                <label class="block">
                  <span class="odv-label">Telefon</span>
                  <input
                    class="odv-input"
                    type="tel"
                    name="phone"
                    autocomplete="tel"
                    required
                    placeholder="05xx xxx xx xx"
                    [value]="c.phone"
                    (input)="setField('phone', $event)"
                  />
                </label>
              </div>
              <label class="block">
                <span class="odv-label">Fatura adresi</span>
                <textarea
                  class="odv-input min-h-20"
                  name="address"
                  autocomplete="street-address"
                  required
                  [value]="c.address"
                  (input)="setField('address', $event)"
                ></textarea>
              </label>
              @if (c.error) {
                <p
                  role="alert"
                  class="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                >
                  {{ c.error }}
                </p>
              }
              <button
                type="submit"
                class="odv-btn-primary w-full justify-center"
                [disabled]="c.busy"
              >
                <span class="material-symbols-rounded !text-lg">{{
                  c.busy ? 'progress_activity' : 'lock'
                }}</span>
                {{ c.busy ? 'Hazırlanıyor…' : 'Güvenli ödemeye geç' }}
              </button>
            </form>
          }
        </section>
      </div>
    }
  `,
})
export class BillingPage {
  readonly subs = inject(SubscriptionStore);
  private readonly diet = inject(DietStore);
  private readonly notify = inject(Notify);
  readonly payments = inject(PaymentGateway);
  readonly auth = inject(AuthStore);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly checkout = signal<Checkout | null>(null);
  readonly plans = PLANS;
  readonly trialDays = TRIAL_DAYS;
  readonly cycle = signal<BillingCycle>('monthly');
  readonly cycles: { id: BillingCycle; label: string }[] = [
    { id: 'monthly', label: 'Aylık' },
    { id: 'yearly', label: 'Yıllık' },
  ];

  readonly activeClients = computed(() => this.diet.activeClients().length);
  readonly requestedName = computed(() => {
    const id = this.subs.state()?.subscription.requestedPlan;
    return id ? planById(id).name : '';
  });
  readonly statusLabel = computed(() => {
    const s = this.subs.state();
    if (!s) return '';
    if (s.trialing) return `${TRIAL_DAYS} günlük deneme`;
    if (s.status === 'active') return 'Aktif';
    return 'Süresi doldu';
  });
  readonly statusClass = computed(() => {
    const s = this.subs.state();
    if (s?.status === 'active')
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    if (s?.expired) return 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
    return 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200';
  });

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const oid = params.get('oid');
    const result = params.get('payment');
    // PayTR opens the return URL inside its iFrame; continue in the main window.
    if (oid && result && window.top && window.top !== window.self) {
      window.top.location.href = window.location.href;
      return;
    }
    void this.payments.checkEnabled();
    if (oid && result) void this.handleReturn(oid, result);
  }

  total(plan: Plan, cycle: BillingCycle): string {
    return formatTry(cycle === 'yearly' ? yearlyTotal(plan) : plan.monthlyPrice);
  }

  setField(field: 'name' | 'email' | 'phone' | 'address', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.checkout.update((c) => (c ? { ...c, [field]: value, error: null } : c));
  }

  closeCheckout(): void {
    this.checkout.set(null);
  }

  async pay(event: Event): Promise<void> {
    event.preventDefault();
    const c = this.checkout();
    if (!c || c.busy) return;
    const phone = c.phone.replace(/[^\d+]/g, '');
    if (!c.name.trim() || !c.email.includes('@') || phone.length < 10 || !c.address.trim()) {
      this.checkout.set({ ...c, error: 'Tüm alanları doldurun; telefon en az 10 haneli olmalı.' });
      return;
    }
    this.checkout.set({ ...c, busy: true, error: null });
    try {
      const session = await this.payments.start(c.plan.id, c.cycle, {
        name: c.name.trim(),
        email: c.email.trim(),
        phone,
        address: c.address.trim(),
      });
      this.checkout.update((x) =>
        x
          ? {
              ...x,
              busy: false,
              iframeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(session.iframeUrl),
            }
          : x,
      );
    } catch (error) {
      const message = error instanceof PaymentError ? error.message : 'Ödeme başlatılamadı.';
      this.checkout.update((x) => (x ? { ...x, busy: false, error: message } : x));
    }
  }

  private async handleReturn(oid: string, result: string): Promise<void> {
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
    if (result !== 'ok') {
      this.notify.error(
        'Ödeme tamamlanmadı',
        'Kartınızdan çekim yapılmadı. Tekrar deneyebilirsiniz.',
      );
      return;
    }
    // PayTR may confirm a few seconds after the redirect.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const status = await this.payments.status(oid);
        if (status.paid) {
          this.subs.activatePaid(status.plan, status.cycle, oid);
          this.notify.success(
            'Ödemeniz alındı',
            `${planById(status.plan).name} paketiniz aktifleştirildi. Teşekkürler!`,
          );
          return;
        }
      } catch {
        // retry below
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    this.notify.warning(
      'Ödeme onayı bekleniyor',
      'Onay gelince paketiniz aktifleşecek. Sorun olursa destek ekibimize yazın.',
    );
  }

  price(plan: Plan): string {
    return formatTry(this.cycle() === 'yearly' ? plan.yearlyMonthlyPrice : plan.monthlyPrice);
  }

  yearly(plan: Plan): string {
    return formatTry(yearlyTotal(plan));
  }

  isRequested(plan: Plan): boolean {
    const sub = this.subs.state()?.subscription;
    return sub?.requestedPlan === plan.id && sub.requestedCycle === this.cycle();
  }

  buttonLabel(plan: Plan): string {
    const s = this.subs.state();
    if (this.isRequested(plan)) return 'Talep alındı';
    if (s?.status === 'active' && s.plan.id === plan.id) return 'Süreyi uzat';
    return s?.trialing && s.plan.id === plan.id ? 'Bu paketle devam et' : 'Bu paketi seç';
  }

  async choose(plan: Plan): Promise<void> {
    const limit = plan.clientLimit;
    if (limit !== null && this.activeClients() > limit) {
      this.notify.warning(
        `${plan.name} paketi ${limit} aktif danışana kadar`,
        'Bu paketi seçmeden önce bazı danışanları arşivleyin ya da daha büyük bir paket seçin.',
      );
      return;
    }
    if (this.payments.enabled() ?? (await this.payments.checkEnabled())) {
      const session = this.auth.session();
      this.checkout.set({
        plan,
        cycle: this.cycle(),
        name: session?.practice || session?.name || '',
        email: session?.email ?? '',
        phone: '',
        address: '',
        busy: false,
        error: null,
        iframeUrl: null,
      });
      return;
    }
    const cycleLabel = this.cycle() === 'yearly' ? 'yıllık' : 'aylık';
    const ok = await this.notify.confirm({
      title: `${plan.name} paketi (${cycleLabel})`,
      text: `${this.price(plan)} / ay. Online ödeme çok yakında; talebinizi kaydedip ödeme bağlantısını e-posta adresinize göndereceğiz.`,
      confirmText: 'Talep oluştur',
      icon: 'workspace_premium',
    });
    if (!ok) return;
    this.subs.requestPlan(plan.id, this.cycle());
    this.notify.success('Paket talebiniz alındı', 'Ödeme bağlantısı e-posta ile gönderilecek.');
  }

  runScenario(
    scenario: 'trial_14' | 'trial_2' | 'expired' | 'starter_active' | 'clinic_active' | 'reset',
  ): void {
    this.subs.simulateScenario(scenario);
    if (scenario === 'expired') {
      this.notify.warning(
        'Süre sonu ekran kilidi aktif (0 gün kaldı)',
        'Abonelik ve Ayarlar dışındaki tüm ekranlar ve hızlı işlemler kilitlendi.',
      );
    } else if (scenario === 'starter_active') {
      this.notify.info(
        'Başlangıç Paketi simülasyonu aktif',
        'Danışan Portalı (/messages, /requests, /tasks) kilitlendi; kullanıcı koltuk limiti 1 olarak ayarlandı.',
      );
    } else if (scenario === 'clinic_active') {
      this.notify.success(
        'Klinik Paket simülasyonu aktif',
        '5 kullanıcı koltuğu, sınırsız danışan ve tüm portal ekranları açıldı.',
      );
    } else if (scenario === 'trial_2') {
      this.notify.warning('Son 2 gün deneme uyarısı aktif', 'Sayaç turuncu uyarı moduna geçti.');
    } else if (scenario === 'trial_14') {
      this.notify.info('14 günlük deneme sayacı başlatıldı', '');
    }
  }
}
