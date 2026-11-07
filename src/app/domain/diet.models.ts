export type Sex = 'female' | 'male';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type ProgramType = 'weight_loss' | 'weight_gain' | 'sports' | 'clinical' | 'healthy';
export type ClientStatus = 'active' | 'paused' | 'archived';
export type PlanStatus = 'draft' | 'active' | 'completed';
export type ConsultationChannel = 'clinic' | 'video' | 'phone' | 'message';
export type ConsultationStatus = 'scheduled' | 'done' | 'cancelled';

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
}

export interface Meal {
  readonly name: string;
  readonly time: string;
  readonly kcal: number;
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
