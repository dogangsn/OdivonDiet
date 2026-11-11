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
