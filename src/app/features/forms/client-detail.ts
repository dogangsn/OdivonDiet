import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DietStore } from '../../core/data/diet-store';
import { PortalStore } from '../../core/data/portal-store';
import { PORTAL_ACCESS_LABELS } from '../../domain/portal.models';
import {
  ACTIVITY_LABELS,
  CHANNEL_ICONS,
  CHANNEL_LABELS,
  CLIENT_STATUS_LABELS,
  ClientStatus,
  PROGRAM_LABELS,
} from '../../domain/diet.models';
import { Avatar } from '../../shared/ui/avatar';
import { MacroBar } from '../../shared/ui/macro-bar';
import { ProgressBar } from '../../shared/ui/progress-bar';
import { SlideOver } from '../../shared/ui/slide-over';
import { toneClass } from '../../shared/ui/tone';
import { TrendChart } from '../../shared/ui/trend-chart';
import { QuickActions } from './quick-actions';
import { Notify } from '../../core/notify/notify';

@Component({
  selector: 'app-client-detail',
  imports: [SlideOver, Avatar, TrendChart, MacroBar, ProgressBar, DatePipe, DecimalPipe],
  template: `
    <app-slide-over
      [open]="open()"
      [wide]="true"
      [showSubmit]="false"
      icon="person"
      eyebrow="Danışan profili"
      [title]="view()?.fullName ?? 'Danışan'"
      (closed)="qa.close()"
    >
      @if (view(); as v) {
        <section class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <app-avatar [name]="v.fullName" size="lg" />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-xl font-extrabold tracking-tight">{{ v.fullName }}</h3>
              <span class="odv-badge" [class]="statusTone()">{{
                statusLabels[v.client.status]
              }}</span>
            </div>
            <p class="mt-0.5 text-sm text-slate-500">
              {{ v.age }} yaş · {{ v.client.sex === 'female' ? 'Kadın' : 'Erkek' }} ·
              {{ v.client.heightCm }} cm ·
              {{ programLabels[v.client.program] }}
            </p>
            <p class="mt-0.5 text-xs text-slate-400">{{ v.client.email }} · {{ v.client.phone }}</p>
            <div class="mt-2.5 flex flex-wrap gap-1.5">
              @for (item of v.client.allergies; track item) {
                <span class="odv-badge odv-tone-danger"
                  ><span class="material-symbols-rounded !text-sm">no_food</span>{{ item }}</span
                >
              }
              @for (item of v.client.conditions; track item) {
                <span class="odv-badge odv-tone-warning"
                  ><span class="material-symbols-rounded !text-sm">medical_information</span
                  >{{ item }}</span
                >
              }
              @if (v.client.consentAt) {
                <span class="odv-badge odv-tone-positive"
                  ><span class="material-symbols-rounded !text-sm">verified_user</span>KVKK
                  rızası</span
                >
              } @else {
                <span class="odv-badge odv-tone-danger"
                  ><span class="material-symbols-rounded !text-sm">policy</span>Rıza alınmadı</span
                >
              }
            </div>
          </div>
        </section>

        <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Özet ölçüler">
          <div class="odv-card p-4">
            <span class="odv-eyebrow">Güncel kilo</span>
            <strong class="tabular mt-1 block text-2xl font-extrabold"
              >{{ v.currentWeightKg | number: '1.0-1' }}
              <small class="text-xs text-slate-400">kg</small></strong
            >
            <span
              class="text-xs font-semibold"
              [class.text-emerald-600]="changeGood()"
              [class.text-amber-600]="!changeGood()"
            >
              {{ v.changeKg > 0 ? '+' : '' }}{{ v.changeKg | number: '1.0-1' }} kg başlangıçtan
            </span>
          </div>
          <div class="odv-card p-4">
            <span class="odv-eyebrow">BKİ</span>
            <strong class="tabular mt-1 block text-2xl font-extrabold">{{
              v.bmi | number: '1.1-1'
            }}</strong>
            <span class="odv-badge mt-0.5" [class]="bmiTone()">{{ v.bmiBand.label }}</span>
          </div>
          <div class="odv-card p-4">
            <span class="odv-eyebrow">Hedef · {{ v.client.targetWeightKg }} kg</span>
            <strong class="tabular mt-1 block text-2xl font-extrabold">%{{ v.progress }}</strong>
            <app-progress-bar class="mt-2" [value]="v.progress" label="Hedefe ilerleme" />
          </div>
          <div class="odv-card p-4">
            <span class="odv-eyebrow">Günlük ihtiyaç</span>
            <strong class="tabular mt-1 block text-2xl font-extrabold"
              >{{ v.tdee }} <small class="text-xs text-slate-400">kcal</small></strong
            >
            <span class="text-xs text-slate-500"
              >BMR {{ v.bmr }} · {{ activityLabels[v.client.activity] }}</span
            >
          </div>
        </section>

        <section class="odv-card p-5" aria-label="Danışan portalı">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 class="odv-section-title text-sm">Danışan portalı</h4>
              <p class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span class="odv-badge" [class]="accessTone()">{{ accessLabels[access().status] }}</span>
                @if (access().invitedAt && access().status === 'invited') {
                  <span>Davet: {{ access().invitedAt | date: 'd MMM' }}</span>
                }
                <span>{{ portalStats().openTasks }} açık görev</span>
                <span>{{ portalStats().openRequests }} açık talep</span>
                @if (portalStats().unread) {
                  <span class="font-bold text-violet-600">{{ portalStats().unread }} okunmamış mesaj</span>
                }
              </p>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button type="button" class="odv-btn-soft" (click)="goToChat(v.client.id)">
                <span class="material-symbols-rounded !text-base">forum</span>Mesaj
              </button>
              <button type="button" class="odv-btn-soft" (click)="qa.open('task', v.client.id)">
                <span class="material-symbols-rounded !text-base">add_task</span>Görev ata
              </button>
              @if (access().status === 'active') {
                <button type="button" class="odv-btn-ghost !min-h-9 text-rose-600" (click)="disablePortal()">
                  Erişimi kapat
                </button>
              } @else {
                <button type="button" class="odv-btn-primary !min-h-9" (click)="invite()">
                  <span class="material-symbols-rounded !text-base">mail</span>{{
                    access().status === 'none' ? 'Portala davet et' : 'Daveti yeniden gönder'
                  }}
                </button>
              }
            </div>
          </div>
        </section>

        <section class="odv-card p-5">
          <div class="mb-3 flex items-center justify-between">
            <h4 class="odv-section-title text-sm">Kilo trendi</h4>
            <button
              type="button"
              class="odv-btn-soft"
              (click)="qa.open('measurement', v.client.id)"
            >
              <span class="material-symbols-rounded !text-base">add</span>Ölçüm
            </button>
          </div>
          <app-trend-chart [points]="trend()" [target]="v.client.targetWeightKg" />
        </section>

        <section class="odv-card p-5">
          <div class="mb-3 flex items-center justify-between">
            <h4 class="odv-section-title text-sm">Aktif beslenme planı</h4>
            <button type="button" class="odv-btn-soft" (click)="qa.open('plan', v.client.id)">
              <span class="material-symbols-rounded !text-base">add</span>Yeni plan
            </button>
          </div>
          @if (v.activePlan; as plan) {
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <strong class="text-sm">{{ plan.title }}</strong>
              <span class="text-xs text-slate-500"
                >{{ plan.startDate | date: 'd MMM' }} – {{ plan.endDate | date: 'd MMM y' }}</span
              >
            </div>
            <p class="tabular mt-1 text-2xl font-extrabold">
              {{ plan.kcal }} <small class="text-xs text-slate-400">kcal / gün</small>
            </p>
            <app-macro-bar
              class="mt-3"
              [kcal]="plan.kcal"
              [protein]="plan.proteinPct"
              [carb]="plan.carbPct"
              [fat]="plan.fatPct"
              [detailed]="true"
            />
            <ul class="mt-4 grid gap-2 sm:grid-cols-2">
              @for (meal of plan.meals; track $index) {
                <li
                  class="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/60"
                >
                  <span class="tabular font-semibold text-slate-400">{{ meal.time }}</span>
                  <span class="font-bold">{{ meal.name }}</span>
                  <span class="tabular ms-auto text-slate-500">{{ meal.kcal }} kcal</span>
                </li>
              }
            </ul>
          } @else {
            <p class="text-sm text-slate-500">Bu danışanın aktif bir planı yok.</p>
          }
        </section>

        <section class="odv-card p-5">
          <div class="mb-3 flex items-center justify-between">
            <h4 class="odv-section-title text-sm">Görüşmeler</h4>
            <button
              type="button"
              class="odv-btn-soft"
              (click)="qa.open('consultation', v.client.id)"
            >
              <span class="material-symbols-rounded !text-base">event</span>Planla
            </button>
          </div>
          <ol class="space-y-3">
            @for (item of consultations(); track item.id) {
              <li class="flex gap-3">
                <span
                  class="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800"
                >
                  <span class="material-symbols-rounded !text-lg">{{
                    channelIcons[item.channel]
                  }}</span>
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2 text-xs">
                    <strong class="text-sm">{{ item.at | date: 'd MMM, HH:mm' }}</strong>
                    <span class="text-slate-400">{{ channelLabels[item.channel] }}</span>
                    @if (item.status === 'scheduled') {
                      <span class="odv-badge odv-tone-info">Planlandı</span>
                    } @else if (item.status === 'cancelled') {
                      <span class="odv-badge odv-tone-neutral">İptal</span>
                    } @else if (item.adherence) {
                      <span class="odv-badge odv-tone-warning"
                        ><span class="material-symbols-rounded icon-fill !text-sm">star</span
                        >{{ item.adherence }}/5</span
                      >
                    }
                  </div>
                  @if (item.notes) {
                    <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">{{ item.notes }}</p>
                  }
                  @if (item.nextAction) {
                    <p class="mt-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
                      → {{ item.nextAction }}
                    </p>
                  }
                </div>
              </li>
            } @empty {
              <li class="text-sm text-slate-500">Henüz görüşme yok.</li>
            }
          </ol>
        </section>
      }

      <div footer class="flex flex-wrap gap-2">
        @if (view(); as v) {
          <button
            type="button"
            class="odv-btn-secondary"
            (click)="qa.open('client-edit', v.client.id)"
          >
            <span class="material-symbols-rounded !text-lg">edit</span>Düzenle
          </button>
          @if (v.client.status === 'active') {
            <button type="button" class="odv-btn-ghost" (click)="changeStatus('paused')">
              Duraklat
            </button>
            <button
              type="button"
              class="odv-btn-ghost text-rose-600"
              (click)="changeStatus('archived')"
            >
              Arşivle
            </button>
          } @else {
            <button type="button" class="odv-btn-ghost" (click)="changeStatus('active')">
              Aktifleştir
            </button>
          }
        }
      </div>
    </app-slide-over>
  `,
})
export class ClientDetail {
  readonly qa = inject(QuickActions);
  private readonly store = inject(DietStore);
  private readonly portal = inject(PortalStore);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router);
  readonly accessLabels = PORTAL_ACCESS_LABELS;
  readonly programLabels = PROGRAM_LABELS;
  readonly activityLabels = ACTIVITY_LABELS;
  readonly statusLabels = CLIENT_STATUS_LABELS;
  readonly channelLabels = CHANNEL_LABELS;
  readonly channelIcons = CHANNEL_ICONS;
  readonly open = computed(() => this.qa.state()?.kind === 'client-detail');
  readonly view = computed(() => {
    const id = this.qa.state()?.clientId;
    return id ? this.store.view(id) : undefined;
  });
  readonly trend = computed(() => {
    const v = this.view();
    return v
      ? this.store.measurementsFor(v.client.id).map((m) => ({ date: m.date, value: m.weightKg }))
      : [];
  });
  readonly consultations = computed(() => {
    const v = this.view();
    if (!v) return [];
    return this.store
      .consultations()
      .filter((c) => c.clientId === v.client.id)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 5);
  });
  readonly changeGood = computed(() => {
    const v = this.view();
    if (!v) return true;
    const wantsLoss = v.client.targetWeightKg < v.client.startWeightKg;
    return wantsLoss ? v.changeKg <= 0 : v.changeKg >= 0;
  });
  readonly bmiTone = computed(() => toneClass(this.view()?.bmiBand.tone ?? 'neutral'));
  readonly statusTone = computed(() => {
    const status = this.view()?.client.status;
    return toneClass(
      status === 'active' ? 'positive' : status === 'paused' ? 'warning' : 'neutral',
    );
  });

  readonly access = computed(() => this.portal.accessFor(this.view()?.client.id ?? ''));
  readonly accessTone = computed(() => {
    const status = this.access().status;
    return toneClass(status === 'active' ? 'positive' : status === 'invited' ? 'info' : 'neutral');
  });
  readonly portalStats = computed(() => {
    const id = this.view()?.client.id;
    const summary = this.portal.conversations().find((c) => c.clientId === id);
    return {
      openTasks: summary?.openTasks ?? 0,
      openRequests: summary?.openRequests ?? 0,
      unread: summary?.unread ?? 0,
    };
  });

  goToChat(clientId: string): void {
    this.qa.close();
    void this.router.navigate(['/messages'], { queryParams: { client: clientId } });
  }

  async invite(): Promise<void> {
    const v = this.view();
    if (!v) return;
    const confirmed = await this.notify.confirm({
      title: 'Portala davet edilsin mi?',
      text: `${v.client.email} adresine giriş bağlantısı gönderilir. Danışan planını, ölçümlerini ve görevlerini görür, size mesaj yazabilir.`,
      confirmText: 'Davet gönder',
      tone: 'primary',
    });
    if (!confirmed) return;
    this.portal.invite(v.client.id);
    this.notify.success('Davet gönderildi', `${v.client.email} adresine giriş bağlantısı iletildi.`);
  }

  async disablePortal(): Promise<void> {
    const v = this.view();
    if (!v) return;
    const confirmed = await this.notify.confirm({
      title: 'Portal erişimi kapatılsın mı?',
      text: `${v.fullName} portala giriş yapamaz. Mesaj geçmişi saklanır.`,
      confirmText: 'Erişimi kapat',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.portal.disable(v.client.id);
    this.notify.info('Portal erişimi kapatıldı', `${v.fullName} artık portala giriş yapamaz.`);
  }

  async changeStatus(status: ClientStatus): Promise<void> {
    const v = this.view();
    if (!v) return;
    if (status === 'archived') {
      const confirmed = await this.notify.confirm({
        title: 'Danışan arşivlensin mi?',
        text: `${v.fullName} aktif listeden kaldırılır. Arşivden istediğiniz zaman geri alabilirsiniz.`,
        confirmText: 'Arşivle',
        tone: 'danger',
      });
      if (!confirmed) return;
    }
    this.store.setClientStatus(v.client.id, status);
    this.notify.success(status === 'archived' ? 'Danışan arşivlendi' : 'Danışan durumu güncellendi');
  }
}
