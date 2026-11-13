import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { DietStore } from '../../core/data/diet-store';
import { Notify } from '../../core/notify/notify';
import { isoDate, round1, startOfDay } from '../../domain/diet-calc';
import {
  CHANNEL_ICONS,
  CHANNEL_LABELS,
  Consultation,
  ConsultationChannel,
} from '../../domain/diet.models';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';
import { QuickActions } from '../forms/quick-actions';

export type CalendarViewMode = 'month' | 'week' | 'list';

interface CalendarDayCell {
  readonly iso: string;
  readonly date: Date;
  readonly dayNumber: number;
  readonly inCurrentMonth: boolean;
  readonly isToday: boolean;
  readonly isWeekend: boolean;
  readonly items: readonly Consultation[];
}

const WEEKDAY_HEADERS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as const;

const AGENDA_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '13:00',
  '14:00',
  '15:00',
  '15:30',
  '16:00',
  '17:00',
] as const;

@Component({
  selector: 'app-consultations-page',
  imports: [PageHeader, Avatar, EmptyState, KpiCard, DatePipe],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Klinik ajanda & randevu yönetimi"
        title="Görsel randevu takvimi ve görüşmeler"
        description="Aylık ve haftalık görsel takvim üzerinden boş saat dilimlerine tek tıkla randevu atayın, seans uyumunu ve klinik notları yönetin."
      >
        <div actions class="flex flex-wrap items-center gap-2">
          <button type="button" class="odv-btn-soft" (click)="goToToday()">
            <span class="material-symbols-rounded !text-lg">today</span>Bugüne git
          </button>
          <button
            type="button"
            class="odv-btn-primary"
            (click)="openScheduleAt(selectedDate(), '10:00')"
          >
            <span class="material-symbols-rounded !text-lg">add_circle</span>Seçili güne randevu ekle
          </button>
        </div>
      </app-page-header>

      <!-- KPI Özeti -->
      <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Randevu özeti">
        <app-kpi-card
          label="Bugünkü randevular"
          [value]="todayCount()"
          icon="today"
          tone="primary"
          [hint]="todayBreakdownHint()"
        />
        <app-kpi-card
          label="Planlı yaklaşan seans"
          [value]="upcomingCount()"
          icon="event_upcoming"
          tone="info"
          hint="Aktif randevu takvimi"
        />
        <app-kpi-card
          label="Tamamlanan görüşme"
          [value]="doneCount()"
          icon="task_alt"
          tone="positive"
          [hint]="'Ortalama plan uyumu: ' + avgAdherence() + ' / 5'"
        />
        <app-kpi-card
          label="Seçili gün yoğunluğu"
          [value]="selectedDayConsultations().length + ' seans'"
          icon="schedule"
          tone="warning"
          [hint]="selectedDateLabel()"
        />
      </section>

      <!-- Takvim Kontrol & Görünüm Araç Çubuğu -->
      <section
        aria-label="Takvim görünüm ve filtre kontrolleri"
        class="odv-card flex flex-wrap items-center justify-between gap-3 p-4"
      >
        <!-- Sol: Dönem Navigasyonu -->
        <div class="flex flex-wrap items-center gap-2">
          <div class="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              class="odv-icon-btn !size-8"
              (click)="navigatePeriod(-1)"
              [attr.aria-label]="viewMode() === 'week' ? 'Önceki hafta' : 'Önceki ay'"
            >
              <span class="material-symbols-rounded !text-lg">chevron_left</span>
            </button>
            <span class="min-w-44 px-3 text-center text-sm font-extrabold capitalize">
              {{ periodTitle() }}
            </span>
            <button
              type="button"
              class="odv-icon-btn !size-8"
              (click)="navigatePeriod(1)"
              [attr.aria-label]="viewMode() === 'week' ? 'Sonraki hafta' : 'Sonraki ay'"
            >
              <span class="material-symbols-rounded !text-lg">chevron_right</span>
            </button>
          </div>

          <!-- Kanal Renk Lejantı & Filtresi -->
          <div class="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              (click)="channelFilter.set('all')"
              [attr.aria-pressed]="channelFilter() === 'all'"
              class="rounded-full border px-2.5 py-1 font-semibold transition"
              [class]="
                channelFilter() === 'all'
                  ? 'border-slate-800 bg-slate-800 text-white dark:border-white dark:bg-white dark:text-slate-900'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300'
              "
            >
              Tümü
            </button>
            <button
              type="button"
              (click)="channelFilter.set('clinic')"
              [attr.aria-pressed]="channelFilter() === 'clinic'"
              class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold transition"
              [class]="
                channelFilter() === 'clinic'
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300'
              "
            >
              <span class="size-2 rounded-full bg-emerald-500"></span>Yüz yüze
            </button>
            <button
              type="button"
              (click)="channelFilter.set('video')"
              [attr.aria-pressed]="channelFilter() === 'video'"
              class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold transition"
              [class]="
                channelFilter() === 'video'
                  ? 'border-violet-600 bg-violet-600 text-white'
                  : 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300'
              "
            >
              <span class="size-2 rounded-full bg-violet-500"></span>Online Video
            </button>
            <button
              type="button"
              (click)="channelFilter.set('phone')"
              [attr.aria-pressed]="channelFilter() === 'phone'"
              class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold transition"
              [class]="
                channelFilter() === 'phone'
                  ? 'border-sky-600 bg-sky-600 text-white'
                  : 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300'
              "
            >
              <span class="size-2 rounded-full bg-sky-500"></span>Telefon
            </button>
          </div>
        </div>

        <!-- Sağ: Görünüm Modu (Aylık Takvim / Haftalık Ajanda / Liste) -->
        <div class="odv-segment" role="group" aria-label="Takvim görünüm modu">
          <button
            type="button"
            class="odv-segment-item"
            [attr.aria-pressed]="viewMode() === 'month'"
            (click)="viewMode.set('month')"
          >
            <span class="material-symbols-rounded !text-base">calendar_view_month</span>Aylık takvim
          </button>
          <button
            type="button"
            class="odv-segment-item"
            [attr.aria-pressed]="viewMode() === 'week'"
            (click)="viewMode.set('week')"
          >
            <span class="material-symbols-rounded !text-base">view_week</span>Haftalık ajanda
          </button>
          <button
            type="button"
            class="odv-segment-item"
            [attr.aria-pressed]="viewMode() === 'list'"
            (click)="viewMode.set('list')"
          >
            <span class="material-symbols-rounded !text-base">view_agenda</span>Liste
          </button>
        </div>
      </section>

      <!-- 1. GÖRSEL AYLIK TAKVİM + SEÇİLİ GÜN SAATLİK AJANDA PANELİ -->
      @if (viewMode() === 'month') {
        <div class="grid gap-6 xl:grid-cols-12">
          <!-- Sol (8 sütun): Görsel Aylık Takvim Izgarası -->
          <section
            aria-label="Aylık randevu takvimi"
            class="odv-card overflow-hidden xl:col-span-8"
          >
            <!-- Haftanın Günleri Başlığı -->
            <div
              class="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60"
            >
              @for (dayName of weekdayHeaders; track dayName) {
                <div class="py-3">{{ dayName }}</div>
              }
            </div>

            <!-- 42 Günlük Takvim Hücreleri -->
            <div class="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
              @for (cell of calendarCells(); track cell.iso) {
                <div
                  class="group relative flex min-h-28 flex-col p-2 transition sm:min-h-32"
                  [class]="
                    selectedDate() === cell.iso
                      ? 'bg-violet-50/70 ring-2 ring-inset ring-violet-500 dark:bg-violet-950/30'
                      : cell.inCurrentMonth
                        ? 'bg-white hover:bg-slate-50/80 dark:bg-slate-900 dark:hover:bg-slate-800/50'
                        : 'bg-slate-50/50 text-slate-400 dark:bg-slate-950/40 dark:text-slate-600'
                  "
                >
                  <!-- Gün Üst Satırı: Gün numarası + Hızlı Ekle Butonu -->
                  <div class="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      (click)="selectDay(cell.iso)"
                      [attr.aria-label]="(cell.date | date: 'd MMMM y') + ' gününü seç'"
                      class="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-extrabold transition"
                      [class]="
                        cell.isToday
                          ? 'bg-violet-600 text-white shadow-xs'
                          : selectedDate() === cell.iso
                            ? 'text-violet-700 dark:text-violet-300'
                            : 'hover:bg-slate-200/60 dark:hover:bg-slate-800'
                      "
                    >
                      <span class="tabular">{{ cell.dayNumber }}</span>
                      @if (cell.isToday) {
                        <span class="hidden text-[10px] font-bold sm:inline">Bugün</span>
                      }
                    </button>

                    <button
                      type="button"
                      (click)="openScheduleAt(cell.iso, '10:00')"
                      class="grid size-6 place-items-center rounded-md text-slate-400 opacity-0 transition hover:bg-violet-100 hover:text-violet-700 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-violet-950 dark:hover:text-violet-300"
                      [attr.aria-label]="(cell.date | date: 'd MMMM') + ' tarihine randevu ekle'"
                      title="Bu güne randevu ekle"
                    >
                      <span class="material-symbols-rounded !text-base">add</span>
                    </button>
                  </div>

                  <!-- O Güne Ait Randevu Rozetleri -->
                  <div class="mt-1.5 flex flex-1 flex-col gap-1">
                    @for (item of cell.items.slice(0, 3); track item.id) {
                      <button
                        type="button"
                        (click)="selectDayAndInspect(cell.iso, item)"
                        class="flex w-full items-center gap-1 rounded-md border px-1.5 py-1 text-start text-[11px] font-semibold leading-tight transition hover:brightness-95"
                        [class]="pillClass(item)"
                      >
                        <span class="material-symbols-rounded !text-[13px]">{{
                          icons[item.channel]
                        }}</span>
                        <span class="tabular font-extrabold">{{ item.at | date: 'HH:mm' }}</span>
                        <span class="truncate">{{ store.clientName(item.clientId) }}</span>
                      </button>
                    }
                    @if (cell.items.length > 3) {
                      <button
                        type="button"
                        (click)="selectDay(cell.iso)"
                        class="text-start text-[11px] font-bold text-violet-600 hover:underline dark:text-violet-300"
                      >
                        +{{ cell.items.length - 3 }} randevu daha…
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </section>

          <!-- Sağ (4 sütun): Seçili Gün Ajandası & Saatlik Boş/Dolu Slot Çizelgesi -->
          <aside
            aria-label="Seçili gün saatlik ajandası"
            class="odv-card flex flex-col justify-between p-5 xl:col-span-4"
          >
            <div class="space-y-4">
              <div class="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <span class="odv-eyebrow">Seçili gün ajandası</span>
                  <h2 class="mt-0.5 text-base font-extrabold capitalize">
                    {{ selectedDateLabel() }}
                  </h2>
                  <p class="text-xs text-slate-500">
                    {{ selectedDayConsultations().length }} kayıtlı randevu · Boş saatlere tıklayarak
                    hemen randevu atayabilirsiniz.
                  </p>
                </div>
                <button
                  type="button"
                  class="odv-btn-primary !min-h-9 !px-3 text-xs"
                  (click)="openScheduleAt(selectedDate(), '10:00')"
                >
                  <span class="material-symbols-rounded !text-base">add</span>Randevu
                </button>
              </div>

              <!-- Saatlik Ajanda Çizelgesi (Dolu randevular + Boş tıklanabilir slotlar) -->
              <ol class="max-h-[34rem] space-y-2 overflow-y-auto pe-1">
                @for (slot of selectedDayAgendaSlots(); track slot.time) {
                  @if (slot.consultation; as item) {
                    <li
                      class="rounded-xl border p-3 transition"
                      [class]="cardClass(item)"
                    >
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-2.5">
                          <span class="tabular rounded-lg bg-white/80 px-2 py-1 text-xs font-extrabold text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white">
                            {{ item.at | date: 'HH:mm' }}
                          </span>
                          <app-avatar [name]="store.clientName(item.clientId)" size="sm" />
                          <div>
                            <button
                              type="button"
                              class="text-start text-sm font-extrabold hover:underline"
                              (click)="qa.open('client-detail', item.clientId)"
                            >
                              {{ store.clientName(item.clientId) }}
                            </button>
                            <span class="flex items-center gap-1 text-[11px] opacity-85">
                              <span class="material-symbols-rounded !text-sm">{{
                                icons[item.channel]
                              }}</span>
                              {{ labels[item.channel] }}
                            </span>
                          </div>
                        </div>

                        @if (item.status === 'done') {
                          <span class="odv-badge odv-tone-positive">Tamamlandı</span>
                        } @else if (item.status === 'cancelled') {
                          <span class="odv-badge odv-tone-neutral">İptal</span>
                        }
                      </div>

                      @if (item.notes) {
                        <p class="mt-2 text-xs opacity-90">{{ item.notes }}</p>
                      }
                      @if (item.nextAction) {
                        <p class="mt-1 text-xs font-bold">→ {{ item.nextAction }}</p>
                      }

                      @if (item.status === 'scheduled') {
                        <div class="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-black/5 pt-2 dark:border-white/10">
                          <button
                            type="button"
                            class="odv-btn-ghost !min-h-7 !px-2 text-xs text-emerald-700 dark:text-emerald-300"
                            (click)="sendWhatsAppReminder(item)"
                          >
                            <span class="material-symbols-rounded !text-sm" aria-hidden="true"
                              >chat</span
                            >
                            WhatsApp Hatırlat
                          </button>
                          <button
                            type="button"
                            class="odv-btn-ghost !min-h-7 !px-2.5 text-xs"
                            (click)="cancel(item)"
                          >
                            İptal
                          </button>
                          <button
                            type="button"
                            class="odv-btn-soft !min-h-7 !px-2.5 text-xs"
                            (click)="qa.open('consultation-complete', item.clientId, item.id)"
                          >
                            <span class="material-symbols-rounded !text-sm">task_alt</span>Seansı
                            tamamla
                          </button>
                        </div>
                      }
                    </li>
                  } @else {
                    <li>
                      <button
                        type="button"
                        (click)="openScheduleAt(selectedDate(), slot.time)"
                        class="flex w-full items-center justify-between rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400 transition hover:border-violet-400 hover:bg-violet-50/40 hover:text-violet-700 dark:border-slate-800 dark:hover:border-violet-600 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
                      >
                        <span class="tabular font-bold">{{ slot.time }}</span>
                        <span class="inline-flex items-center gap-1 font-semibold">
                          <span class="material-symbols-rounded !text-sm">add_circle</span>Boş slot
                          — Randevu planla
                        </span>
                      </button>
                    </li>
                  }
                }
              </ol>
            </div>
          </aside>
        </div>
      }

      <!-- 2. HAFTALIK SAATLİK AJANDA GÖRÜNÜMÜ -->
      @if (viewMode() === 'week') {
        <section aria-label="Haftalık saatlik randevu çizelgesi" class="odv-card overflow-hidden">
          <div class="custom-scroll overflow-x-auto">
            <table class="w-full min-w-[920px] border-collapse">
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60">
                  <th class="w-20 p-3 text-start text-xs font-extrabold uppercase text-slate-400">
                    Saat
                  </th>
                  @for (day of weekDays(); track day.iso) {
                    <th class="border-s border-slate-100 p-3 text-start dark:border-slate-800">
                      <button
                        type="button"
                        (click)="selectDay(day.iso)"
                        class="flex w-full items-center justify-between text-start"
                      >
                        <div>
                          <span class="block text-[11px] font-bold uppercase text-slate-400">
                            {{ day.weekdayShort }}
                          </span>
                          <strong
                            class="tabular text-sm font-extrabold"
                            [class.text-violet-600]="day.isToday"
                          >
                            {{ day.date | date: 'd MMM' }}
                          </strong>
                        </div>
                        @if (day.isToday) {
                          <span class="odv-badge odv-tone-primary">Bugün</span>
                        } @else if (day.items.length) {
                          <span class="odv-badge odv-tone-neutral">{{ day.items.length }}</span>
                        }
                      </button>
                    </th>
                  }
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @for (hour of weekHours; track hour) {
                  <tr>
                    <td class="tabular p-2.5 align-top text-xs font-bold text-slate-400">
                      {{ hour }}
                    </td>
                    @for (day of weekDays(); track day.iso) {
                      <td class="border-s border-slate-100 p-1.5 align-top dark:border-slate-800">
                        @if (consultationsInHour(day.iso, hour); as matches) {
                          @if (matches.length) {
                            <div class="space-y-1">
                              @for (item of matches; track item.id) {
                                <div
                                  class="rounded-lg border p-2 text-xs"
                                  [class]="pillClass(item)"
                                >
                                  <div class="flex items-center justify-between gap-1">
                                    <strong class="tabular font-extrabold">{{
                                      item.at | date: 'HH:mm'
                                    }}</strong>
                                    <span class="material-symbols-rounded !text-sm">{{
                                      icons[item.channel]
                                    }}</span>
                                  </div>
                                  <button
                                    type="button"
                                    class="mt-0.5 block truncate font-bold hover:underline"
                                    (click)="qa.open('client-detail', item.clientId)"
                                  >
                                    {{ store.clientName(item.clientId) }}
                                  </button>
                                  @if (item.status === 'scheduled') {
                                    <div class="mt-1.5 flex gap-1">
                                      <button
                                        type="button"
                                        class="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-800 hover:bg-white"
                                        (click)="
                                          qa.open('consultation-complete', item.clientId, item.id)
                                        "
                                      >
                                        Tamamla
                                      </button>
                                    </div>
                                  }
                                </div>
                              }
                            </div>
                          } @else {
                            <button
                              type="button"
                              (click)="openScheduleAt(day.iso, hour)"
                              class="flex h-12 w-full items-center justify-center rounded-lg border border-transparent text-xs text-slate-300 opacity-0 transition hover:border-dashed hover:border-violet-300 hover:bg-violet-50/40 hover:text-violet-600 hover:opacity-100 focus:opacity-100 dark:hover:border-violet-700 dark:hover:bg-violet-950/30"
                              [attr.aria-label]="day.iso + ' ' + hour + ' randevu ekle'"
                            >
                              + Ekle
                            </button>
                          }
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <!-- 3. LİSTE GÖRÜNÜMÜ -->
      @if (viewMode() === 'list') {
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="odv-segment" role="group" aria-label="Görüşme listesi">
            <button
              type="button"
              class="odv-segment-item"
              [attr.aria-pressed]="tab() === 'upcoming'"
              (click)="tab.set('upcoming')"
            >
              Yaklaşan <span class="tabular text-slate-400">{{ upcomingCount() }}</span>
            </button>
            <button
              type="button"
              class="odv-segment-item"
              [attr.aria-pressed]="tab() === 'past'"
              (click)="tab.set('past')"
            >
              Geçmiş
            </button>
          </div>
        </div>

        @for (group of groups(); track group.key) {
          <section [attr.aria-label]="group.label">
            <h2
              class="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              {{ group.label }}
              @if (group.today) {
                <span class="odv-badge odv-tone-primary normal-case tracking-normal">Bugün</span>
              }
            </h2>
            <ul class="odv-card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
              @for (item of group.items; track item.id) {
                <li class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <div class="flex min-w-0 flex-1 items-center gap-4">
                    <strong class="tabular w-12 shrink-0 text-sm">{{
                      item.at | date: 'HH:mm'
                    }}</strong>
                    <app-avatar [name]="store.clientName(item.clientId)" size="sm" />
                    <div class="min-w-0 flex-1">
                      <button
                        type="button"
                        class="truncate text-sm font-bold hover:text-violet-600"
                        (click)="qa.open('client-detail', item.clientId)"
                      >
                        {{ store.clientName(item.clientId) }}
                      </button>
                      <div
                        class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500"
                      >
                        <span class="inline-flex items-center gap-1"
                          ><span class="material-symbols-rounded !text-sm">{{
                            icons[item.channel]
                          }}</span
                          >{{ labels[item.channel] }}</span
                        >
                        @if (item.notes) {
                          <span class="truncate">{{ item.notes }}</span>
                        }
                      </div>
                      @if (item.nextAction) {
                        <p class="mt-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
                          → {{ item.nextAction }}
                        </p>
                      }
                    </div>
                  </div>
                  <div class="flex shrink-0 items-center gap-2 sm:justify-end">
                    @switch (item.status) {
                      @case ('scheduled') {
                        <button
                          type="button"
                          class="odv-btn-ghost !min-h-9 text-xs text-emerald-700 dark:text-emerald-300"
                          (click)="sendWhatsAppReminder(item)"
                        >
                          <span class="material-symbols-rounded !text-base" aria-hidden="true"
                            >chat</span
                          >
                          WhatsApp Hatırlat
                        </button>
                        <button
                          type="button"
                          class="odv-btn-ghost !min-h-9 text-xs"
                          (click)="cancel(item)"
                        >
                          İptal
                        </button>
                        <button
                          type="button"
                          class="odv-btn-soft"
                          (click)="qa.open('consultation-complete', item.clientId, item.id)"
                        >
                          <span class="material-symbols-rounded !text-base">task_alt</span>Tamamla
                        </button>
                      }
                      @case ('done') {
                        @if (item.adherence) {
                          <span
                            class="odv-badge odv-tone-warning"
                            [attr.aria-label]="'Uyum ' + item.adherence + ' / 5'"
                          >
                            @for (n of [1, 2, 3, 4, 5]; track n) {
                              <span
                                class="material-symbols-rounded !text-[13px]"
                                [class.icon-fill]="n <= item.adherence"
                                [class.opacity-30]="n > item.adherence"
                                >star</span
                              >
                            }
                          </span>
                        }
                        <span class="odv-badge odv-tone-positive">Tamamlandı</span>
                      }
                      @case ('cancelled') {
                        <span class="odv-badge odv-tone-neutral">İptal edildi</span>
                      }
                    }
                  </div>
                </li>
              }
            </ul>
          </section>
        } @empty {
          <div class="odv-card">
            <app-empty-state
              icon="event_available"
              [title]="tab() === 'upcoming' ? 'Yaklaşan görüşme yok' : 'Geçmiş görüşme yok'"
              body="Yeni bir takip görüşmesi planlayın."
            >
              <button type="button" class="odv-btn-primary" (click)="qa.open('consultation')">
                Görüşme planla
              </button>
            </app-empty-state>
          </div>
        }
      }
    </div>
  `,
})
export class ConsultationsPage {
  readonly store = inject(DietStore);
  readonly qa = inject(QuickActions);
  private readonly notify = inject(Notify);
  readonly labels = CHANNEL_LABELS;
  readonly icons = CHANNEL_ICONS;
  readonly weekdayHeaders = WEEKDAY_HEADERS;
  readonly weekHours = [
    '09:00',
    '10:00',
    '11:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
  ] as const;

  readonly viewMode = signal<CalendarViewMode>('month');
  readonly channelFilter = signal<ConsultationChannel | 'all'>('all');
  readonly cursorDate = signal<Date>(startOfDay(new Date()));
  readonly selectedDate = signal<string>(isoDate(new Date()));
  readonly tab = signal<'upcoming' | 'past'>('upcoming');

  private readonly isUpcoming = (c: Consultation) =>
    c.status === 'scheduled' ||
    (c.status !== 'cancelled' && new Date(c.at) >= startOfDay(new Date()));

  readonly filteredConsultations = computed(() => {
    const ch = this.channelFilter();
    return this.store
      .consultations()
      .filter((c) => c.status !== 'cancelled' && (ch === 'all' || c.channel === ch))
      .sort((a, b) => a.at.localeCompare(b.at));
  });

  readonly todayCount = computed(() => this.store.todaysConsultations().length);

  readonly todayBreakdownHint = computed(() => {
    const list = this.store.todaysConsultations();
    const clinic = list.filter((c) => c.channel === 'clinic').length;
    const online = list.length - clinic;
    return `${clinic} yüz yüze · ${online} online/uzaktan`;
  });

  readonly upcomingCount = computed(
    () => this.store.consultations().filter((c) => c.status === 'scheduled').length,
  );

  readonly doneCount = computed(
    () => this.store.consultations().filter((c) => c.status === 'done').length,
  );

  readonly avgAdherence = computed(() => {
    const rated = this.store
      .consultations()
      .filter((c) => c.status === 'done' && c.adherence !== null);
    if (!rated.length) return 0;
    return round1(rated.reduce((s, c) => s + (c.adherence ?? 0), 0) / rated.length);
  });

  readonly periodTitle = computed(() => {
    const cur = this.cursorDate();
    if (this.viewMode() === 'week') {
      const days = this.weekDays();
      const first = days[0]?.date ?? cur;
      const last = days[6]?.date ?? cur;
      const fmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
      return `${fmt.format(first)} – ${fmt.format(last)} ${last.getFullYear()}`;
    }
    return new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(cur);
  });

  readonly selectedDateLabel = computed(() => {
    const dt = new Date(`${this.selectedDate()}T12:00:00`);
    return new Intl.DateTimeFormat('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(dt);
  });

  readonly calendarCells = computed<CalendarDayCell[]>(() => {
    const cursor = this.cursorDate();
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    // Monday-based index (0 = Monday ... 6 = Sunday)
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - startOffset);
    const todayIso = isoDate(new Date());
    const all = this.filteredConsultations();

    return Array.from({ length: 42 }, (_, idx) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + idx);
      const iso = isoDate(date);
      const dayOfWeek = date.getDay();
      return {
        iso,
        date,
        dayNumber: date.getDate(),
        inCurrentMonth: date.getMonth() === month,
        isToday: iso === todayIso,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        items: all.filter((c) => isoDate(new Date(c.at)) === iso),
      };
    });
  });

  readonly weekDays = computed(() => {
    const cursor = this.cursorDate();
    const dayOffset = (cursor.getDay() + 6) % 7;
    const monday = new Date(cursor);
    monday.setDate(cursor.getDate() - dayOffset);
    const todayIso = isoDate(new Date());
    const weekdayFmt = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' });
    const all = this.filteredConsultations();

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const iso = isoDate(date);
      return {
        iso,
        date,
        weekdayShort: weekdayFmt.format(date),
        isToday: iso === todayIso,
        items: all.filter((c) => isoDate(new Date(c.at)) === iso),
      };
    });
  });

  readonly selectedDayConsultations = computed(() => {
    const target = this.selectedDate();
    return this.store
      .consultations()
      .filter((c) => c.status !== 'cancelled' && isoDate(new Date(c.at)) === target)
      .sort((a, b) => a.at.localeCompare(b.at));
  });

  readonly selectedDayAgendaSlots = computed(() => {
    const dayItems = this.selectedDayConsultations();
    const usedIds = new Set<string>();
    const slots: { time: string; consultation: Consultation | null }[] = [];

    for (const time of AGENDA_SLOTS) {
      const match = dayItems.find((c) => {
        const dt = new Date(c.at);
        const hh = String(dt.getHours()).padStart(2, '0');
        const mm = String(dt.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}` === time;
      });
      if (match) usedIds.add(match.id);
      slots.push({ time, consultation: match ?? null });
    }

    for (const extra of dayItems) {
      if (!usedIds.has(extra.id)) {
        const dt = new Date(extra.at);
        const time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
        slots.push({ time, consultation: extra });
      }
    }

    return slots.sort((a, b) => a.time.localeCompare(b.time));
  });

  readonly groups = computed(() => {
    const upcoming = this.tab() === 'upcoming';
    const ch = this.channelFilter();
    const list = this.store
      .consultations()
      .filter(
        (c) =>
          (ch === 'all' || c.channel === ch) &&
          (upcoming ? this.isUpcoming(c) : !this.isUpcoming(c)),
      )
      .sort((a, b) => (upcoming ? a.at.localeCompare(b.at) : b.at.localeCompare(a.at)));
    const fmt = new Intl.DateTimeFormat('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const todayKey = isoDate(new Date());
    const map = new Map<
      string,
      { key: string; label: string; today: boolean; items: Consultation[] }
    >();
    for (const item of list) {
      const key = isoDate(new Date(item.at));
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: fmt.format(new Date(item.at)),
          today: key === todayKey,
          items: [],
        });
      }
      map.get(key)!.items.push(item);
    }
    return [...map.values()];
  });

  navigatePeriod(delta: number): void {
    this.cursorDate.update((cur) => {
      const next = new Date(cur);
      if (this.viewMode() === 'week') {
        next.setDate(cur.getDate() + delta * 7);
      } else {
        next.setMonth(cur.getMonth() + delta, 1);
      }
      return next;
    });
  }

  goToToday(): void {
    const now = startOfDay(new Date());
    this.cursorDate.set(now);
    this.selectedDate.set(isoDate(now));
  }

  selectDay(iso: string): void {
    this.selectedDate.set(iso);
  }

  selectDayAndInspect(iso: string, item: Consultation): void {
    this.selectedDate.set(iso);
    if (item.status === 'scheduled') {
      this.qa.open('consultation-complete', item.clientId, item.id);
    } else {
      this.qa.open('client-detail', item.clientId);
    }
  }

  openScheduleAt(dateIso: string, time = '10:00'): void {
    this.selectedDate.set(dateIso);
    this.qa.open('consultation', undefined, undefined, dateIso, time);
  }

  consultationsInHour(dayIso: string, hourLabel: string): Consultation[] {
    const hourPrefix = hourLabel.slice(0, 2);
    return this.filteredConsultations().filter((c) => {
      const dt = new Date(c.at);
      return (
        isoDate(dt) === dayIso && String(dt.getHours()).padStart(2, '0') === hourPrefix
      );
    });
  }

  pillClass(item: Consultation): string {
    if (item.status === 'done') {
      return 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
    switch (item.channel) {
      case 'clinic':
        return 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200';
      case 'video':
        return 'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-200';
      case 'phone':
        return 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200';
      case 'message':
        return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200';
    }
  }

  cardClass(item: Consultation): string {
    if (item.status === 'done') {
      return 'border-slate-200 bg-slate-50/80 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300';
    }
    switch (item.channel) {
      case 'clinic':
        return 'border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-100';
      case 'video':
        return 'border-violet-200 bg-violet-50/70 text-violet-950 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-100';
      case 'phone':
        return 'border-sky-200 bg-sky-50/70 text-sky-950 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-100';
      case 'message':
        return 'border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100';
    }
  }

  async cancel(item: Consultation): Promise<void> {
    const confirmed = await this.notify.confirm({
      title: 'Görüşme iptal edilsin mi?',
      text: `${this.store.clientName(item.clientId)} ile planlanan görüşme iptal edilecek.`,
      confirmText: 'İptal et',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.store.cancelConsultation(item.id);
    this.notify.success('Görüşme iptal edildi');
  }

  sendWhatsAppReminder(item: Consultation): void {
    const clientName = this.store.clientName(item.clientId);
    const dt = new Date(item.at);
    const dateStr = dt.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
    });
    const timeStr = dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const channelLabel = this.labels[item.channel];
    const message = `Merhaba ${clientName}, OdivonDiet kliniğimizdeki ${dateStr} saat ${timeStr} (${channelLabel}) kontrol seansınızı hatırlatmak isteriz. Seans öncesi güncel tartı ve su takibinizi danışan portalınızdan girebilirsiniz. Sağlıklı günler dileriz!`;
    void globalThis.navigator?.clipboard?.writeText(message);
    this.notify.success(`${clientName} için WhatsApp randevu hatırlatma mesajı panoya kopyalandı.`);
  }
}
