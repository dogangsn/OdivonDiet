import { ACTIVITY_FACTORS, ActivityLevel, ProgramType, Sex, Tone } from './diet.models';

const DAY_MS = 86_400_000;

export function ageFrom(birthDate: string, today = new Date()): number {
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age--;
  return age;
}

export function bmi(weightKg: number, heightCm: number): number {
  const meters = heightCm / 100;
  return round1(weightKg / (meters * meters));
}

export interface BmiBand {
  readonly label: string;
  readonly tone: Tone;
}

export function bmiBand(value: number): BmiBand {
  if (value < 18.5) return { label: 'Zayıf', tone: 'info' };
  if (value < 25) return { label: 'Normal', tone: 'positive' };
  if (value < 30) return { label: 'Fazla kilolu', tone: 'warning' };
  return { label: 'Obez', tone: 'danger' };
}

/** Mifflin-St Jeor basal metabolic rate, kcal/day. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

export function tdee(bmrValue: number, activity: ActivityLevel): number {
  return Math.round(bmrValue * ACTIVITY_FACTORS[activity]);
}

/** A starting energy target for a program; the dietitian can always override it. */
export function suggestedKcal(tdeeValue: number, program: ProgramType): number {
  const delta: Record<ProgramType, number> = {
    weight_loss: -500,
    weight_gain: 350,
    sports: 250,
    clinical: 0,
    healthy: 0,
  };
  return Math.round((tdeeValue + delta[program]) / 10) * 10;
}

export function macroGrams(kcal: number, proteinPct: number, carbPct: number, fatPct: number) {
  return {
    protein: Math.round((kcal * proteinPct) / 100 / 4),
    carb: Math.round((kcal * carbPct) / 100 / 4),
    fat: Math.round((kcal * fatPct) / 100 / 9),
  };
}

/** Share of the way from start to target, clamped to 0–100. */
export function goalProgress(start: number, current: number, target: number): number {
  if (start === target) return 100;
  const pct = ((start - current) / (start - target)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function daysBetween(from: string | Date, to: string | Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export function startOfDay(value: string | Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isSameDay(a: string | Date, b: string | Date): boolean {
  return daysBetween(a, b) === 0;
}

export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase('tr'))
      .join('') || '?'
  );
}
