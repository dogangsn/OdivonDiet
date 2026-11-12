import { describe, expect, it } from 'vitest';
import {
  ageFrom,
  analyzeChronoNutrition,
  analyzeDrugNutrientInteractions,
  atherogenicIndex,
  atwaterKcal,
  bmi,
  bmiBand,
  bmr,
  buildGroceryList,
  cunninghamBmr,
  estimatedWeeksToGoal,
  evaluateSarcopeniaRisk,
  goalProgress,
  harrisBenedictBmr,
  homaIr,
  idealWeightRange,
  katchMcArdleBmr,
  leanBodyMassKg,
  macroGrams,
  scaleFoodItem,
  suggestedKcal,
  summarizeMeals,
  tdee,
  usNavyBodyFatPct,
  waistHipRisk,
  waterNeedLiters,
} from './diet-calc';

describe('diet calculations', () => {
  it('computes age around the birthday', () => {
    expect(ageFrom('1990-06-15', new Date(2026, 5, 14))).toBe(35);
    expect(ageFrom('1990-06-15', new Date(2026, 5, 15))).toBe(36);
  });

  it('computes BMI and its band', () => {
    expect(bmi(70, 175)).toBe(22.9);
    expect(bmiBand(22.9).label).toBe('Normal');
    expect(bmiBand(31).tone).toBe('danger');
  });

  it('uses Mifflin-St Jeor for BMR', () => {
    expect(bmr('male', 80, 180, 30)).toBe(1780);
    expect(bmr('female', 60, 165, 30)).toBe(1320);
    expect(tdee(1320, 'moderate')).toBe(2046);
  });

  it('suggests a deficit for weight loss', () => {
    expect(suggestedKcal(2046, 'weight_loss')).toBe(1550);
  });

  it('measures goal progress in both directions and clamps it', () => {
    expect(goalProgress(80, 75, 70)).toBe(50);
    expect(goalProgress(54, 56, 58)).toBe(50);
    expect(goalProgress(80, 82, 70)).toBe(0);
    expect(goalProgress(80, 65, 70)).toBe(100);
  });

  it('converts macro percentages to grams', () => {
    expect(macroGrams(2000, 25, 45, 30)).toEqual({ protein: 125, carb: 225, fat: 67 });
  });

  it('computes Atwater calories, food scaling, and full meal nutrition summary', () => {
    expect(atwaterKcal(20, 30, 10)).toBe(290);
    const scaled = scaleFoodItem(
      {
        id: 'f-test',
        name: 'Izgara tavuk',
        category: 'et_balik_tavuk',
        exchange: 'et',
        unit: '1 porsiyon',
        grams: 120,
        kcal: 198,
        proteinG: 37,
        carbG: 0,
        fatG: 4.5,
        fiberG: 0,
        gi: 'low',
        allergens: [],
      },
      1.5,
      'Hindi göğüs',
    );
    expect(scaled.grams).toBe(180);
    expect(scaled.kcal).toBe(297);
    expect(scaled.proteinG).toBe(55.5);
    expect(scaled.alternative).toBe('Hindi göğüs');

    const summary = summarizeMeals([
      {
        name: 'Öğle',
        time: '13:00',
        kcal: scaled.kcal,
        items: [scaled],
      },
    ]);
    expect(summary.kcal).toBe(297);
    expect(summary.proteinG).toBe(55.5);
    expect(summary.exchangeCounts.et).toBe(1.5);
  });

  it('computes Harris-Benedict BMR, ideal weight range, water need, WHR risk and weeks to goal', () => {
    expect(harrisBenedictBmr('female', 70, 165, 30)).toBeGreaterThan(1350);
    const range = idealWeightRange(170, 'female');
    expect(range.minKg).toBe(53.5);
    expect(range.maxKg).toBe(72);
    expect(waterNeedLiters(70, 'moderate')).toBe(2.9);
    expect(waistHipRisk('female', 72, 100).tone).toBe('positive');
    expect(waistHipRisk('female', 92, 100).tone).toBe('danger');
    expect(estimatedWeeksToGoal(78, 72)).toBe(10);
  });

  it('computes HOMA-IR, TG/HDL atherogenic index, Katch-McArdle, Cunningham, and US Navy body fat', () => {
    const homa = homaIr(98, 11.8);
    expect(homa.value).toBe(2.86);
    expect(homa.tone).toBe('danger');

    const athero = atherogenicIndex(196, 41);
    expect(athero.ratio).toBe(4.78);
    expect(athero.tone).toBe('danger');

    const lbm = leanBodyMassKg(75, 28, 168, 'female');
    expect(lbm).toBe(54);
    expect(katchMcArdleBmr(lbm)).toBe(1536);
    expect(cunninghamBmr(lbm)).toBe(1688);

    const navy = usNavyBodyFatPct('male', 180, 92, 40);
    expect(navy).toBeGreaterThan(15);
  });

  it('analyzes drug-nutrient interactions, GLP-1 sarcopenia risk, chrono-nutrition, and 7-day grocery list', () => {
    const alerts = analyzeDrugNutrientInteractions(
      [
        {
          id: 'm1',
          clientId: 'c-1',
          name: 'Glifor 1000 mg',
          activeIngredient: 'metformin',
          dosage: '2x1000 mg',
          schedule: 'Sabah/Akşam',
        },
      ],
      {
        id: 'l1',
        clientId: 'c-1',
        date: '2026-11-01',
        fastingGlucoseMgDl: 100,
        fastingInsulinUiuMl: 12,
        hba1cPct: 5.8,
        triglyceridesMgDl: 140,
        hdlMgDl: 50,
        ldlMgDl: 120,
        ferritinNgMl: 25,
        vitaminDNgMl: 22,
        vitaminB12PgMl: 290,
        tshMiuL: 2.2,
        uricAcidMgDl: 5.0,
        crpMgL: 1.4,
      },
      [],
      1.4,
    );
    expect(alerts.length).toBe(1);
    expect(alerts[0].severity).toBe('danger');

    const sarco = evaluateSarcopeniaRisk(-8, -2.5, 62, 1.1, true);
    expect(sarco.riskLevel).toBe('high');
    expect(sarco.minProteinGrams).toBe(99);

    const chrono = analyzeChronoNutrition([
      { name: 'Kahvaltı', time: '08:30', kcal: 450, carbG: 40, fiberG: 8, proteinG: 25 },
      { name: 'Akşam', time: '18:30', kcal: 550, carbG: 45, fiberG: 10, proteinG: 35 },
    ]);
    expect(chrono.eatingWindowHours).toBe(10);
    expect(chrono.fastingWindowHours).toBe(14);
    expect(chrono.curve.length).toBeGreaterThan(10);

    const grocery = buildGroceryList(
      [
        {
          name: 'Kahvaltı',
          time: '08:00',
          kcal: 144,
          items: [
            {
              foodId: 'f-egg',
              name: 'Yumurta',
              unit: '1 adet',
              portions: 2,
              grams: 100,
              kcal: 144,
              proteinG: 12.6,
              carbG: 0.8,
              fatG: 9.6,
              fiberG: 0,
              exchange: 'et',
            },
          ],
        },
      ],
      7,
    );
    expect(grocery[0].totalPortions).toBe(14);
    expect(grocery[0].totalGrams).toBe(700);
  });
});
