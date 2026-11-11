import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormField, email, form, max, min, required, submit } from '@angular/forms/signals';
import { SubscriptionStore } from '../../core/billing/subscription-store';
import { DietStore } from '../../core/data/diet-store';
import { ageFrom, bmi, bmiBand, bmr, isoDate, suggestedKcal, tdee } from '../../domain/diet-calc';
import {
  ACTIVITY_LABELS,
  ActivityLevel,
  PROGRAM_LABELS,
  ProgramType,
  Sex,
} from '../../domain/diet.models';
import { SlideOver } from '../../shared/ui/slide-over';
import { toneClass } from '../../shared/ui/tone';
import { QuickActions } from './quick-actions';
import { Notify } from '../../core/notify/notify';

interface ClientDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  sex: Sex;
  heightCm: number | null;
  startWeightKg: number | null;
  targetWeightKg: number | null;
  activity: ActivityLevel;
  program: ProgramType;
  conditions: string;
  allergies: string;
  consent: boolean;
}

const EMPTY: ClientDraft = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthDate: '',
  sex: 'female',
  heightCm: null,
  startWeightKg: null,
  targetWeightKg: null,
  activity: 'light',
  program: 'weight_loss',
  conditions: '',
  allergies: '',
  consent: false,
};

@Component({
  selector: 'app-client-form',
  imports: [SlideOver, FormField],
  template: `
    <app-slide-over
      [open]="open()"
      [wide]="true"
      [dirty]="dirty()"
      icon="person_add"
      [eyebrow]="editing() ? 'Danışan profili' : 'Yeni danışan'"
      [title]="editing() ? 'Profili düzenle' : 'Danışan ekle'"
      description="Kişisel bilgiler, başlangıç ölçüleri ve sağlık öyküsü."
      [submitLabel]="editing() ? 'Değişiklikleri kaydet' : 'Danışanı kaydet'"
      (closed)="qa.close()"
      (submitted)="save()"
    >
      <fieldset class="odv-card p-5">
        <legend class="sr-only">Kişisel bilgiler</legend>
        <h3 class="odv-section-title mb-4 text-sm">Kişisel bilgiler</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="odv-label">Ad <b class="text-rose-500">*</b></span>
            <input class="odv-input" [formField]="f.firstName" autocomplete="off" />
            @if (f.firstName().touched() && f.firstName().invalid()) {
              <span class="odv-error">Ad zorunludur.</span>
            }
          </label>
          <label class="block">
            <span class="odv-label">Soyad <b class="text-rose-500">*</b></span>
            <input class="odv-input" [formField]="f.lastName" autocomplete="off" />
            @if (f.lastName().touched() && f.lastName().invalid()) {
              <span class="odv-error">Soyad zorunludur.</span>
            }
          </label>
          <label class="block">
            <span class="odv-label">E-posta</span>
            <input class="odv-input" type="email" [formField]="f.email" autocomplete="off" />
            @if (f.email().touched() && f.email().invalid()) {
              <span class="odv-error">Geçerli bir e-posta girin.</span>
            }
          </label>
          <label class="block">
            <span class="odv-label">Telefon</span>
            <input class="odv-input" type="tel" [formField]="f.phone" autocomplete="off" />
          </label>
          <label class="block">
            <span class="odv-label">Doğum tarihi <b class="text-rose-500">*</b></span>
            <input class="odv-input" type="date" [formField]="f.birthDate" />
            @if (f.birthDate().touched() && f.birthDate().invalid()) {
              <span class="odv-error">Doğum tarihi zorunludur.</span>
            }
          </label>
          <div>
            <span class="odv-label" id="sex-label">Cinsiyet</span>
            <div class="odv-segment w-full" role="group" aria-labelledby="sex-label">
              <button
                type="button"
                class="odv-segment-item flex-1 justify-center"
                [attr.aria-pressed]="model().sex === 'female'"
                (click)="setSex('female')"
              >
                Kadın
              </button>
              <button
                type="button"
                class="odv-segment-item flex-1 justify-center"
                [attr.aria-pressed]="model().sex === 'male'"
                (click)="setSex('male')"
              >
                Erkek
              </button>
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset class="odv-card p-5">
        <legend class="sr-only">Program ve ölçüler</legend>
        <h3 class="odv-section-title mb-4 text-sm">Program ve ölçüler</h3>
        <div class="grid gap-4 sm:grid-cols-3">
          <label class="block">
            <span class="odv-label">Boy (cm) <b class="text-rose-500">*</b></span>
            <input class="odv-input tabular" type="number" [formField]="f.heightCm" />
            @if (f.heightCm().touched() && f.heightCm().invalid()) {
              <span class="odv-error">120–230 cm arası.</span>
            }
          </label>
          <label class="block">
            <span class="odv-label">Başlangıç kilosu (kg) <b class="text-rose-500">*</b></span>
            <input
              class="odv-input tabular"
              type="number"
              step="0.1"
              [formField]="f.startWeightKg"
            />
            @if (f.startWeightKg().touched() && f.startWeightKg().invalid()) {
              <span class="odv-error">30–300 kg arası.</span>
            }
          </label>
          <label class="block">
            <span class="odv-label">Hedef kilo (kg) <b class="text-rose-500">*</b></span>
            <input
              class="odv-input tabular"
              type="number"
              step="0.1"
              [formField]="f.targetWeightKg"
            />
            @if (f.targetWeightKg().touched() && f.targetWeightKg().invalid()) {
              <span class="odv-error">30–300 kg arası.</span>
            }
          </label>
          <label class="block sm:col-span-1">
            <span class="odv-label">Aktivite düzeyi</span>
            <select class="odv-input" [formField]="f.activity">
              @for (option of activityOptions; track option[0]) {
                <option [value]="option[0]">{{ option[1] }}</option>
              }
            </select>
          </label>
          <label class="block sm:col-span-2">
            <span class="odv-label">Program</span>
            <select class="odv-input" [formField]="f.program">
              @for (option of programOptions; track option[0]) {
                <option [value]="option[0]">{{ option[1] }}</option>
              }
            </select>
          </label>
        </div>
        @if (preview(); as p) {
          <div
            class="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 sm:grid-cols-4"
          >
            <div>
              <span class="odv-eyebrow">BKİ</span>
              <div class="mt-1 flex items-center gap-2">
                <strong class="tabular text-lg">{{ p.bmi }}</strong>
                <span class="odv-badge" [class]="p.bandClass">{{ p.band }}</span>
              </div>
            </div>
            <div>
              <span class="odv-eyebrow">Bazal (BMR)</span
              ><strong class="tabular mt-1 block text-lg"
                >{{ p.bmr }}
                <small class="text-xs font-semibold text-slate-400">kcal</small></strong
              >
            </div>
            <div>
              <span class="odv-eyebrow">Günlük ihtiyaç</span
              ><strong class="tabular mt-1 block text-lg"
                >{{ p.tdee }}
                <small class="text-xs font-semibold text-slate-400">kcal</small></strong
              >
            </div>
            <div>
              <span class="odv-eyebrow">Önerilen hedef</span
              ><strong class="tabular mt-1 block text-lg text-violet-600 dark:text-violet-300"
                >{{ p.suggested }}
                <small class="text-xs font-semibold text-slate-400">kcal</small></strong
              >
            </div>
          </div>
        }
      </fieldset>

      <fieldset class="odv-card p-5">
        <legend class="sr-only">Sağlık öyküsü</legend>
        <h3 class="odv-section-title mb-4 text-sm">Sağlık öyküsü</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="odv-label">Hastalıklar / tanılar</span>
            <input
              class="odv-input"
              [formField]="f.conditions"
              placeholder="Örn. Tip 2 diyabet, hipotiroidi"
            />
            <span class="odv-hint">Virgülle ayırın.</span>
          </label>
          <label class="block">
            <span class="odv-label">Alerji ve intoleranslar</span>
            <input class="odv-input" [formField]="f.allergies" placeholder="Örn. laktoz, gluten" />
            <span class="odv-hint">Virgülle ayırın.</span>
          </label>
        </div>
        <label
          class="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
        >
          <input type="checkbox" class="mt-0.5 size-4 accent-violet-600" [formField]="f.consent" />
          <span>
            <strong class="block text-sm">KVKK açık rızası alındı</strong>
            <span class="text-xs text-slate-500"
              >Sağlık verileri özel nitelikli kişisel veridir; işlemek için danışanın açık rızası
              gerekir.</span
            >
          </span>
        </label>
      </fieldset>
    </app-slide-over>
  `,
})
export class ClientForm {
  readonly qa = inject(QuickActions);
  private readonly store = inject(DietStore);
  private readonly notify = inject(Notify);
  private readonly subs = inject(SubscriptionStore);
  readonly open = computed(() => {
    const kind = this.qa.state()?.kind;
    return kind === 'client-new' || kind === 'client-edit';
  });
  readonly editing = computed(() => this.qa.state()?.kind === 'client-edit');
  readonly activityOptions = Object.entries(ACTIVITY_LABELS);
  readonly programOptions = Object.entries(PROGRAM_LABELS);
  readonly model = signal<ClientDraft>({ ...EMPTY });
  private readonly initial = signal<ClientDraft>({ ...EMPTY });
  readonly f = form(this.model, (p) => {
    required(p.firstName);
    required(p.lastName);
    email(p.email);
    required(p.birthDate);
    required(p.heightCm);
    min(p.heightCm, 120);
    max(p.heightCm, 230);
    required(p.startWeightKg);
    min(p.startWeightKg, 30);
    max(p.startWeightKg, 300);
    required(p.targetWeightKg);
    min(p.targetWeightKg, 30);
    max(p.targetWeightKg, 300);
  });
  readonly dirty = computed(() => JSON.stringify(this.model()) !== JSON.stringify(this.initial()));
  readonly preview = computed(() => {
    const v = this.model();
    if (!v.heightCm || !v.startWeightKg || !v.birthDate) return null;
    const age = ageFrom(v.birthDate);
    const bmiValue = bmi(v.startWeightKg, v.heightCm);
    const band = bmiBand(bmiValue);
    const bmrValue = bmr(v.sex, v.startWeightKg, v.heightCm, age);
    const tdeeValue = tdee(bmrValue, v.activity);
    return {
      bmi: bmiValue,
      band: band.label,
      bandClass: toneClass(band.tone),
      bmr: bmrValue,
      tdee: tdeeValue,
      suggested: suggestedKcal(tdeeValue, v.program),
    };
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const state = this.qa.state();
      untracked(() => this.load(state?.kind === 'client-edit' ? state.clientId : undefined));
    });
  }

  setSex(sex: Sex): void {
    this.model.update((v) => ({ ...v, sex }));
  }

  save(): void {
    void submit(this.f, async () => {
      const v = this.model();
      const state = this.qa.state();
      const existing =
        state?.kind === 'client-edit'
          ? this.store.clients().find((c) => c.id === state.clientId)
          : undefined;
      if (!existing && !this.subs.canAddClient(this.store.activeClients().length)) {
        const plan = this.subs.state()?.plan;
        this.notify.warning(
          'Danışan limitine ulaştınız',
          `${plan?.name ?? 'Mevcut'} paketi ${plan?.clientLimit ?? ''} aktif danışana kadar. Abonelik sayfasından paketinizi yükseltin.`,
        );
        return;
      }
      const saved = this.store.saveClient({
        id: existing?.id,
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        email: v.email.trim(),
        phone: v.phone.trim(),
        birthDate: v.birthDate,
        sex: v.sex,
        heightCm: v.heightCm!,
        startWeightKg: v.startWeightKg!,
        targetWeightKg: v.targetWeightKg!,
        activity: v.activity,
        program: v.program,
        conditions: splitList(v.conditions),
        allergies: splitList(v.allergies),
        consentAt: v.consent ? (existing?.consentAt ?? isoDate(new Date())) : null,
        status: existing?.status ?? 'active',
      });
      this.notify.success(existing ? 'Değişiklikler kaydedildi' : 'Danışan eklendi', `${saved.firstName} ${saved.lastName}`);
      this.qa.open('client-detail', saved.id);
    });
  }

  private load(clientId?: string): void {
    const client = clientId ? this.store.clients().find((c) => c.id === clientId) : undefined;
    const draft: ClientDraft = client
      ? {
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          birthDate: client.birthDate,
          sex: client.sex,
          heightCm: client.heightCm,
          startWeightKg: client.startWeightKg,
          targetWeightKg: client.targetWeightKg,
          activity: client.activity,
          program: client.program,
          conditions: client.conditions.join(', '),
          allergies: client.allergies.join(', '),
          consent: Boolean(client.consentAt),
        }
      : { ...EMPTY };
    this.model.set(draft);
    this.initial.set(draft);
    this.f().reset();
  }
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}
