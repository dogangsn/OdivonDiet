export type Sex = 'female' | 'male';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type ProgramType = 'weight_loss' | 'weight_gain' | 'sports' | 'clinical' | 'healthy';
export type ClientStatus = 'active' | 'paused' | 'archived';
export type PlanStatus = 'draft' | 'active' | 'completed';
export type ConsultationChannel = 'clinic' | 'video' | 'phone' | 'message';
export type ConsultationStatus = 'scheduled' | 'done' | 'cancelled';

export type FoodCategory =
  | 'kahvaltilik'
  | 'sut_urunleri'
  | 'et_balik_tavuk'
  | 'tahil_ekmek'
  | 'kurubaklagil'
  | 'sebze'
  | 'meyve'
  | 'yag_kuruyemis'
  | 'yemek'
  | 'icecek'
  | 'paketli';

export type ExchangeGroup =
  | 'sut'
  | 'et'
  | 'ekmek'
  | 'sebze'
  | 'meyve'
  | 'yag'
  | 'kurubaklagil'
  | 'serbest';

export type GlycemicIndex = 'low' | 'medium' | 'high';

export interface FoodItem {
  readonly id: string;
  readonly name: string;
  readonly brand?: string;
  readonly category: FoodCategory;
  readonly exchange: ExchangeGroup;
  readonly unit: string;
  readonly grams: number;
  readonly kcal: number;
  readonly proteinG: number;
  readonly carbG: number;
  readonly fatG: number;
  readonly fiberG: number;
  readonly gi: GlycemicIndex;
  readonly allergens: readonly string[];
  readonly isCustom?: boolean;
}

export interface MealFoodItem {
  readonly foodId: string;
  readonly name: string;
  readonly unit: string;
  readonly portions: number;
  readonly grams: number;
  readonly kcal: number;
  readonly proteinG: number;
  readonly carbG: number;
  readonly fatG: number;
  readonly fiberG: number;
  readonly exchange: ExchangeGroup;
  readonly alternative?: string;
}

export interface Client {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
  readonly birthDate: string;
  readonly sex: Sex;
  readonly heightCm: number;
  readonly startWeightKg: number;
  readonly targetWeightKg: number;
  readonly activity: ActivityLevel;
  readonly program: ProgramType;
  readonly conditions: readonly string[];
  readonly allergies: readonly string[];
  readonly consentAt: string | null;
  readonly status: ClientStatus;
  readonly createdAt: string;
  readonly waistCm?: number | null;
  readonly hipCm?: number | null;
  readonly bodyFatPct?: number | null;
  readonly waterTargetL?: number | null;
  readonly clinicalNotes?: string;
}

export interface Measurement {
  readonly id: string;
  readonly clientId: string;
  readonly date: string;
  readonly weightKg: number;
  readonly waistCm: number | null;
  readonly hipCm: number | null;
  readonly bodyFatPct: number | null;
  readonly note: string;
  /** Who entered it. Missing means the dietitian (records from before the member portal). */
  readonly source?: 'dietitian' | 'member';
  /** Segmental BIA (InBody / Tanita) & regional circumference extensions. */
  readonly muscleMassKg?: number | null;
  readonly visceralFatRating?: number | null;
  readonly bodyWaterPct?: number | null;
  readonly ecwTbwRatio?: number | null;
  readonly metabolicAge?: number | null;
  readonly phaseAngleDeg?: number | null;
  readonly neckCm?: number | null;
  readonly armCm?: number | null;
  readonly thighCm?: number | null;
}

export interface LabPanel {
  readonly id: string;
  readonly clientId: string;
  readonly date: string;
  readonly fastingGlucoseMgDl: number | null;
  readonly fastingInsulinUiuMl: number | null;
  readonly hba1cPct: number | null;
  readonly triglyceridesMgDl: number | null;
  readonly hdlMgDl: number | null;
  readonly ldlMgDl: number | null;
  readonly ferritinNgMl: number | null;
  readonly vitaminDNgMl: number | null;
  readonly vitaminB12PgMl: number | null;
  readonly tshMiuL: number | null;
  readonly uricAcidMgDl: number | null;
  readonly crpMgL: number | null;
  readonly note?: string;
}

export interface MedicationEntry {
  readonly id: string;
  readonly clientId: string;
  readonly name: string;
  readonly activeIngredient:
    | 'metformin'
    | 'levothyroxine'
    | 'glp1_semaglutide'
    | 'glp1_tirzepatide'
    | 'statin'
    | 'warfarin'
    | 'orlistat'
    | 'iron_supplement'
    | 'ssri';
  readonly dosage: string;
  readonly schedule: string;
}

export interface SupplementProtocolItem {
  readonly id: string;
  readonly clientId: string;
  readonly name: string;
  readonly dose: string;
  readonly timing: 'morning_fasting' | 'with_breakfast' | 'with_lunch' | 'pre_workout' | 'bedtime';
  readonly clinicalReason: string;
  readonly durationWeeks: number;
}

export type Glp1Stage =
  | 'none'
  | 'glp1_initiation'
  | 'glp1_titration'
  | 'glp1_maintenance'
  | 'bariatric_liquid'
  | 'bariatric_puree'
  | 'bariatric_soft'
  | 'bariatric_regular';

