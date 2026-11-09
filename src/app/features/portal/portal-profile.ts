import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MemberPortal } from '../../core/data/member-portal';
import { ACTIVITY_LABELS, CHANNEL_ICONS, CHANNEL_LABELS, PROGRAM_LABELS } from '../../domain/diet.models';
import { Avatar } from '../../shared/ui/avatar';
import { PageHeader } from '../../shared/ui/page-header';
import { ConsentCard } from './consent-card';

@Component({
  selector: 'app-portal-profile',
  imports: [PageHeader, Avatar, ConsentCard, DatePipe, RouterLink],
  template: `
    @if (member.view(); as v) {
      <div class="animate-fade-up space-y-6">
        <app-page-header eyebrow="Hesap" title="Profilim" description="Diyetisyeninizin sizin için kaydettiği bilgiler.">
          <a actions routerLink="/portal/requests" [queryParams]="{ new: 'other' }" class="odv-btn-secondary">
            <span class="material-symbols-rounded !text-lg">edit</span>Düzeltme iste
          </a>
        </app-page-header>

        <section class="odv-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <app-avatar [name]="v.fullName" size="lg" />
          <div>
            <h2 class="text-xl font-extrabold">{{ v.fullName }}</h2>
            <p class="text-sm text-slate-500">{{ v.client.email }} · {{ v.client.phone }}</p>
            <p class="text-xs text-slate-400">Danışan kaydı: {{ v.client.createdAt | date: 'd MMMM y' }}</p>
          </div>
        </section>

        @if (v.client.consentAt) {
          <p class="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
            <span class="material-symbols-rounded !text-base" aria-hidden="true">verified_user</span>
            KVKK açık rızanızı {{ v.client.consentAt | date: 'd MMMM y' }} tarihinde verdiniz.
          </p>
        } @else {
          <app-consent-card />
        }

        <div class="grid gap-6 lg:grid-cols-2">
          <section class="odv-card p-5">
            <h2 class="odv-section-title mb-3">Kişisel ve sağlık bilgileri</h2>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt class="odv-eyebrow">Yaş</dt><dd class="font-semibold">{{ v.age }}</dd></div>
              <div><dt class="odv-eyebrow">Boy</dt><dd class="font-semibold">{{ v.client.heightCm }} cm</dd></div>
              <div><dt class="odv-eyebrow">Başlangıç kilosu</dt><dd class="font-semibold">{{ v.client.startWeightKg }} kg</dd></div>
              <div><dt class="odv-eyebrow">Hedef kilo</dt><dd class="font-semibold">{{ v.client.targetWeightKg }} kg</dd></div>
              <div><dt class="odv-eyebrow">Program</dt><dd class="font-semibold">{{ programs[v.client.program] }}</dd></div>
              <div><dt class="odv-eyebrow">Aktivite</dt><dd class="font-semibold">{{ activities[v.client.activity] }}</dd></div>
              <div class="col-span-2">
                <dt class="odv-eyebrow">Alerji / intolerans</dt>
                <dd class="mt-1 flex flex-wrap gap-1.5">
                  @for (a of v.client.allergies; track a) {
                    <span class="odv-badge odv-tone-danger">{{ a }}</span>
                  } @empty {
                    <span class="text-slate-500">Yok</span>
                  }
                </dd>
              </div>
              <div class="col-span-2">
                <dt class="odv-eyebrow">Sağlık durumu</dt>
                <dd class="mt-1 flex flex-wrap gap-1.5">
                  @for (c of v.client.conditions; track c) {
                    <span class="odv-badge odv-tone-warning">{{ c }}</span>
                  } @empty {
                    <span class="text-slate-500">Belirtilmedi</span>
                  }
                </dd>
              </div>
            </dl>
          </section>

          <section class="odv-card p-5">
            <h2 class="odv-section-title mb-3">Randevularım</h2>
            <ol class="space-y-3">
              @for (c of consultations(); track c.id) {
                <li class="flex items-start gap-3">
                  <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800"
                    ><span class="material-symbols-rounded !text-lg" aria-hidden="true">{{ channelIcons[c.channel] }}</span></span
                  >
                  <div class="min-w-0 flex-1 text-sm">
                    <div class="flex flex-wrap items-center gap-2">
                      <strong>{{ c.at | date: 'd MMM y, HH:mm' }}</strong>
                      @if (c.status === 'scheduled') {
                        <span class="odv-badge odv-tone-info">Planlandı</span>
                      } @else if (c.status === 'cancelled') {
                        <span class="odv-badge odv-tone-neutral">İptal</span>
                      } @else {
                        <span class="odv-badge odv-tone-positive">Yapıldı</span>
                      }
                    </div>
                    <span class="text-xs text-slate-500">{{ channelLabels[c.channel] }}</span>
                    @if (c.nextAction) {
                      <p class="mt-1 text-xs font-semibold text-violet-600 dark:text-violet-300">Öneri: {{ c.nextAction }}</p>
                    }
                  </div>
                </li>
              } @empty {
                <li class="text-sm text-slate-500">Henüz randevu yok.</li>
              }
            </ol>
          </section>
        </div>
      </div>
    }
  `,
})
export class PortalProfile {
  readonly member = inject(MemberPortal);
  readonly programs = PROGRAM_LABELS;
  readonly activities = ACTIVITY_LABELS;
  readonly channelIcons = CHANNEL_ICONS;
  readonly channelLabels = CHANNEL_LABELS;
  readonly consultations = computed(() => this.member.consultations().slice(0, 8));
}
