import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AuthStore } from '../../core/auth/auth-store';
import { DietStore } from '../../core/data/diet-store';
import { Notify } from '../../core/notify/notify';
import { round1 } from '../../domain/diet-calc';
import { PROGRAM_LABELS } from '../../domain/diet.models';
import { Avatar } from '../../shared/ui/avatar';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';
import { ProgressBar } from '../../shared/ui/progress-bar';
import { QuickActions } from '../forms/quick-actions';

@Component({
  selector: 'app-reports-page',
  imports: [PageHeader, KpiCard, Avatar, ProgressBar, DecimalPipe],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Analiz & Klinik Başarı Vitrini"
        title="İlerleme raporları ve başarı kartları"
        description="Danışanlarınızın başlangıçtan bugüne değişimi, plana uyumu ve sosyal medya paylaşımına hazır KVKK uyumlu başarı kartları."
      >
        <button actions type="button" class="odv-btn-secondary" (click)="print()">
          <span class="material-symbols-rounded !text-lg">print</span>Yazdır / PDF
        </button>
      </app-page-header>

      <section class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Rapor özeti">
        <app-kpi-card
          label="Toplam değişim"
          [value]="totals().change"
          unit="kg"
          icon="scale"
          tone="positive"
          hint="Aktif danışanların toplamı"
        />
        <app-kpi-card
          label="Ort. hedef ilerlemesi"
          [value]="'%' + totals().progress"
          icon="flag"
          tone="primary"
        />
        <app-kpi-card
          label="Ort. plan uyumu"
          [value]="totals().adherence"
          unit="/ 5"
          icon="star"
          tone="warning"
        />
        <app-kpi-card
          label="Tamamlanan görüşme"
          [value]="totals().done"
          icon="task_alt"
          tone="info"
        />
      </section>

      <!-- Sosyal Medya / Instagram Klinik Başarı Hikayesi (Before/After) Kart Üretici -->
      @if (selectedStoryRow(); as sr) {
        <section
          class="odv-card grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.1fr_1fr]"
          aria-label="Klinik başarı hikayesi kart stüdyosu"
        >
          <div class="space-y-4">
            <div>
              <span class="odv-eyebrow">Yeni Danışan Kazanım & Prestij Aracı</span>
              <h2 class="odv-section-title">
                Instagram / Sosyal Medya “Before & After” Başarı Kartı Üretici
              </h2>
              <p class="mt-1 text-xs text-slate-500">
                Danışanınızın başarısını KVKK uyumlu (anonimleştirilmiş baş harflerle) şık bir
                klinik kartına dönüştürün ve paylaşım metnini tek tıkla kopyalayın.
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block">
                <span class="odv-label">Danışan Seçin</span>
                <select
                  class="odv-input text-xs"
                  [value]="selectedClientId()"
                  (change)="selectedClientId.set($any($event.target).value)"
                >
                  @for (row of rows(); track row.v.client.id) {
                    <option [value]="row.v.client.id">
                      {{ row.v.fullName }} ({{ row.v.changeKg > 0 ? '+' : '' }}{{ row.v.changeKg }}
                      kg · %{{ row.v.progress }})
                    </option>
                  }
                </select>
              </label>

              <label class="block">
                <span class="odv-label">Kart Görsel Teması</span>
                <select
                  class="odv-input text-xs"
                  [value]="storyTheme()"
                  (change)="storyTheme.set($any($event.target).value)"
                >
                  <option value="violet">Mor Klinik Premium</option>
                  <option value="emerald">Zümrüt Metabolik Sağlık</option>
                  <option value="dark">Gece Karbon</option>
                </select>
              </label>
            </div>

            <label class="inline-flex cursor-pointer items-center gap-2.5 text-xs font-semibold">
              <input
                type="checkbox"
                class="size-4 accent-violet-600"
                [checked]="maskName()"
                (change)="maskName.set(!maskName())"
              />
              KVKK Uyumlu İsim Maskeleme ({{ maskedClientName(sr.v.fullName) }} olarak göster)
            </label>

            <div class="flex flex-wrap gap-2 pt-1">
              <button type="button" class="odv-btn-primary text-xs" (click)="copyStoryCaption(sr)">
                <span class="material-symbols-rounded !text-base" aria-hidden="true"
                  >content_copy</span
                >
                Instagram / WhatsApp Başarı Metnini Kopyala
              </button>
              <button type="button" class="odv-btn-soft text-xs" (click)="print()">
                <span class="material-symbols-rounded !text-base" aria-hidden="true">download</span>
                Kartı PDF / Görsel Yazdır
              </button>
            </div>
          </div>

          <!-- Canlı Önizleme Kartı -->
          <div
            class="flex flex-col justify-between rounded-2xl p-6 text-white shadow-xl"
            [class]="storyCardClass()"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold backdrop-blur-xs">
                {{ auth.session()?.practice || 'OdivonDiet Klinik Beslenme' }}
              </span>
              <span class="text-xs font-bold opacity-85">
                {{ programLabels[sr.v.client.program] }}
              </span>
            </div>

            <div class="my-5">
              <p class="text-xs font-semibold uppercase tracking-wider opacity-80">
                Danışan Başarı Dönüşümü · {{ sr.v.age }} Yaş
              </p>
              <h3 class="mt-1 text-2xl font-extrabold tracking-tight">
                {{ maskName() ? maskedClientName(sr.v.fullName) : sr.v.fullName }}
              </h3>

              <div class="mt-4 grid grid-cols-3 gap-2.5 text-center">
                <div class="rounded-xl bg-white/10 p-3 backdrop-blur-xs">
                  <span class="block text-[10px] font-bold uppercase opacity-75">Başlangıç</span>
                  <strong class="tabular text-lg font-extrabold"
                    >{{ sr.v.client.startWeightKg | number: '1.0-1' }} kg</strong
                  >
                </div>
                <div class="rounded-xl bg-white/15 p-3 ring-1 ring-white/30 backdrop-blur-xs">
                  <span class="block text-[10px] font-bold uppercase opacity-90">Güncel</span>
                  <strong class="tabular text-lg font-extrabold"
                    >{{ sr.v.currentWeightKg | number: '1.0-1' }} kg</strong
                  >
                </div>
                <div class="rounded-xl bg-white/20 p-3 backdrop-blur-xs">
                  <span class="block text-[10px] font-bold uppercase opacity-90">Net Değişim</span>
                  <strong class="tabular text-lg font-extrabold">
                    {{ sr.v.changeKg > 0 ? '+' : '' }}{{ sr.v.changeKg | number: '1.0-1' }} kg
                  </strong>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between border-t border-white/15 pt-3 text-xs">
              <span>Hedef İlerlemesi: <strong>%{{ sr.v.progress }}</strong></span>
              <span>Tamamlanan Seans: <strong>{{ sr.done }} Görüşme</strong></span>
              <span>{{ auth.session()?.name || 'Uzman Diyetisyen' }}</span>
            </div>
          </div>
        </section>
      }

      <section class="odv-card overflow-hidden">
        <header class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 class="odv-section-title">Danışan bazında sonuçlar</h2>
        </header>
        <div class="custom-scroll overflow-x-auto">
          <table class="w-full min-w-[860px]">
            <thead>
              <tr>
                <th class="odv-th">Danışan</th>
                <th class="odv-th">Program</th>
                <th class="odv-th">Başlangıç → Güncel</th>
                <th class="odv-th">Değişim</th>
                <th class="odv-th w-48">Hedef</th>
                <th class="odv-th">Uyum</th>
                <th class="odv-th">Görüşme</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.v.client.id) {
                <tr
                  class="cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  (click)="qa.open('client-detail', row.v.client.id)"
                >
                  <td class="odv-td">
                    <div class="flex items-center gap-3">
                      <app-avatar [name]="row.v.fullName" size="sm" />
                      <strong class="text-sm">{{ row.v.fullName }}</strong>
                    </div>
                  </td>
                  <td class="odv-td text-xs text-slate-500">
                    {{ programLabels[row.v.client.program] }}
                  </td>
                  <td class="odv-td tabular text-sm">
                    {{ row.v.client.startWeightKg | number: '1.0-1' }} →
                    <b>{{ row.v.currentWeightKg | number: '1.0-1' }}</b> kg
                  </td>
                  <td
                    class="odv-td tabular text-sm font-bold"
                    [class.text-emerald-600]="row.good"
                    [class.text-amber-600]="!row.good"
                  >
                    {{ row.v.changeKg > 0 ? '+' : '' }}{{ row.v.changeKg | number: '1.0-1' }} kg
                  </td>
                  <td class="odv-td">
                    <div class="flex items-center gap-2">
                      <app-progress-bar
                        class="flex-1"
                        [value]="row.v.progress"
                        [label]="row.v.fullName + ' hedef ilerlemesi'"
                      />
                      <span class="tabular w-9 text-end text-xs font-bold"
                        >%{{ row.v.progress }}</span
                      >
                    </div>
                  </td>
                  <td class="odv-td tabular text-sm">
                    {{
                      row.v.avgAdherence === null
                        ? '—'
                        : (row.v.avgAdherence | number: '1.1-1') + ' / 5'
                    }}
                  </td>
                  <td class="odv-td tabular text-sm">{{ row.done }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class ReportsPage {
  readonly store = inject(DietStore);
  readonly auth = inject(AuthStore);
  readonly qa = inject(QuickActions);
  private readonly notify = inject(Notify);
  readonly programLabels = PROGRAM_LABELS;

  readonly selectedClientId = signal('c-1');
  readonly maskName = signal(true);
  readonly storyTheme = signal<'violet' | 'emerald' | 'dark'>('violet');

  readonly rows = computed(() =>
    this.store
      .activeClients()
      .map((v) => {
        const wantsLoss = v.client.targetWeightKg < v.client.startWeightKg;
        return {
          v,
          good: wantsLoss ? v.changeKg <= 0 : v.changeKg >= 0,
          done: this.store
            .consultations()
            .filter((c) => c.clientId === v.client.id && c.status === 'done').length,
        };
      })
      .sort((a, b) => b.v.progress - a.v.progress),
  );

  readonly selectedStoryRow = computed(() => {
    const list = this.rows();
    return list.find((r) => r.v.client.id === this.selectedClientId()) ?? list[0] ?? null;
  });

  readonly storyCardClass = computed(() => {
    const theme = this.storyTheme();
    if (theme === 'emerald') return 'bg-gradient-to-br from-emerald-600 to-teal-800';
    if (theme === 'dark') return 'bg-gradient-to-br from-slate-900 to-indigo-950';
    return 'bg-gradient-to-br from-violet-600 to-indigo-800';
  });

  readonly totals = computed(() => {
    const rows = this.rows();
    const rated = rows.filter((r) => r.v.avgAdherence !== null);
    return {
      change: round1(rows.reduce((s, r) => s + r.v.changeKg, 0)).toLocaleString('tr-TR'),
      progress: rows.length
        ? Math.round(rows.reduce((s, r) => s + r.v.progress, 0) / rows.length)
        : 0,
      adherence: rated.length
        ? round1(
            rated.reduce((s, r) => s + (r.v.avgAdherence ?? 0), 0) / rated.length,
          ).toLocaleString('tr-TR')
        : '—',
      done: rows.reduce((s, r) => s + r.done, 0),
    };
  });

  maskedClientName(fullName: string): string {
    return fullName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => `${part[0]?.toUpperCase() ?? ''}.`)
      .join(' ');
  }

  copyStoryCaption(row: { v: { fullName: string; age: number; client: { startWeightKg: number; program: keyof typeof PROGRAM_LABELS }; currentWeightKg: number; changeKg: number; progress: number }; done: number }): void {
    const displayName = this.maskName() ? this.maskedClientName(row.v.fullName) : row.v.fullName;
    const practice = this.auth.session()?.practice || 'OdivonDiet Klinik Beslenme';
    const text = [
      `✨ ${practice} — Klinik Başarı Hikayesi`,
      `👤 Danışanımız: ${displayName} (${row.v.age} Yaş · ${this.programLabels[row.v.client.program]})`,
      `⚖️ Başlangıç: ${row.v.client.startWeightKg} kg → Güncel: ${row.v.currentWeightKg} kg (${row.v.changeKg > 0 ? '+' : ''}${row.v.changeKg} kg)`,
      `🎯 Hedef İlerlemesi: %${row.v.progress} (${row.done} kontrol seansı)`,
      `🌿 Sürdürülebilir, yasaksız ve kişiye özel klinik beslenme ile sağlıklı dönüşüm!`,
    ].join('\n');
    void globalThis.navigator?.clipboard?.writeText(text);
    this.notify.success('Sosyal medya başarı hikayesi metni panoya kopyalandı.');
  }

  print(): void {
    window.print();
  }
}