export interface Glp1BariatricProfile {
  readonly clientId: string;
  readonly stage: Glp1Stage;
  readonly agentName: string;
  readonly weeklyDoseMg: number;
  readonly injectionDay: string;
  readonly giSymptomScore: number; // 1 (none) to 5 (severe nausea/reflux/constipation)
  readonly bristolStoolType: number; // 1..7 Bristol Stool Scale
  readonly resistanceTrainingDays: number;
  readonly notes: string;
}

export interface Meal {
  readonly name: string;
  readonly time: string;
  readonly kcal: number;
  readonly proteinG?: number;
  readonly carbG?: number;
  readonly fatG?: number;
  readonly fiberG?: number;
  readonly items?: readonly MealFoodItem[];
  readonly note?: string;
}

export interface MealPlan {
  readonly id: string;
  readonly clientId: string;
  readonly title: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly kcal: number;
  readonly proteinPct: number;
  readonly carbPct: number;
  readonly fatPct: number;
  readonly meals: readonly Meal[];
  readonly status: PlanStatus;
  readonly notes: string;
}

export interface Consultation {
  readonly id: string;
  readonly clientId: string;
  readonly at: string;
  readonly channel: ConsultationChannel;
  readonly status: ConsultationStatus;
  readonly adherence: number | null;
  readonly notes: string;
  readonly nextAction: string;
}

export interface ActivityEntry {
  readonly id: string;
  readonly at: string;
  readonly icon: string;
  readonly tone: Tone;
  readonly title: string;
  readonly detail: string;
}

export type Tone = 'primary' | 'positive' | 'warning' | 'danger' | 'info' | 'neutral';

export const PROGRAM_LABELS: Record<ProgramType, string> = {
  weight_loss: 'Kilo verme',
  weight_gain: 'Kilo alma',
  sports: 'Sporcu beslenmesi',
  clinical: 'Klinik beslenme',
  healthy: 'Sağlıklı yaşam',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Hareketsiz',
  light: 'Hafif aktif',
  moderate: 'Orta aktif',
  active: 'Aktif',
  very_active: 'Çok aktif',
};

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const CHANNEL_LABELS: Record<ConsultationChannel, string> = {
  clinic: 'Yüz yüze',
  video: 'Video görüşme',
  phone: 'Telefon',
  message: 'Mesaj takibi',
};

export const CHANNEL_ICONS: Record<ConsultationChannel, string> = {
  clinic: 'storefront',
  video: 'videocam',
  phone: 'call',
  message: 'chat',
};

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: 'Taslak',
  active: 'Aktif',
  completed: 'Tamamlandı',
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Aktif',
  paused: 'Duraklatıldı',
  archived: 'Arşivde',
};

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  kahvaltilik: 'Kahvaltılık & Yumurta',
  sut_urunleri: 'Süt, Yoğurt & Peynir',
  et_balik_tavuk: 'Et, Tavuk & Balık',
  tahil_ekmek: 'Tahıl, Ekmek & Yulaf',
  kurubaklagil: 'Kurubaklagiller',
  sebze: 'Sebze & Salata',
  meyve: 'Taze & Kuru Meyveler',
  yag_kuruyemis: 'Sağlıklı Yağ & Kuruyemiş',
  yemek: 'Ev & Klinik Yemekleri',
  icecek: 'İçecek & Fonksiyonel Destek',
  paketli: 'Paketli & Sporcu Ürünleri',
};

export const EXCHANGE_GROUP_LABELS: Record<ExchangeGroup, string> = {
  sut: 'Süt Değişimi',
  et: 'Et / Peynir Değişimi',
  ekmek: 'Ekmek / Tahıl Değişimi',
  sebze: 'Sebze Değişimi',
  meyve: 'Meyve Değişimi',
  yag: 'Yağ / Kuruyemiş Değişimi',
  kurubaklagil: 'Kurubaklagil Değişimi',
  serbest: 'Serbest Grup',
};

export const GI_LABELS: Record<GlycemicIndex, string> = {
  low: 'Düşük Gİ',
  medium: 'Orta Gİ',
  high: 'Yüksek Gİ',
};

export const SUPPLEMENT_TIMING_LABELS: Record<SupplementProtocolItem['timing'], string> = {
  morning_fasting: 'Sabah aç karnına (kahvaltıdan 45 dk önce)',
  with_breakfast: 'Kahvaltı ile birlikte (yağ içeren öğün)',
  with_lunch: 'Öğle yemeği ile birlikte',
  pre_workout: 'Egzersizden 30 dk önce',
  bedtime: 'Gece yatmadan 1 saat önce',
};

export const GLP1_STAGE_LABELS: Record<Glp1Stage, string> = {
  none: 'Standart Protokol (GLP-1 / Cerrahi Yok)',
  glp1_initiation: 'GLP-1 Başlangıç Fazı (0.25 mg · GI Adaptasyon)',
  glp1_titration: 'GLP-1 Doz Artırım / Titrasyon Fazı (0.5–1.7 mg)',
  glp1_maintenance: 'GLP-1 İdame & Kas Koruma Fazı',
  bariatric_liquid: 'Bariatrik Faz 1–2: Berrak & Tam Sıvı Dönemi',
  bariatric_puree: 'Bariatrik Faz 3: Püre & Yüksek Protein Dönemi',
  bariatric_soft: 'Bariatrik Faz 4: Yumuşak Katı Geçiş Dönemi',
  bariatric_regular: 'Bariatrik Faz 5: Uzun Dönem Metabolik Koruma',
};
