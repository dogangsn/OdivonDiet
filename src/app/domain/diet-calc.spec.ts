import { describe, expect, it } from 'vitest';
import {
  ageFrom,
  bmi,
  bmiBand,
  bmr,
  goalProgress,
  macroGrams,
  suggestedKcal,
  tdee,
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
});
