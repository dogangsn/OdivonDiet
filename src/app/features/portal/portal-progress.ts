import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, max, min, required, submit } from '@angular/forms/signals';
import { MemberPortal } from '../../core/data/member-portal';
import { round1 } from '../../domain/diet-calc';
import { PageHeader } from '../../shared/ui/page-header';
import { TrendChart } from '../../shared/ui/trend-chart';

@Component({
  selector: 'app-portal-progress',
  imports: [PageHeader, TrendChart, FormField, DatePipe, DecimalPipe],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header eyebrow="Takip" title="İlerlemem" description="Ölçümleriniz ve hedefinize göre ilerlemeniz." />

      <div class="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section class="odv-card p-5">
          <div class="mb-3 flex items-baseline justify-between">
            <h2 class="odv-section-title">Kilo trendi</h2>
            @if (member.view(); as v) {
              <span class="text-xs text-slate-500">Hedef {{ v.client.targetWeightKg }} kg</span>
            }
          </div>
          <app-trend-chart [points]="trend()" [target]="member.view()?.client?.targetWeightKg ?? null" />
        </section>

        <section class="odv-card p-5">
          <h2 class="odv-section-title">Bugünkü tartım</h2>
          <p class="mt-1 text-xs text-slate-500">Sabah aç karnına tartılmanız önerilir. Diyetisyeniniz girişinizi görür.</p>
          @if (saved()) {
            <p class="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" role="status">
              Ölçümünüz kaydedildi.
            </p>
          }
          <form class="mt-4 space-y-3" (submit)="save($event)" novalidate>
            <label class="block">
              <span class="odv-label">Kilo (kg)</span>
              <input class="odv-input tabular !text-lg !font-bold" type="number" step="0.1" inputmode="decimal" [formField]="f.weightKg" placeholder="0,0" />
              @if (f.weightKg().touched() && f.weightKg().invalid()) {
                <span class="odv-error">30–300 kg arası bir değer girin.</span>
              }
            </label>
            <label class="block">
              <span class="odv-label">Not</span>
              <input class="odv-input" [formField]="f.note" placeholder="İsteğe bağlı" />
            </label>
            <button type="submit" class="odv-btn-primary w-full">Kaydet</button>
          </form>
        </section>
      </div>

      <section class="odv-card overflow-hidden">
        <h2 class="odv-section-title px-5 pt-5">Ölçüm geçmişi</h2>
        <div class="mt-3 overflow-x-auto">
          <table class="w-full min-w-[34rem]">
            <thead>
              <tr>
                <th class="odv-th" scope="col">Tarih</th>
                <th class="odv-th" scope="col">Kilo</th>
                <th class="odv-th" scope="col">Bel</th>
                <th class="odv-th" scope="col">Kalça</th>
                <th class="odv-th" scope="col">Yağ %</th>
                <th class="odv-th" scope="col">Giren</th>
              </tr>
            </thead>
            <tbody>
              @for (m of rows(); track m.id) {
                <tr>
                  <td class="odv-td">{{ m.date | date: 'd MMM y' }}</td>
                  <td class="odv-td tabular font-bold">{{ m.weightKg | number: '1.1-1' }} kg</td>
                  <td class="odv-td tabular">{{ m.waistCm ?? '—' }}</td>
                  <td class="odv-td tabular">{{ m.hipCm ?? '—' }}</td>
                  <td class="odv-td tabular">{{ m.bodyFatPct ?? '—' }}</td>
                  <td class="odv-td text-xs text-slate-500">{{ m.source === 'member' ? 'Siz' : 'Diyetisyen' }}</td>
                </tr>
              } @empty {
                <tr><td class="odv-td text-slate-500" colspan="6">Henüz ölçüm yok.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class PortalProgress {
  readonly member = inject(MemberPortal);
  readonly saved = signal(false);
  readonly model = signal<{ weightKg: number | null; note: string }>({ weightKg: null, note: '' });
  readonly f = form(this.model, (p) => {
    required(p.weightKg);
    min(p.weightKg, 30);
    max(p.weightKg, 300);
  });
  readonly trend = computed(() => this.member.measurements().map((m) => ({ date: m.date, value: m.weightKg })));
  readonly rows = computed(() => [...this.member.measurements()].reverse());

  save(event: Event): void {
    event.preventDefault();
    void submit(this.f, async () => {
      const v = this.model();
      this.member.logWeight(round1(v.weightKg!), v.note);
      this.model.set({ weightKg: null, note: '' });
      this.f().reset();
      this.saved.set(true);
    });
  }
}
