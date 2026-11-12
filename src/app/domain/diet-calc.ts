import {
  ACTIVITY_FACTORS,
  ActivityLevel,
  ExchangeGroup,
  FoodItem,
  LabPanel,
  Meal,
  MealFoodItem,
  MedicationEntry,
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

/** Lean body mass (LBM / FFM) in kg from bodyFatPct or Boer anthropometric equation. */
export function leanBodyMassKg(
  weightKg: number,
  bodyFatPct: number | null | undefined,
  heightCm: number,
  sex: Sex,
): number {
  if (bodyFatPct !== null && bodyFatPct !== undefined && bodyFatPct > 2 && bodyFatPct < 70) {
    return round1(weightKg * (1 - bodyFatPct / 100));
  }
  const boer =
    sex === 'male'
      ? 0.407 * weightKg + 0.267 * heightCm - 19.2
      : 0.252 * weightKg + 0.473 * heightCm - 48.3;
  return round1(Math.max(25, boer));
}

/** Katch-McArdle BMR based on Lean Body Mass (ideal when BIA body fat % is known). */
export function katchMcArdleBmr(lbmKg: number): number {
  return Math.round(370 + 21.6 * lbmKg);
}

/** Cunningham BMR equation for athletes & high-muscle-mass individuals. */
export function cunninghamBmr(lbmKg: number): number {
  return Math.round(500 + 22 * lbmKg);
}

/** US Navy circumference-based body fat percentage estimation. */
export function usNavyBodyFatPct(
  sex: Sex,
  heightCm: number,
  waistCm: number | null | undefined,
  neckCm: number | null | undefined,
  hipCm?: number | null,
): number | null {
  if (!waistCm || !neckCm || heightCm <= 0) return null;
  if (sex === 'male') {
    if (waistCm <= neckCm) return null;
    const val =
      495 /
        (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) -
      450;
    return round1(Math.max(3, Math.min(60, val)));
  }
  if (!hipCm || waistCm + hipCm <= neckCm) return null;
  const val =
    495 /
      (1.29579 -
        0.35004 * Math.log10(waistCm + hipCm - neckCm) +
        0.221 * Math.log10(heightCm)) -
    450;
  return round1(Math.max(5, Math.min(65, val)));
}

/** HOMA-IR insulin resistance index: (Fasting Glucose mg/dL * Fasting Insulin uIU/mL) / 405. */
export function homaIr(
  fastingGlucoseMgDl: number | null | undefined,
  fastingInsulinUiuMl: number | null | undefined,
): { value: number | null; label: string; tone: Tone; recommendation: string } {
  if (!fastingGlucoseMgDl || !fastingInsulinUiuMl) {
    return {
      value: null,
      label: 'Veri bekleniyor',
      tone: 'neutral',
      recommendation: 'Açlık glukozu ve açlık insülini girildiğinde otomatik hesaplanır.',
    };
  }
  const value = round2((fastingGlucoseMgDl * fastingInsulinUiuMl) / 405);
  if (value < 1.9) {
    return {
      value,
      label: 'İnsülin duyarlılığı normal',
      tone: 'positive',
      recommendation: 'Mevcut kompleks karbonhidrat ve lif dengesi korunabilir.',
    };
  }
  if (value <= 2.5) {
    return {
      value,
      label: 'Sınırda insülin direnci',
      tone: 'warning',
      recommendation:
        'Düşük Gİ tahıllar, öğünlerde önce sebze/protein sıralaması ve akşam 19:30 sonrası karbonhidrat kısıtlaması önerilir.',
    };
  }
  return {
    value,
    label: 'Klinik insülin direnci (>2,5)',
    tone: 'danger',
    recommendation:
      'Rafine karbonhidratları tamamen çıkarın, günlük çözünür lifi ≥30 g düzeyine çıkarın, öğün sonrası 15 dk yürüyüş ve 14:10 sirkadiyen beslenme penceresi uygulayın.',
  };
}

/** TG / HDL atherogenic ratio (surrogate marker for small dense LDL & metabolic syndrome). */
export function atherogenicIndex(
  triglyceridesMgDl: number | null | undefined,
  hdlMgDl: number | null | undefined,
): { ratio: number | null; label: string; tone: Tone; recommendation: string } {
  if (!triglyceridesMgDl || !hdlMgDl || hdlMgDl <= 0) {
    return {
      ratio: null,
      label: 'Veri bekleniyor',
      tone: 'neutral',
      recommendation: 'Trigliserid ve HDL değerleri girildiğinde hesaplanır.',
    };
  }
  const ratio = round2(triglyceridesMgDl / hdlMgDl);
  if (ratio < 2.0) {
    return {
      ratio,
      label: 'Optimal kardiyometabolik profil (<2,0)',
      tone: 'positive',
      recommendation: 'Tekli doymamış yağ (zeytinyağı) ve omega-3 dengesi ideal.',
    };
  }
  if (ratio <= 3.5) {
    return {
      ratio,
      label: 'Orta aterojenik risk (2,0–3,5)',
      tone: 'warning',
      recommendation:
        'Fruktoz/basit şeker yükünü azaltın; haftada 2–3 kez yağlı balık veya 2000 mg EPA+DHA ekleyin.',
    };
  }
  return {
    ratio,
    label: 'Yüksek aterojenik risk (>3,5)',
    tone: 'danger',
    recommendation:
      'Küçük yoğun LDL riski yüksek: rafine un/şeker kesilmeli, MUFA/PUFA oranı artırılmalı ve alkol/meyve suyu sıfırlanmalıdır.',
  };
}

export interface DrugNutrientAlert {
  readonly severity: 'danger' | 'warning' | 'info';
  readonly title: string;
  readonly mechanism: string;
  readonly action: string;
}

/** Cross-checks active medications, lab biomarkers, and meal items for clinical interactions. */
export function analyzeDrugNutrientInteractions(
  medications: readonly MedicationEntry[],
  lab: LabPanel | undefined,
  meals: readonly Meal[],
  proteinPerKg: number,
): DrugNutrientAlert[] {
  const alerts: DrugNutrientAlert[] = [];
  const allFoodNames = meals
    .flatMap((m) => m.items ?? [])
    .map((i) => i.name.toLocaleLowerCase('tr'));

  for (const med of medications) {
    if (med.activeIngredient === 'levothyroxine') {
      const breakfast = meals[0];
      const hasCalciumOrFiberInBreakfast = (breakfast?.items ?? []).some(
        (i) =>
          i.exchange === 'sut' ||
          i.name.toLocaleLowerCase('tr').includes('peynir') ||
          i.name.toLocaleLowerCase('tr').includes('yulaf') ||
          i.name.toLocaleLowerCase('tr').includes('ceviz'),
      );
      alerts.push({
        severity: hasCalciumOrFiberInBreakfast ? 'warning' : 'info',
        title: `${med.name} (Levotiroksin) — Kalsiyum, Demir & Lif Emilim Çakışması`,
        mechanism:
          'Süt ürünleri, ceviz, soya, yüksek lif ve demir/kalsiyum takviyeleri L-tiroksin ile gastrointestinal lümende şelat oluşturarak emilimi %30–45 düşürür.',
        action:
          'İlacı sabah kahvaltıdan en az 45–60 dk önce sadece su ile alın; kalsiyum ve demir takviyelerini en az 4 saat ayırın.',
      });
    }

    if (med.activeIngredient === 'metformin') {
      const lowB12 = lab?.vitaminB12PgMl !== null && lab?.vitaminB12PgMl !== undefined && lab.vitaminB12PgMl < 350;
      alerts.push({
        severity: lowB12 ? 'danger' : 'warning',
        title: `${med.name} (Metformin) — Vitamin B12 & Folat Malabsorpsiyon Riski`,
        mechanism:
          'Uzun süreli metformin kullanımı ileal kalsiyum bağımlı intrinsik faktör-B12 kompleks emilimini baskılar.',
        action: lowB12
          ? `Güncel B12 (${lab?.vitaminB12PgMl} pg/mL) sınırın altında! Günlük sublingual Metilkobalamin (1000 mcg) protokolü başlatın.`
          : 'Yıllık serum B12/Homosistein takibi yapın ve ilacı GI intoleransı azaltmak için ana öğün ortasında alın.',
      });
    }

    if (
      med.activeIngredient === 'glp1_semaglutide' ||
      med.activeIngredient === 'glp1_tirzepatide'
    ) {
      const lowProtein = proteinPerKg < 1.3;
      alerts.push({
        severity: lowProtein ? 'danger' : 'info',
        title: `${med.name} (GLP-1 / GIP Agonisti) — Sarkopeni & Mide Boşalma Gecikmesi`,
        mechanism:
          'GLP-1 agonistleri iştahı güçlü baskılarken yeterli protein ve direnç egzersizi olmazsa verilen kilonun %25–40’ı iskelet kasından kaybedilebilir; yüksek yağlı öğünler bulantı/reflü tetikler.',
        action: lowProtein
          ? `Mevcut plan proteini (${proteinPerKg} g/kg) GLP-1 protokolü için yetersiz! En az 1,5 g/kg protein ve düşük hacimli/yüksek yoğunluklu öğünlere geçin.`
          : 'Öğünlerde protein önceliğini koruyun, enjeksiyon günlerinde kızartma/yüksek yağdan kaçının ve ≥2,5 L elektrolitli sıvı tüketin.',
      });
    }

    if (med.activeIngredient === 'statin') {
      alerts.push({
        severity: 'warning',
        title: `${med.name} (Statin) — CYP3A4 (Greyfurt/Nar) & Koenzim Q10 Etkileşimi`,
        mechanism:
          'Furanokumarin içeren greyfurt/pomelo bağırsak CYP3A4 enzimini inhibe ederek statin toksisitesini artırır; mevalonat yolu blokajı endojen CoQ10 sentezini azaltır.',
        action:
          'Greyfurt suyunu tamamen yasaklayın; kas ağrısı/miyopati varsa akşam öğünüyle 100–200 mg Ubiquinol (CoQ10) değerlendirin.',
      });
    }

    if (med.activeIngredient === 'warfarin') {
      const hasHighVitK = allFoodNames.some(
        (n) => n.includes('ıspanak') || n.includes('brokoli') || n.includes('roka') || n.includes('maydanoz'),
      );
      alerts.push({
        severity: 'danger',
        title: `${med.name} (Warfarin) — K Vitamini Dalgalanması & INR Güvenliği`,
        mechanism:
          'Koyu yeşil yapraklı sebzelerdeki K1 vitamini miktarının günden güne ani değişmesi INR hedefini bozar.',
        action: hasHighVitK
          ? 'Menüde koyu yeşil yapraklı sebze bulunuyor: tamamen yasaklamak yerine her gün sabit porsiyonda (değişim eşdeğeri) tutarak INR istikrarını koruyun.'
          : 'K vitamini içeren yeşillikleri ani artırmayın; yüksek doz E vitamini ve balık yağı (>2 g) kullanımında kanama riskini izleyin.',
      });
    }
  }

  return alerts;
}

export interface SarcopeniaAssessment {
  readonly muscleLossRatioPct: number | null;
  readonly riskLevel: 'low' | 'moderate' | 'high';
  readonly tone: Tone;
  readonly headline: string;
  readonly minProteinGrams: number;
  readonly protocolSteps: readonly string[];
}

/** Evaluates lean mass preservation vs sarcopenic muscle loss during weight reduction. */
export function evaluateSarcopeniaRisk(
  weightChangeKg: number,
  muscleChangeKg: number | null,
  idealWeightKg: number,
  proteinPerKg: number,
  isGlp1OrBariatric: boolean,
): SarcopeniaAssessment {
  const minProteinGrams = Math.round(idealWeightKg * (isGlp1OrBariatric ? 1.6 : 1.3));
  let muscleLossRatioPct: number | null = null;

  if (weightChangeKg < -0.5 && muscleChangeKg !== null && muscleChangeKg < 0) {
    muscleLossRatioPct = Math.min(100, Math.round((Math.abs(muscleChangeKg) / Math.abs(weightChangeKg)) * 100));
  }

  if ((muscleLossRatioPct !== null && muscleLossRatioPct >= 25) || (isGlp1OrBariatric && proteinPerKg < 1.2)) {
    return {
      muscleLossRatioPct,
      riskLevel: 'high',
      tone: 'danger',
      headline: 'Yüksek Sarkopeni & Kas Kaybı Riski (Acil Müdahale)',
      minProteinGrams,
      protocolSteps: [
        `Günlük proteini en az ${minProteinGrams} g (1,6 g/kg İdeal Ağırlık) tabanına çıkarın.`,
        'Her ana öğünde lösin eşiği (≥2,5–3 g Lösin / ~30 g yüksek biyoyararlanımlı protein) sağlayın.',
        'Haftada en az 3 gün progresif direnç egzersizi ve günlük 3–5 g Kreatin Monohidrat ekleyin.',
        'Kalori açığını TDEE üzerinden maksimum 400–500 kcal ile sınırlandırın.',
      ],
    };
  }

  if ((muscleLossRatioPct !== null && muscleLossRatioPct >= 15) || proteinPerKg < 1.4) {
    return {
      muscleLossRatioPct,
      riskLevel: 'moderate',
      tone: 'warning',
      headline: 'Sınırda Kas Koruma — Protein Dağılımını Optimize Edin',
      minProteinGrams,
      protocolSteps: [
        `Günlük hedef proteini ${minProteinGrams} g seviyesinde tutun ve 3–4 öğüne eşit dağıtın.`,
        'Kahvaltı ve antrenman sonrası öğünde en az 25–30 g protein bulundurun.',
        'BIA takiplerinde Faz Açısı (≥5,5°) ve ECW/TBW (<0,390) değerlerini izleyin.',
      ],
    };
  }

  return {
    muscleLossRatioPct: muscleLossRatioPct ?? 8,
    riskLevel: 'low',
    tone: 'positive',
    headline: 'Optimal Yağ Kaybı & Yağsız Kütle Korunumu',
    minProteinGrams,
    protocolSteps: [
      'Verilen kilonun >%85’i yağ dokusundan gerçekleşiyor; mevcut makro ve egzersiz dengesini koruyun.',
      `Günlük ≥${minProteinGrams} g protein ve hidrasyon hedefine devam edin.`,
    ],
  };
}

export interface ChronoGlycemicPoint {
  readonly hourLabel: string;
  readonly glucoseMgDl: number;
  readonly mealName?: string;
}

export interface ChronoNutritionSummary {
  readonly firstMealTime: string;
  readonly lastMealTime: string;
  readonly eatingWindowHours: number;
  readonly fastingWindowHours: number;
  readonly lateNightKcalPct: number;
  readonly circadianScore: number;
  readonly tone: Tone;
  readonly curve: readonly ChronoGlycemicPoint[];
  readonly recommendation: string;
}

/** Simulates circadian eating window, overnight fasting hours, and post-prandial glycemic curve. */
export function analyzeChronoNutrition(meals: readonly Meal[]): ChronoNutritionSummary {
  if (!meals.length) {
    return {
      firstMealTime: '08:00',
      lastMealTime: '19:00',
      eatingWindowHours: 11,
      fastingWindowHours: 13,
      lateNightKcalPct: 0,
      circadianScore: 90,
      tone: 'positive',
      curve: [],
      recommendation: 'Öğün saatleri eklendiğinde sirkadiyen analiz oluşturulur.',
    };
  }

  const parseMinutes = (t: string): number => {
    const [h, m] = t.split(':').map((x) => Number(x) || 0);
    return h * 60 + m;
  };

  const sorted = [...meals].sort((a, b) => parseMinutes(a.time) - parseMinutes(b.time));
  const firstMin = parseMinutes(sorted[0].time);
  const lastMin = parseMinutes(sorted[sorted.length - 1].time);
  const spanMin = Math.max(60, lastMin - firstMin);
  const eatingWindowHours = round1(spanMin / 60);
  const fastingWindowHours = round1(Math.max(0, 24 - eatingWindowHours));

  const totalKcal = sorted.reduce((s, m) => s + m.kcal, 0) || 1;
  const lateKcal = sorted
    .filter((m) => parseMinutes(m.time) >= 19 * 60 + 30)
    .reduce((s, m) => s + m.kcal, 0);
  const lateNightKcalPct = Math.round((lateKcal / totalKcal) * 100);

  let circadianScore = 100;
  if (eatingWindowHours > 12) circadianScore -= Math.round((eatingWindowHours - 12) * 8);
  if (lateNightKcalPct > 25) circadianScore -= Math.round((lateNightKcalPct - 25) * 0.8);
  circadianScore = Math.max(40, Math.min(98, circadianScore));

  const tone: Tone =
    circadianScore >= 82 ? 'positive' : circadianScore >= 68 ? 'warning' : 'danger';

  const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
  const curve: ChronoGlycemicPoint[] = hours.map((h) => {
    const hMin = h * 60;
    let baseline = 88;
    let matchedMeal: string | undefined;

    for (const meal of sorted) {
      const mMin = parseMinutes(meal.time);
      const diff = hMin - mMin;
      if (Math.abs(diff) <= 35) matchedMeal = meal.name;
      if (diff >= -15 && diff <= 120) {
        const carb = meal.carbG ?? (meal.kcal * 0.45) / 4;
        const fiber = meal.fiberG ?? 3;
        const protein = meal.proteinG ?? (meal.kcal * 0.25) / 4;
        const netSurge = Math.max(8, carb * 0.85 - fiber * 2.2 - protein * 0.35);
        const peakFactor = diff <= 45 ? (diff + 20) / 65 : Math.max(0, 1 - (diff - 45) / 85);
        baseline += Math.round(netSurge * peakFactor);
      }
    }

    return {
      hourLabel: `${String(h).padStart(2, '0')}:00`,
      glucoseMgDl: Math.min(165, baseline),
      mealName: matchedMeal,
    };
  });

  const recommendation =
    lateNightKcalPct > 25
      ? `Günlük enerjinin %${lateNightKcalPct}’i 19:30 sonrasında alınıyor. Melatonin yükselişiyle çakışmaması için akşam kalorisini öğle/ikindiye kaydırın.`
      : eatingWindowHours <= 11.5
        ? `${eatingWindowHours} saatlik beslenme / ${fastingWindowHours} saatlik sirkadiyen açlık penceresi insülin duyarlılığı ve otofaji için ideal.`
        : `Beslenme penceresini ${eatingWindowHours} saatten 10–11 saate (örn. 08:30–19:00) daraltmak gece büyüme hormonu ve glisemik kontrolü güçlendirir.`;

  return {
    firstMealTime: sorted[0].time,
    lastMealTime: sorted[sorted.length - 1].time,
    eatingWindowHours,
    fastingWindowHours,
    lateNightKcalPct,
    circadianScore,
    tone,
    curve,
    recommendation,
  };
}

export interface GroceryListItem {
  readonly foodId: string;
  readonly name: string;
  readonly exchange: ExchangeGroup;
  readonly unit: string;
  readonly totalPortions: number;
  readonly totalGrams: number;
  readonly totalKcal: number;
}

/** Aggregates all meal items over N days into a consolidated shopping / prep list. */
export function buildGroceryList(meals: readonly Meal[], days = 7): GroceryListItem[] {
  const map = new Map<string, GroceryListItem>();
  const multiplier = Math.max(1, days);

  for (const meal of meals) {
    for (const item of meal.items ?? []) {
      const existing = map.get(item.foodId);
      if (existing) {
        map.set(item.foodId, {
          ...existing,
          totalPortions: round1(existing.totalPortions + item.portions * multiplier),
          totalGrams: Math.round(existing.totalGrams + item.grams * multiplier),
          totalKcal: Math.round(existing.totalKcal + item.kcal * multiplier),
        });
      } else {
        map.set(item.foodId, {
          foodId: item.foodId,
          name: item.name,
          exchange: item.exchange,
          unit: item.unit,
          totalPortions: round1(item.portions * multiplier),
          totalGrams: Math.round(item.grams * multiplier),
          totalKcal: Math.round(item.kcal * multiplier),
        });
      }
    }
  }

  return [...map.values()].sort((a, b) => b.totalGrams - a.totalGrams);
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
