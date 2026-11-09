import { TestBed } from '@angular/core/testing';
import { AiNutripilotService } from './ai-nutripilot.service';

describe('AiNutripilotService', () => {
  let service: AiNutripilotService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiNutripilotService);
  });

  it('calculates BMR and TDEE correctly via Mifflin-St Jeor', () => {
    // Male: 10 * 80 + 6.25 * 180 - 5 * 30 + 5 = 800 + 1125 - 150 + 5 = 1780
    // Moderate activity: 1780 * 1.55 = 2759
    const res = service.calculateMetabolism({
      gender: 'male',
      age: 30,
      weightKg: 80,
      heightCm: 180,
      activity: 'moderate',
      goal: 'lose_weight', // -500 kcal
      dietType: 'mediterranean',
    });

    expect(res.bmr).toBe(1780);
    expect(res.tdee).toBe(2759);
    expect(res.targetCalories).toBe(2259);
    expect(res.bmi).toBe(24.7);
    expect(res.bmiCategory).toBe('Normal Ağırlık');
    expect(res.macros.proteinGrams).toBeGreaterThan(0);
    expect(res.macros.carbGrams).toBeGreaterThan(0);
    expect(res.macros.fatGrams).toBeGreaterThan(0);
  });

  it('generates clinical meal plan respecting intolerances', () => {
    const plan = service.generateSmartMealPlan({
      gender: 'female',
      age: 32,
      weightKg: 65,
      heightCm: 165,
      activity: 'light',
      goal: 'burn_fat',
      dietType: 'insulin_resistance',
      intolerances: ['Gluten', 'Laktos'],
    });

    expect(plan.meals.breakfast.length).toBeGreaterThan(0);
    expect(plan.meals.lunch.length).toBeGreaterThan(0);
    expect(plan.meals.dinner.length).toBeGreaterThan(0);

    const breakfastBread = plan.meals.breakfast.find((x) => x.name.includes('Glutensiz'));
    expect(breakfastBread).toBeTruthy();
  });

  it('evaluates abnormal biomarkers and issues clinical nutrition alerts', () => {
    const findings = service.evaluateBiomarkers({
      fastingGlucose: 118, // Prediabetic
      hba1c: 6.2, // Warning
      ferritin: 12, // Low / Anemia warning
      vitaminD: 15, // Low
      ldl: 145, // Elevated
    });

    expect(findings.length).toBe(5);
    const glucose = findings.find((x) => x.marker === 'Açlık Kan Şekeri');
    expect(glucose?.status).toBe('critical');

    const ferritin = findings.find((x) => x.marker.includes('Ferritin'));
    expect(ferritin?.status).toBe('warning');
    expect(ferritin?.dietRecommendation).toContain('çay/kahve');
  });

  it('simulates 48-hour cheat recovery without starvation', () => {
    const protocol = service.simulateRecovery({
      cheatFood: '2 Dilim Pizza ve Kola',
      estimatedExtraKcal: 900,
      severity: 'heavy',
    });

    expect(protocol.hydrationPlan).toContain('+1.5 Litre');
    expect(protocol.nextDayDietAdjustments.length).toBeGreaterThan(0);
    expect(protocol.activityPrescription).toContain('yürüyüş');
    expect(protocol.mindsetNote).toContain('Önemli Klinik Mesaj');
  });

  it('produces SOAP clinical summary and motivating client message', () => {
    const summary = service.summarizeConsultation({
      clientName: 'Elif Kaya',
      weekNumber: 3,
      weightDiffKg: -1.5,
      complianceRatePct: 95,
      struggles: 'Ofiste ikindi vakti zorlandı',
      dietitianNotes: 'Ödem atımı başarılı',
    });

    expect(summary.soapRecord.subjective).toContain('Elif Kaya');
    expect(summary.soapRecord.objective).toContain('1.5 kg kayıp');
    expect(summary.clientMessage).toContain('Harika bir 3. haftayı');
    expect(summary.clientMessage).toContain('-1.5 kg');
  });
});
