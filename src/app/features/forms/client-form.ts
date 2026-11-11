import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormField, email, form, max, min, required, submit } from '@angular/forms/signals';
import { DietStore } from '../../core/data/diet-store';
import { Notify } from '../../core/notify/notify';
import {
  ageFrom,
  bmi,
  bmiBand,
  bmr,
  estimatedWeeksToGoal,
  harrisBenedictBmr,
  idealWeightRange,
  isoDate,
  suggestedKcal,
  tdee,
  waistHipRisk,
  waterNeedLiters,
} from '../../domain/diet-calc';
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

const COMMON_CONDITIONS = [
  'İnsülin direnci',
  'Tip 2 diyabet',
  'Hipotiroidi',
  'PCOS',
  'Hipertansiyon',
  'Dislipidemi',
  'Reflü / Gastrit',
  'Demir eksikliği',
] as const;

const COMMON_ALLERGIES = [
  'Laktoz',
  'Gluten',
  'İnek sütü',
  'Yumurta',
  'Yer fıstığı',
  'Kuruyemiş',
  'Balık',
  'Soya',
] as const;

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
  waistCm: number | null;
  hipCm: number | null;
  bodyFatPct: number | null;
  waterTargetL: number | null;
  activity: ActivityLevel;
  program: ProgramType;
  conditions: string;
  allergies: string;
  clinicalNotes: string;
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
  waistCm: null,
  hipCm: null,
  bodyFatPct: null,
  waterTargetL: null,
  activity: 'light',
  program: 'weight_loss',
  conditions: '',
  allergies: '',
  clinicalNotes: '',
  consent: false,
};

