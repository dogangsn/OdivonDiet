import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth-store';
import { DietStore } from '../../core/data/diet-store';
import {
  CHANNEL_ICONS,
  CHANNEL_LABELS,
  PROGRAM_LABELS,
  ProgramType,
} from '../../domain/diet.models';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';
import { ProgressBar } from '../../shared/ui/progress-bar';
import { TONE_ICON_BG } from '../../shared/ui/tone';
import { QuickActions } from '../forms/quick-actions';

@Component({
  selector: 'app-overview-page',
  imports: [
    PageHeader,
    KpiCard,
    Avatar,
    ProgressBar,
    EmptyState,
    DatePipe,
    DecimalPipe,
    RouterLink,
  ],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        [eyebrow]="(today | date: 'EEEE, d MMMM') ?? ''"
        [title]="greeting()"
        description="Bugünkü randevularınız ve ilgilenmeniz gereken danışanlar burada."
      >
        <button actions type="button" class="odv-btn-secondary" (click)="qa.open('consultation')">
          <span class="material-symbols-rounded !text-lg">event</span>Görüşme planla
        </button>
        <button actions type="button" class="odv-btn-primary" (click)="qa.open('client-new')">
          <span class="material-symbols-rounded !text-lg">person_add</span>Yeni danışan
        </button>
      </app-page-header>

      <section
        class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
        aria-label="Temel göstergeler"
      >
        <app-kpi-card
          label="Aktif danışan"
          [value]="store.activeClients().length"
          icon="group"
          tone="primary"
          [hint]="newThisMonth() + ' yeni danışan bu ay'"
        />
        <app-kpi-card
          label="Bugünkü görüşme"
          [value]="store.todaysConsultations().length"
          icon="event_available"
          tone="info"
          [hint]="nextLabel()"
        />
        <app-kpi-card
          label="Ort. hedef ilerlemesi"
          [value]="'%' + avgProgress()"
          icon="flag"
          tone="positive"
          [hint]="onTrack() + ' danışan hedefin yarısını geçti'"
        />
        <app-kpi-card
          label="Takip gerekiyor"
          [value]="attentionClients()"
          icon="notification_important"
          [tone]="attentionClients() ? 'warning' : 'positive'"
          [hint]="store.attention().length + ' açık uyarı'"
        />
      </section>

      <div class="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <section class="odv-card overflow-hidden" aria-labelledby="today-title">
          <header
            class="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"
          >
            <div>
              <h2 id="today-title" class="odv-section-title">Bugünün programı</h2>
              <p class="text-xs text-slate-500">{{ store.todaysConsultations().length }} görüşme</p>
            </div>
            <a routerLink="/consultations" class="odv-btn-ghost !min-h-9 text-xs"
              >Tümü<span class="material-symbols-rounded directional-icon !text-base"
                >chevron_right</span
              ></a
            >
          </header>
          <ol class="divide-y divide-slate-100 dark:divide-slate-800">
            @for (item of store.todaysConsultations(); track item.id) {
              <li
                class="flex items-center gap-4 px-5 py-3.5"
                [class.opacity-60]="item.status !== 'scheduled'"
              >
                <div class="w-14 shrink-0 text-center">
                  <strong class="tabular block text-sm">{{ item.at | date: 'HH:mm' }}</strong>
                  <span class="text-[10px] font-semibold uppercase text-slate-400">{{
                    isPast(item.at) && item.status === 'scheduled' ? 'Geçti' : ''
                  }}</span>
                </div>
                <span class="h-10 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true"></span>
                <app-avatar [name]="store.clientName(item.clientId)" size="sm" />
                <button
                  type="button"
                  class="min-w-0 flex-1 text-start"
                  (click)="qa.open('client-detail', item.clientId)"
                >
                  <strong class="block truncate text-sm hover:text-violet-600">{{
                    store.clientName(item.clientId)
                  }}</strong>
                  <span class="flex items-center gap-1 text-xs text-slate-500">
                    <span class="material-symbols-rounded !text-sm">{{
                      channelIcons[item.channel]
                    }}</span
                    >{{ channelLabels[item.channel] }}
                  </span>
                </button>
                @if (item.status === 'scheduled') {
                  <button
                    type="button"
                    class="odv-btn-soft"
                    (click)="qa.open('consultation-complete', item.clientId, item.id)"
                  >
                    <span class="material-symbols-rounded !text-base">task_alt</span
                    ><span class="hidden sm:inline">Tamamla</span>
                  </button>
                } @else {
                  <span class="odv-badge odv-tone-positive"
                    ><span class="material-symbols-rounded !text-sm">check</span>Tamamlandı</span
                  >
                }
              </li>
            } @empty {
              <li>
                <app-empty-state
                  icon="event_available"
                  title="Bugün görüşme yok"
                  body="Yeni bir takip görüşmesi planlayabilirsiniz."
                />
              </li>
            }
          </ol>
        </section>

        <section class="odv-card overflow-hidden" aria-labelledby="attention-title">
          <header class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 id="attention-title" class="odv-section-title">Dikkat gerektirenler</h2>
            <p class="text-xs text-slate-500">
              Ölçümü gecikenler, planı olmayanlar, uyumu düşenler
            </p>
          </header>
          <ul
            class="custom-scroll max-h-[360px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800"
          >
            @for (item of store.attention(); track item.clientId + item.reason) {
              <li>
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-5 py-3 text-start hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  (click)="qa.open('client-detail', item.clientId)"
                >
                  <span
                    class="grid size-9 shrink-0 place-items-center rounded-xl"
                    [class]="toneBg[item.tone]"
                  >
                    <span class="material-symbols-rounded !text-lg">{{ item.icon }}</span>
                  </span>
                  <span class="min-w-0 flex-1">
                    <strong class="block truncate text-sm">{{ item.name }}</strong>
                    <span class="block truncate text-xs text-slate-500">{{ item.reason }}</span>
                  </span>
                  <span class="material-symbols-rounded directional-icon text-slate-300"
                    >chevron_right</span
                  >
                </button>
              </li>
            } @empty {
              <li>
                <app-empty-state
                  icon="verified"
                  title="Her şey yolunda"
                  body="Takip gerektiren danışan yok."
                />
              </li>
            }
          </ul>
        </section>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <section class="odv-card p-5" aria-labelledby="progress-title">
          <div class="mb-4 flex items-center justify-between">
            <h2 id="progress-title" class="odv-section-title">Danışan ilerlemesi</h2>
            <a routerLink="/clients" class="odv-btn-ghost !min-h-9 text-xs"
              >Danışanlar<span class="material-symbols-rounded directional-icon !text-base"
                >chevron_right</span
              ></a
            >
          </div>
          <ul class="space-y-4">
            @for (v of progressList(); track v.client.id) {
              <li>
                <button
                  type="button"
                  class="flex w-full items-center gap-3 text-start"
                  (click)="qa.open('client-detail', v.client.id)"
                >
                  <app-avatar [name]="v.fullName" size="sm" />
                  <span class="min-w-0 flex-1">
                    <span class="flex items-baseline justify-between gap-2">
                      <strong class="truncate text-sm">{{ v.fullName }}</strong>
                      <span class="tabular text-xs font-bold text-slate-500"
                        >{{ v.currentWeightKg | number: '1.0-1' }} →
                        {{ v.client.targetWeightKg | number: '1.0-1' }} kg</span
                      >
                    </span>
                    <app-progress-bar
                      class="mt-1.5"
                      [value]="v.progress"
                      [label]="v.fullName + ' hedef ilerlemesi'"
                    />
                  </span>
                  <span
                    class="tabular w-10 text-end text-xs font-extrabold text-emerald-600 dark:text-emerald-400"
                    >%{{ v.progress }}</span
                  >
                </button>
              </li>
            }
          </ul>
        </section>

        <section class="odv-card p-5" aria-labelledby="mix-title">
          <h2 id="mix-title" class="odv-section-title mb-4">Program dağılımı</h2>
          <ul class="space-y-3">
            @for (row of programMix(); track row.key) {
              <li class="flex items-center gap-3 text-sm">
                <span class="w-36 shrink-0 truncate text-slate-600 dark:text-slate-300">{{
                  row.label
                }}</span>
                <span
                  class="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                >
                  <span
                    class="block h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                    [style.width.%]="row.pct"
                  ></span>
                </span>
                <strong class="tabular w-6 text-end">{{ row.count }}</strong>
              </li>
            }
          </ul>
          <h3 class="odv-eyebrow mb-3 mt-6">Son hareketler</h3>
          <ul class="space-y-3">
            @for (item of recent(); track item.id) {
              <li class="flex items-start gap-3">
                <span
                  class="grid size-8 shrink-0 place-items-center rounded-lg"
                  [class]="toneBg[item.tone]"
                >
                  <span class="material-symbols-rounded !text-base">{{ item.icon }}</span>
                </span>
                <span class="min-w-0 flex-1">
                  <strong class="block text-xs">{{ item.title }}</strong>
                  <span class="block truncate text-[11px] text-slate-500">{{ item.detail }}</span>
                </span>
                <time class="shrink-0 text-[11px] text-slate-400">{{
                  item.at | date: 'd MMM HH:mm'
                }}</time>
              </li>
            }
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class OverviewPage {
  readonly store = inject(DietStore);
  readonly qa = inject(QuickActions);
  private readonly auth = inject(AuthStore);
  readonly today = new Date();
  readonly channelIcons = CHANNEL_ICONS;
  readonly channelLabels = CHANNEL_LABELS;
  readonly toneBg = TONE_ICON_BG;

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const hello = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
    const first = this.auth
      .session()
      ?.name.replace(/^Dyt\.?\s*/i, '')
      .split(' ')[0];
    return first ? `${hello}, ${first}` : hello;
  });
  readonly newThisMonth = computed(() => {
    const now = new Date();
    return this.store.clients().filter((c) => {
      const d = new Date(c.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  });
  readonly nextLabel = computed(() => {
    const next = this.store
      .todaysConsultations()
      .find((c) => c.status === 'scheduled' && new Date(c.at) > new Date());
    if (!next) return 'Bugün için sıradaki görüşme yok';
    const time = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(
      new Date(next.at),
    );
    return `Sıradaki ${time} · ${this.store.clientName(next.clientId)}`;
  });
  readonly avgProgress = computed(() => {
    const list = this.store.activeClients();
    return list.length ? Math.round(list.reduce((s, v) => s + v.progress, 0) / list.length) : 0;
  });
  readonly onTrack = computed(
    () => this.store.activeClients().filter((v) => v.progress >= 50).length,
  );
  readonly attentionClients = computed(
    () => new Set(this.store.attention().map((a) => a.clientId)).size,
  );
  readonly progressList = computed(() =>
    [...this.store.activeClients()].sort((a, b) => b.progress - a.progress).slice(0, 5),
  );
  readonly programMix = computed(() => {
    const list = this.store.activeClients();
    const counts = new Map<ProgramType, number>();
    for (const v of list) counts.set(v.client.program, (counts.get(v.client.program) ?? 0) + 1);
    const maxCount = Math.max(1, ...counts.values());
    return (Object.keys(PROGRAM_LABELS) as ProgramType[]).map((key) => ({
      key,
      label: PROGRAM_LABELS[key],
      count: counts.get(key) ?? 0,
      pct: ((counts.get(key) ?? 0) / maxCount) * 100,
    }));
  });
  readonly recent = computed(() => this.store.activity().slice(0, 4));

  isPast(at: string): boolean {
    return new Date(at) < new Date();
  }
}
