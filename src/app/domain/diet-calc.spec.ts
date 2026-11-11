import { describe, expect, it } from 'vitest';
import {
  ageFrom,
  atwaterKcal,
  bmi,
  bmiBand,
  bmr,
  estimatedWeeksToGoal,
  goalProgress,
  harrisBenedictBmr,
  idealWeightRange,
  macroGrams,
  scaleFoodItem,
  suggestedKcal,
  summarizeMeals,
  tdee,
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
});