@Component({
  selector: 'app-client-form',
  imports: [SlideOver, FormField, FormsModule],
  template: `
    <app-slide-over
      [open]="open()"
      [wide]="true"
      [dirty]="dirty()"
      icon="person_add"
      [eyebrow]="editing() ? 'Klinik danışan dosyası' : 'Yeni danışan kabul & anamnez'"
      [title]="editing() ? 'Danışan klinik profilini düzenle' : 'Detaylı danışan kaydı & metabolik analiz'"
      description="Demografik bilgiler, antropometrik çevre ölçümleri, Mifflin & Harris-Benedict bazal metabolizma hesabı ve klinik sağlık öyküsü."
      [submitLabel]="editing() ? 'Değişiklikleri kaydet' : 'Danışanı kaydet'"
      (closed)="qa.close()"
      (submitted)="save()"
    >
      <fieldset class="odv-card p-5">
        <legend class="sr-only">Kişisel bilgiler</legend>
        <h3 class="odv-section-title mb-4 text-sm">Kişisel ve iletişim bilgileri</h3>
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
            <span class="odv-label" id="sex-label">Biyolojik cinsiyet (BMR katsayısı için)</span>
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
        <legend class="sr-only">Program, antropometri ve metabolik analiz</legend>
        <h3 class="odv-section-title mb-4 text-sm">
          Antropometrik ölçümler ve enerji metabolizması
        </h3>
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

          <label class="block">
            <span class="odv-label">Bel çevresi (cm)</span>
            <input
              class="odv-input tabular"
              type="number"
              step="0.5"
              placeholder="Örn. 84"
              [ngModel]="model().waistCm"
              [ngModelOptions]="{ standalone: true }"
              (ngModelChange)="patchModel({ waistCm: $event ? +$event : null })"
            />
          </label>

          <label class="block">
            <span class="odv-label">Kalça çevresi (cm)</span>
            <input
              class="odv-input tabular"
              type="number"
              step="0.5"
              placeholder="Örn. 102"
              [ngModel]="model().hipCm"
              [ngModelOptions]="{ standalone: true }"
              (ngModelChange)="patchModel({ hipCm: $event ? +$event : null })"
            />
          </label>

          <label class="block">
            <span class="odv-label">Vücut yağ oranı (%)</span>
            <input
              class="odv-input tabular"
              type="number"
              step="0.1"
              placeholder="Örn. 28.5"
              [ngModel]="model().bodyFatPct"
              [ngModelOptions]="{ standalone: true }"
              (ngModelChange)="patchModel({ bodyFatPct: $event ? +$event : null })"
            />
          </label>

          <label class="block sm:col-span-1">
            <span class="odv-label">Fiziksel aktivite düzeyi (PAL)</span>
            <select class="odv-input" [formField]="f.activity">
              @for (option of activityOptions; track option[0]) {
                <option [value]="option[0]">{{ option[1] }}</option>
              }
            </select>
          </label>
          <label class="block sm:col-span-2">
            <span class="odv-label">Klinik beslenme programı</span>
            <select class="odv-input" [formField]="f.program">
              @for (option of programOptions; track option[0]) {
                <option [value]="option[0]">{{ option[1] }}</option>
              }
            </select>
          </label>
        </div>

        @if (preview(); as p) {
          <div
            class="mt-5 space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900/50 dark:bg-slate-800/60"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <strong class="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                Otomatik Klinik Metabolik & Antropometrik Analiz Raporu
              </strong>
              <span class="odv-badge" [class]="p.bandClass">BKİ {{ p.bmi }} · {{ p.band }}</span>
            </div>

            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div class="rounded-lg bg-white p-2.5 dark:bg-slate-900">
                <span class="odv-eyebrow">Bazal (Mifflin-St Jeor)</span>
                <strong class="tabular mt-1 block text-base">
                  {{ p.bmr }} <small class="text-xs text-slate-400">kcal</small>
                </strong>
                <span class="text-[11px] text-slate-500">Harris-Benedict: {{ p.hbBmr }} kcal</span>
              </div>

              <div class="rounded-lg bg-white p-2.5 dark:bg-slate-900">
                <span class="odv-eyebrow">Günlük İhtiyaç (TDEE)</span>
                <strong class="tabular mt-1 block text-base">
                  {{ p.tdee }} <small class="text-xs text-slate-400">kcal</small>
                </strong>
                <span class="text-[11px] text-violet-600 dark:text-violet-300">
                  Önerilen diyet: {{ p.suggested }} kcal
                </span>
              </div>

              <div class="rounded-lg bg-white p-2.5 dark:bg-slate-900">
                <span class="odv-eyebrow">İdeal Kilo Aralığı</span>
                <strong class="tabular mt-1 block text-base">
                  {{ p.idealMin }} – {{ p.idealMax }} <small class="text-xs text-slate-400">kg</small>
                </strong>
                <span class="text-[11px] text-slate-500">
                  Tahmini süre: ~{{ p.weeksToGoal }} hafta
                </span>
              </div>

              <div class="rounded-lg bg-white p-2.5 dark:bg-slate-900">
                <span class="odv-eyebrow">Su İhtiyacı & WHR</span>
                <strong class="tabular mt-1 block text-base">
                  {{ p.waterL }} <small class="text-xs text-slate-400">L / gün</small>
                </strong>
                @if (p.whr) {
                  <span class="text-[11px] text-slate-500">
                    Bel/Kalça: {{ p.whr.ratio }} ({{ p.whr.label }})
                  </span>
                } @else {
                  <span class="text-[11px] text-slate-400">35 ml/kg hidrasyon</span>
                }
              </div>
            </div>
          </div>
        }
      </fieldset>

      <fieldset class="odv-card p-5">
        <legend class="sr-only">Sağlık öyküsü</legend>
        <h3 class="odv-section-title mb-4 text-sm">Klinik sağlık öyküsü, tanılar ve alerjenler</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block">
              <span class="odv-label">Hastalıklar / klinik tanılar</span>
              <input
                class="odv-input"
                [formField]="f.conditions"
                placeholder="Örn. Tip 2 diyabet, hipotiroidi"
              />
            </label>
            <div class="mt-2 flex flex-wrap gap-1">
              @for (cond of commonConditions; track cond) {
                <button
                  type="button"
                  (click)="toggleConditionChip(cond)"
                  class="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 transition hover:border-violet-400 hover:text-violet-700 dark:border-slate-700 dark:text-slate-300"
                >
                  + {{ cond }}
                </button>
              }
            </div>
          </div>

          <div>
            <label class="block">
              <span class="odv-label">Besin alerjileri ve intoleranslar</span>
              <input
                class="odv-input"
                [formField]="f.allergies"
                placeholder="Örn. laktoz, gluten"
              />
            </label>
            <div class="mt-2 flex flex-wrap gap-1">
              @for (alg of commonAllergies; track alg) {
                <button
                  type="button"
                  (click)="toggleAllergyChip(alg)"
                  class="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 transition hover:border-rose-400 hover:text-rose-700 dark:border-slate-700 dark:text-slate-300"
                >
                  + {{ alg }}
                </button>
              }
            </div>
          </div>
        </div>

        <label class="mt-4 block">
          <span class="odv-label">Klinik anamnez, ilaç kullanımı ve beslenme öyküsü notları</span>
          <textarea
            class="odv-input min-h-20 resize-y"
            [ngModel]="model().clinicalNotes"
            [ngModelOptions]="{ standalone: true }"
            (ngModelChange)="patchModel({ clinicalNotes: $event })"
            placeholder="Kullandığı ilaçlar (Metformin, Levotiroksin vb.), uyku düzeni, su tüketimi, sevmediği besinler…"
          ></textarea>
        </label>

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
  readonly open = computed(() => {
    const kind = this.qa.state()?.kind;
    return kind === 'client-new' || kind === 'client-edit';
  });
  readonly editing = computed(() => this.qa.state()?.kind === 'client-edit');
  readonly activityOptions = Object.entries(ACTIVITY_LABELS);
  readonly programOptions = Object.entries(PROGRAM_LABELS);
  readonly commonConditions = COMMON_CONDITIONS;
  readonly commonAllergies = COMMON_ALLERGIES;

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
    const hbBmr = harrisBenedictBmr(v.sex, v.startWeightKg, v.heightCm, age);
    const tdeeValue = tdee(bmrValue, v.activity);
    const ideal = idealWeightRange(v.heightCm);
    const waterL = waterNeedLiters(v.startWeightKg, v.activity);
    const whr =
      v.waistCm && v.hipCm ? waistHipRisk(v.sex, v.waistCm, v.hipCm) : null;
    const weeksToGoal = estimatedWeeksToGoal(
      v.startWeightKg,
      v.targetWeightKg ?? v.startWeightKg,
    );
    return {
      bmi: bmiValue,
      band: band.label,
      bandClass: toneClass(band.tone),
      bmr: bmrValue,
      hbBmr,
      tdee: tdeeValue,
      suggested: suggestedKcal(tdeeValue, v.program),
      idealMin: ideal.minKg,
      idealMax: ideal.maxKg,
      waterL,
      whr,
      weeksToGoal,
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

  patchModel(patch: Partial<ClientDraft>): void {
    this.model.update((v) => ({ ...v, ...patch }));
  }

  toggleConditionChip(item: string): void {
    const list = splitList(this.model().conditions);
    const exists = list.some((x) => x.toLocaleLowerCase('tr') === item.toLocaleLowerCase('tr'));
    const next = exists
      ? list.filter((x) => x.toLocaleLowerCase('tr') !== item.toLocaleLowerCase('tr'))
      : [...list, item];
    this.patchModel({ conditions: next.join(', ') });
  }

  toggleAllergyChip(item: string): void {
    const list = splitList(this.model().allergies);
    const exists = list.some((x) => x.toLocaleLowerCase('tr') === item.toLocaleLowerCase('tr'));
    const next = exists
      ? list.filter((x) => x.toLocaleLowerCase('tr') !== item.toLocaleLowerCase('tr'))
      : [...list, item];
    this.patchModel({ allergies: next.join(', ') });
  }

  save(): void {
    void submit(this.f, async () => {
      const v = this.model();
      const state = this.qa.state();
      const existing =
        state?.kind === 'client-edit'
          ? this.store.clients().find((c) => c.id === state.clientId)
          : undefined;
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
        waistCm: v.waistCm ?? undefined,
        hipCm: v.hipCm ?? undefined,
        bodyFatPct: v.bodyFatPct ?? undefined,
        waterTargetL: v.waterTargetL ?? waterNeedLiters(v.startWeightKg!, v.activity),
        clinicalNotes: v.clinicalNotes.trim() || undefined,
        activity: v.activity,
        program: v.program,
        conditions: splitList(v.conditions),
        allergies: splitList(v.allergies),
        consentAt: v.consent ? (existing?.consentAt ?? isoDate(new Date())) : null,
        status: existing?.status ?? 'active',
      });
      this.notify.success(
        existing ? 'Değişiklikler kaydedildi' : 'Danışan eklendi',
        `${saved.firstName} ${saved.lastName}`,
      );
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
          waistCm: client.waistCm ?? null,
          hipCm: client.hipCm ?? null,
          bodyFatPct: client.bodyFatPct ?? null,
          waterTargetL: client.waterTargetL ?? null,
          activity: client.activity,
          program: client.program,
          conditions: client.conditions.join(', '),
          allergies: client.allergies.join(', '),
          clinicalNotes: client.clinicalNotes ?? '',
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
