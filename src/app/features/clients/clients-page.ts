import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { DietStore } from '../../core/data/diet-store';
import { ClientStatus, PROGRAM_LABELS, ProgramType } from '../../domain/diet.models';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { PageHeader } from '../../shared/ui/page-header';
import { ProgressBar } from '../../shared/ui/progress-bar';
import { toneClass } from '../../shared/ui/tone';
import { QuickActions } from '../forms/quick-actions';

@Component({
  selector: 'app-clients-page',
  imports: [PageHeader, Avatar, ProgressBar, EmptyState, DatePipe, DecimalPipe],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Danışan takibi"
        title="Danışanlar"
        description="Profil, hedef ve ilerleme bilgilerine tek bakışta ulaşın."
      >
        <button actions type="button" class="odv-btn-primary" (click)="qa.open('client-new')">
          <span class="material-symbols-rounded !text-lg">person_add</span>Yeni danışan
        </button>
      </app-page-header>

      <div class="odv-card flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <label class="relative flex-1">
          <span class="sr-only">Danışan ara</span>
          <span
            class="material-symbols-rounded pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
            >search</span
          >
          <input
            class="odv-input ps-10"
            type="search"
            placeholder="Ad, e-posta veya program ara…"
            [value]="query()"
            (input)="typed.set($any($event.target).value)"
          />
        </label>
        <div class="flex flex-wrap items-center gap-2">
          <div class="odv-segment" role="group" aria-label="Durum">
            @for (option of statusOptions; track option.value) {
              <button
                type="button"
                class="odv-segment-item"
                [attr.aria-pressed]="status() === option.value"
                (click)="status.set(option.value)"
              >
                {{ option.label }}
                <span class="tabular text-slate-400">{{ countFor(option.value) }}</span>
              </button>
            }
          </div>
          <select
            class="odv-input !w-auto !py-2"
            aria-label="Program filtresi"
            [value]="program()"
            (change)="program.set($any($event.target).value)"
          >
            <option value="all">Tüm programlar</option>
            @for (option of programOptions; track option[0]) {
              <option [value]="option[0]">{{ option[1] }}</option>
            }
          </select>
        </div>
      </div>

      @if (filtered().length) {
        <ul class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          @for (v of filtered(); track v.client.id) {
            <li>
              <button
                type="button"
                class="odv-card odv-card-hover flex h-full w-full flex-col p-5 text-start"
                (click)="qa.open('client-detail', v.client.id)"
              >
                <div class="flex items-start gap-3">
                  <app-avatar [name]="v.fullName" />
                  <div class="min-w-0 flex-1">
                    <strong class="block truncate text-[15px]">{{ v.fullName }}</strong>
                    <span class="block truncate text-xs text-slate-500"
                      >{{ v.age }} yaş · {{ programLabels[v.client.program] }}</span
                    >
                  </div>
                  <span class="odv-badge" [class]="bmiTone(v.bmiBand.tone)"
                    >BKİ {{ v.bmi | number: '1.1-1' }}</span
                  >
                </div>

                <div class="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div class="rounded-xl bg-slate-50 py-2 dark:bg-slate-800/60">
                    <span
                      class="block text-[10px] font-bold uppercase tracking-wider text-slate-400"
                      >Başlangıç</span
                    >
                    <strong class="tabular text-sm">{{
                      v.client.startWeightKg | number: '1.0-1'
                    }}</strong>
                  </div>
                  <div class="rounded-xl bg-violet-50 py-2 dark:bg-violet-950/40">
                    <span
                      class="block text-[10px] font-bold uppercase tracking-wider text-violet-500"
                      >Güncel</span
                    >
                    <strong class="tabular text-sm text-violet-700 dark:text-violet-200">{{
                      v.currentWeightKg | number: '1.0-1'
                    }}</strong>
                  </div>
                  <div class="rounded-xl bg-emerald-50 py-2 dark:bg-emerald-950/40">
                    <span
                      class="block text-[10px] font-bold uppercase tracking-wider text-emerald-600"
                      >Hedef</span
                    >
                    <strong class="tabular text-sm text-emerald-700 dark:text-emerald-300">{{
                      v.client.targetWeightKg | number: '1.0-1'
                    }}</strong>
                  </div>
                </div>

                <div class="mt-4">
                  <div class="mb-1.5 flex justify-between text-xs">
                    <span class="font-semibold text-slate-500">Hedefe ilerleme</span>
                    <strong class="tabular">%{{ v.progress }}</strong>
                  </div>
                  <app-progress-bar
                    [value]="v.progress"
                    [label]="v.fullName + ' hedef ilerlemesi'"
                  />
                </div>

                <div class="mt-auto w-full pt-4">
                  <div
                    class="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3.5 text-xs text-slate-500 dark:border-slate-800"
                  >
                    <span class="inline-flex items-center gap-1">
                      <span class="material-symbols-rounded !text-base">event</span>
                      @if (v.nextConsultation; as next) {
                        {{ next.at | date: 'd MMM HH:mm' }}
                      } @else {
                        Randevu yok
                      }
                    </span>
                    <span
                      class="inline-flex items-center gap-1"
                      [class.text-amber-600]="(v.daysSinceMeasurement ?? 99) > 14"
                    >
                      <span class="material-symbols-rounded !text-base">monitor_weight</span>
                      {{
                        v.daysSinceMeasurement === null
                          ? 'Ölçüm yok'
                          : v.daysSinceMeasurement === 0
                            ? 'Bugün ölçüldü'
                            : v.daysSinceMeasurement + ' gün önce'
                      }}
                    </span>
                    @if (v.client.allergies.length) {
                      <span class="inline-flex items-center gap-1 text-rose-600"
                        ><span class="material-symbols-rounded !text-base">no_food</span
                        >{{ v.client.allergies.length }}</span
                      >
                    }
                  </div>
                </div>
              </button>
            </li>
          }
        </ul>
      } @else {
        <div class="odv-card">
          <app-empty-state
            icon="person_search"
            title="Danışan bulunamadı"
            body="Arama veya filtreleri değiştirin ya da yeni danışan ekleyin."
          >
            <button type="button" class="odv-btn-primary" (click)="qa.open('client-new')">
              Yeni danışan
            </button>
          </app-empty-state>
        </div>
      }
    </div>
  `,
})
export class ClientsPage {
  readonly store = inject(DietStore);
  readonly qa = inject(QuickActions);
  /** Pre-fills the search box, e.g. from the top-bar search (`/clients?q=`). */
  readonly q = input<string | undefined>('');
  readonly programLabels = PROGRAM_LABELS;
  readonly programOptions = Object.entries(PROGRAM_LABELS);
  readonly statusOptions: { value: ClientStatus; label: string }[] = [
    { value: 'active', label: 'Aktif' },
    { value: 'paused', label: 'Duraklatılan' },
    { value: 'archived', label: 'Arşiv' },
  ];
  readonly typed = signal<string | null>(null);
  readonly query = computed(() => this.typed() ?? this.q() ?? '');
  readonly status = signal<ClientStatus>('active');
  readonly program = signal<ProgramType | 'all'>('all');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLocaleLowerCase('tr');
    const program = this.program();
    return this.store
      .clientViews()
      .filter(
        (v) =>
          v.client.status === this.status() &&
          (program === 'all' || v.client.program === program) &&
          (!q ||
            `${v.fullName} ${v.client.email} ${PROGRAM_LABELS[v.client.program]}`
              .toLocaleLowerCase('tr')
              .includes(q)),
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'tr'));
  });

  countFor(status: ClientStatus): number {
    return this.store.clients().filter((c) => c.status === status).length;
  }

  bmiTone = toneClass;
}
