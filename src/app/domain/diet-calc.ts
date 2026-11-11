import {
  ACTIVITY_FACTORS,
  ActivityLevel,
  ExchangeGroup,
  FoodItem,
  Meal,
  MealFoodItem,
  ProgramType,
  Sex,
  Tone,
} from './diet.models';

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

/** Harris-Benedict revised BMR for clinical comparison, kcal/day. */
export function harrisBenedictBmr(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
): number {
  if (sex === 'male') {
    return Math.round(88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age);
  }
  return Math.round(447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age);
}

export function tdee(bmrValue: number, activity: ActivityLevel): number {
  return Math.round(bmrValue * ACTIVITY_FACTORS[activity]);
}

/** Ideal body weight range (WHO BMI 18.5–24.9) and Devine reference weight. */
export function idealWeightRange(heightCm: number, sex: Sex = 'female') {
  const m = heightCm / 100;
  const minKg = round1(18.5 * m * m);
  const maxKg = round1(24.9 * m * m);
  const inchesOver5Ft = Math.max(0, (heightCm - 152.4) / 2.54);
  const devine = round1((sex === 'male' ? 50 : 45.5) + 2.3 * inchesOver5Ft);
  return { minKg, maxKg, min: minKg, max: maxKg, devine };
}

/** Recommended daily water intake in liters (35 ml/kg + activity adjustment). */
export function waterNeedLiters(weightKg: number, activity: ActivityLevel = 'light'): number {
  const bonus: Record<ActivityLevel, number> = {
    sedentary: 0,
    light: 0.2,
    moderate: 0.4,
    active: 0.6,
    very_active: 0.8,
  };
  return round1(weightKg * 0.035 + bonus[activity]);
}

/** Waist-to-Hip Ratio (WHR) cardiometabolic risk evaluation. */
export function waistHipRisk(
  sex: Sex,
  waistCm: number,
  hipCm: number,
): { ratio: number; label: string; tone: Tone } {
  const ratio = hipCm > 0 ? round2(waistCm / hipCm) : 0;
  const threshold = sex === 'male' ? 0.9 : 0.85;
  if (ratio < threshold - 0.05) return { ratio, label: 'Düşük risk', tone: 'positive' };
  if (ratio <= threshold) return { ratio, label: 'Sınırda risk', tone: 'warning' };
  return { ratio, label: 'Yüksek visseral risk', tone: 'danger' };
}

/** Estimated weeks to reach target weight assuming ~0.6 kg/week healthy pace. */
export function estimatedWeeksToGoal(startOrCurrentKg: number, targetKg: number): number {
  const diff = Math.abs(startOrCurrentKg - targetKg);
  if (diff < 0.2) return 0;
  return Math.max(1, Math.round(diff / 0.6));
}

/** Atwater energy formula: 4 kcal/g protein, 4 kcal/g carb, 9 kcal/g fat. */
export function atwaterKcal(proteinG: number, carbG: number, fatG: number): number {
  return Math.round(proteinG * 4 + carbG * 4 + fatG * 9);
}

/** Scales a FoodItem by portion multiplier into a MealFoodItem. */
export function scaleFoodItem(
  food: FoodItem,
  portions: number,
  alternative?: string,
): MealFoodItem {
  const factor = Math.max(0.1, portions);
  return {
    foodId: food.id,
    name: food.name,
    unit: food.unit,
    portions: round1(factor),
    grams: Math.round(food.grams * factor),
    kcal: Math.round(food.kcal * factor),
    proteinG: round1(food.proteinG * factor),
    carbG: round1(food.carbG * factor),
    fatG: round1(food.fatG * factor),
    fiberG: round1(food.fiberG * factor),
    exchange: food.exchange,
    alternative,
  };
}

export interface MealPlanNutritionSummary {
  readonly kcal: number;
  readonly proteinG: number;
  readonly carbG: number;
  readonly fatG: number;
  readonly fiberG: number;
  readonly proteinPct: number;
  readonly carbPct: number;
  readonly fatPct: number;
  readonly itemCount: number;
  readonly exchangeCounts: Record<ExchangeGroup, number>;
}

/** Aggregates calories, macros, percentages, fiber and exchange counts across a list of meals. */
export function summarizeMeals(meals: readonly Meal[]): MealPlanNutritionSummary {
  let kcal = 0;
  let proteinG = 0;
  let carbG = 0;
  let fatG = 0;
  let fiberG = 0;
  let itemCount = 0;
  const exchangeCounts: Record<ExchangeGroup, number> = {
    sut: 0,
    et: 0,
    ekmek: 0,
    sebze: 0,
    meyve: 0,
    yag: 0,
    kurubaklagil: 0,
    serbest: 0,
  };

  for (const meal of meals) {
    if (meal.items && meal.items.length > 0) {
      for (const item of meal.items) {
        kcal += item.kcal;
        proteinG += item.proteinG;
        carbG += item.carbG;
        fatG += item.fatG;
        fiberG += item.fiberG;
        itemCount++;
        exchangeCounts[item.exchange] = round1(
          (exchangeCounts[item.exchange] ?? 0) + item.portions,
        );
      }
    } else {
      kcal += meal.kcal;
      proteinG += meal.proteinG ?? 0;
      carbG += meal.carbG ?? 0;
      fatG += meal.fatG ?? 0;
      fiberG += meal.fiberG ?? 0;
    }
  }

  const pKcal = proteinG * 4;
  const cKcal = carbG * 4;
  const fKcal = fatG * 9;
  const macroEnergy = pKcal + cKcal + fKcal;

  let proteinPct = 25;
  let carbPct = 45;
  let fatPct = 30;
  if (macroEnergy > 0) {
    proteinPct = Math.round((pKcal / macroEnergy) * 100);
    carbPct = Math.round((cKcal / macroEnergy) * 100);
    fatPct = Math.max(0, 100 - proteinPct - carbPct);
  }

  return {
    kcal: Math.round(kcal),
    proteinG: round1(proteinG),
    carbG: round1(carbG),
    fatG: round1(fatG),
    fiberG: round1(fiberG),
    proteinPct,
    carbPct,
    fatPct,
    itemCount,
    exchangeCounts,
  };
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

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
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
