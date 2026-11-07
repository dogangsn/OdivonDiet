import { Component, inject, signal } from '@angular/core';
import { AuthStore } from '../../core/auth/auth-store';
import { environment } from '../../../environments/environment';
import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'app-settings-page',
  imports: [PageHeader],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Sistem"
        title="Ayarlar"
        description="Muayenehane bilgileri, bildirimler ve veri güvenliği."
      />
      <div class="grid gap-6 xl:grid-cols-[1fr_.8fr]">
        <section class="odv-card p-5 sm:p-6">
          <h2 class="odv-section-title mb-4">Muayenehane</h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="odv-label">Diyetisyen</span>
              <input class="odv-input" [value]="auth.session()?.name ?? ''" readonly />
            </label>
            <label class="block">
              <span class="odv-label">Muayenehane / klinik adı</span>
              <input
                class="odv-input"
                [value]="auth.session()?.practice ?? ''"
                placeholder="Örn. Sağlıklı Yaşam Kliniği"
              />
            </label>
            <label class="block">
              <span class="odv-label">Varsayılan görüşme süresi</span>
              <select class="odv-input">
                <option>30 dakika</option>
                <option selected>45 dakika</option>
                <option>60 dakika</option>
              </select>
            </label>
            <label class="block">
              <span class="odv-label">Ölçü birimi</span>
              <select class="odv-input">
                <option selected>Metrik (kg, cm)</option>
              </select>
            </label>
            <label class="block sm:col-span-2">
              <span class="odv-label">API adresi</span>
              <input class="odv-input font-mono text-xs" [value]="apiBaseUrl" readonly />
            </label>
          </div>
        </section>
        <div class="space-y-6">
          <section class="odv-card p-5 sm:p-6">
            <h2 class="odv-section-title mb-2">Bildirimler</h2>
            @for (option of notifications(); track option.key; let i = $index) {
              <label
                class="flex items-center justify-between gap-4 border-b border-slate-100 py-3.5 last:border-0 dark:border-slate-800"
              >
                <span>
                  <strong class="block text-sm">{{ option.label }}</strong>
                  <span class="text-xs text-slate-500">{{ option.note }}</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  class="size-5 accent-violet-600"
                  [checked]="option.enabled"
                  (change)="toggle(i)"
                />
              </label>
            }
          </section>
          <section class="odv-card p-5 sm:p-6">
            <div class="flex items-start gap-3">
              <span
                class="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
              >
                <span class="material-symbols-rounded">shield_lock</span>
              </span>
              <div>
                <h2 class="odv-section-title">Veri güvenliği</h2>
                <p class="mt-1 text-xs leading-5 text-slate-500">
                  Danışan sağlık verileri KVKK kapsamında özel nitelikli kişisel veridir. Her
                  danışan için açık rıza kaydı tutulur; rızası olmayan danışanlar panelde uyarı
                  olarak gösterilir.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
})
export class SettingsPage {
  readonly auth = inject(AuthStore);
  readonly apiBaseUrl = environment.apiBaseUrl;
  readonly notifications = signal([
    {
      key: 'reminder',
      label: 'Randevu hatırlatmaları',
      note: 'Görüşmeden 1 saat önce bildir',
      enabled: true,
    },
    {
      key: 'overdue',
      label: 'Geciken ölçümler',
      note: '14 günü geçen ölçümleri bildir',
      enabled: true,
    },
    {
      key: 'weekly',
      label: 'Haftalık özet',
      note: 'Her pazartesi ilerleme özeti gönder',
      enabled: false,
    },
  ]);

  toggle(index: number): void {
    this.notifications.update((list) =>
      list.map((item, i) => (i === index ? { ...item, enabled: !item.enabled } : item)),
    );
  }
}
