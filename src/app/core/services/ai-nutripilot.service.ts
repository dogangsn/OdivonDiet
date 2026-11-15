import { Injectable } from '@angular/core';

export type Gender = 'female' | 'male';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'athlete';

export type DietGoal = 'lose_weight' | 'burn_fat' | 'maintain' | 'build_muscle' | 'gain_weight';

export type DietType =
  | 'mediterranean'
  | 'keto'
  | 'high_protein'
  | 'insulin_resistance'
  | 'low_fodmap'
  | 'vegan';

export interface MetabolicInput {
  gender: Gender;
  age: number;
  weightKg: number;
  heightCm: number;
  activity: ActivityLevel;
  goal: DietGoal;
  dietType: DietType;
  intolerances?: string[];
}

export interface MetabolicOutput {
  bmr: number;
  tdee: number;
  targetCalories: number;
  bmi: number;
  bmiCategory: string;
  bmiTone: 'positive' | 'warning' | 'primary' | 'info';
  idealWeightRange: { min: number; max: number };
  waterLiters: number;
  macros: {
    proteinGrams: number;
    proteinKcal: number;
    proteinPct: number;
    carbGrams: number;
    carbKcal: number;
    carbPct: number;
    fatGrams: number;
    fatKcal: number;
    fatPct: number;
    fiberGrams: number;
  };
}

export interface MealItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  clinicalNote?: string;
}

export interface MealPlanDay {
  title: string;
  totalCalories: number;
  meals: {
    breakfast: MealItem[];
    morningSnack?: MealItem[];
    lunch: MealItem[];
    afternoonSnack?: MealItem[];
    dinner: MealItem[];
  };
  clinicalTips: string[];
}

export interface LabInput {
  fastingGlucose?: number; // mg/dL
  hba1c?: number; // %
  ferritin?: number; // ng/mL
  vitaminD?: number; // ng/mL
  vitaminB12?: number; // pg/mL
  tsh?: number; // mIU/L
  totalCholesterol?: number; // mg/dL
  ldl?: number; // mg/dL
  triglycerides?: number; // mg/dL
}

export interface LabFinding {
  marker: string;
  value: number;
  unit: string;
  status: 'optimal' | 'warning' | 'critical' | 'low';
  assessment: string;
  dietRecommendation: string;
}

export interface CheatRecoveryInput {
  cheatFood: string;
  estimatedExtraKcal: number;
  severity: 'mild' | 'moderate' | 'heavy';
}

export interface CheatRecoveryProtocol {
  foodSummary: string;
  metabolicImpact: string;
  hydrationPlan: string;
  nextDayDietAdjustments: string[];
  activityPrescription: string;
  mindsetNote: string;
}

export interface ConsultationInput {
  clientName: string;
  weekNumber: number;
  weightDiffKg: number;
  complianceRatePct: number;
  struggles: string;
  dietitianNotes: string;
}

export interface ConsultationSummaryOutput {
  soapRecord: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  clientMessage: string;
}

export interface MealPlateItem {
  readonly name: string;
  readonly portion: string;
  readonly kcal: number;
  readonly proteinG: number;
  readonly carbG: number;
  readonly fatG: number;
}

export interface MealPlateAnalysis {
  readonly presetKey: string;
  readonly plateTitle: string;
  readonly totalKcal: number;
  readonly proteinG: number;
  readonly carbG: number;
  readonly fatG: number;
  readonly fiberG: number;
  readonly glycemicLoad: 'Düşük' | 'Orta' | 'Yüksek';
  readonly adherenceScorePct: number;
  readonly items: readonly MealPlateItem[];
  readonly coachFeedback: string;
  readonly swapSuggestion: string;
}

export type OcrDocumentKind = 'enabiz_insulin' | 'inbody_sheet' | 'tanita_athlete';

export interface OcrExtractionResult {
  readonly kind: OcrDocumentKind;
  readonly documentTitle: string;
  readonly confidencePct: number;
  readonly extractedAt: string;
  readonly clinicalFlags: readonly string[];
  readonly labValues?: {
    readonly fastingGlucoseMgDl: number;
    readonly fastingInsulinUiuMl: number;
    readonly hba1cPct: number;
    readonly triglyceridesMgDl: number;
    readonly hdlMgDl: number;
    readonly ldlMgDl: number;
    readonly ferritinNgMl: number;
    readonly vitaminDNgMl: number;
    readonly vitaminB12PgMl: number;
    readonly tshMiuL: number;
    readonly uricAcidMgDl: number;
    readonly crpMgL: number;
  };
  readonly bodyValues?: {
    readonly weightKg: number;
    readonly bodyFatPct: number;
    readonly muscleMassKg: number;
    readonly visceralFatRating: number;
    readonly bodyWaterPct: number;
    readonly ecwTbwRatio: number;
    readonly metabolicAge: number;
    readonly phaseAngleDeg: number;
    readonly waistCm: number;
  };
}

export interface ChurnRiskAssessment {
  readonly clientId: string;
  readonly clientName: string;
  readonly riskScore: number;
  readonly riskLevel: 'high' | 'medium' | 'low';
  readonly daysSinceLastMeasurement: number;
  readonly overdueTasks: number;
  readonly reasons: readonly string[];
  readonly nudgeMessage: string;
}

export interface MenuAdvisorReply {
  readonly query: string;
  readonly medicalEscalation: boolean;
  readonly recommendedChoice: string;
  readonly portionRule: string;
  readonly avoidList: string;
  readonly glycemicTip: string;
}

export interface LeadCandidate {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  readonly age: number;
  readonly gender: 'female' | 'male';
  readonly heightCm: number;
  readonly weightKg: number;
  readonly targetWeightKg: number;
  readonly bmi: number;
  readonly metabolicAgeEstimate: number;
  readonly insulinRiskLabel: 'Yüksek Risk' | 'Orta Risk' | 'Düşük Risk';
  readonly goalLabel: string;
  readonly source: 'Instagram Bio Testi' | 'Web Metabolik Check-Up' | 'WhatsApp Huni';
  readonly createdAt: string;
  readonly convertedClientId?: string;
}

export interface ClinicServicePackage {
  readonly id: string;
  readonly title: string;
  readonly durationLabel: string;
  readonly priceTl: number;
  readonly installmentLabel: string;
  readonly includes: readonly string[];
  readonly badge: string;
}

@Injectable({ providedIn: 'root' })
export class AiNutripilotService {
  /**
   * Mifflin-St Jeor Formülü ve Makro/Mikro Metabolik Hesaplayıcı
   */
  calculateMetabolism(input: MetabolicInput): MetabolicOutput {
    const { gender, age, weightKg, heightCm, activity, goal, dietType } = input;

    // 1. Mifflin-St Jeor BMR
    let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
    bmr += gender === 'male' ? 5 : -161;
    bmr = Math.round(bmr);

    // 2. TDEE Katsayısı
    const activityMultipliers: Record<ActivityLevel, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      very_active: 1.725,
      athlete: 1.9,
    };
    const tdee = Math.round(bmr * (activityMultipliers[activity] ?? 1.375));

    // 3. Hedefe göre Kalori Ayarlaması
    let targetCalories = tdee;
    if (goal === 'lose_weight') {
      targetCalories = Math.max(1200, Math.round(tdee - 500));
    } else if (goal === 'burn_fat') {
      targetCalories = Math.max(1300, Math.round(tdee - 350));
    } else if (goal === 'build_muscle') {
      targetCalories = Math.round(tdee + 300);
    } else if (goal === 'gain_weight') {
      targetCalories = Math.round(tdee + 500);
    }

    // 4. BMI & WHO Kategorizasyonu
    const heightM = heightCm / 100;
    const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));
    let bmiCategory = 'Normal Ağırlık';
    let bmiTone: 'positive' | 'warning' | 'primary' | 'info' = 'positive';

    if (bmi < 18.5) {
      bmiCategory = 'Düşük Ağırlık (Zayıf)';
      bmiTone = 'warning';
    } else if (bmi >= 25 && bmi < 30) {
      bmiCategory = 'Fazla Kilolu';
      bmiTone = 'warning';
    } else if (bmi >= 30 && bmi < 35) {
      bmiCategory = '1. Derece Obezite';
      bmiTone = 'primary';
    } else if (bmi >= 35) {
      bmiCategory = '2./3. Derece Obezite';
      bmiTone = 'primary';
    }

    const idealWeightRange = {
      min: Math.round(18.5 * (heightM * heightM)),
      max: Math.round(24.9 * (heightM * heightM)),
    };

    // 5. Makro Dağılımı
    let pPct = 0.2;
    let cPct = 0.5;
    let fPct = 0.3;

    switch (dietType) {
      case 'keto':
        pPct = 0.25;
        cPct = 0.08;
        fPct = 0.67;
        break;
      case 'high_protein':
        pPct = 0.35;
        cPct = 0.4;
        fPct = 0.25;
        break;
      case 'insulin_resistance':
        pPct = 0.25;
        cPct = 0.4;
        fPct = 0.35;
        break;
      case 'vegan':
        pPct = 0.2;
        cPct = 0.55;
        fPct = 0.25;
        break;
      case 'low_fodmap':
        pPct = 0.22;
        cPct = 0.48;
        fPct = 0.3;
        break;
      case 'mediterranean':
      default:
        pPct = 0.2;
        cPct = 0.5;
        fPct = 0.3;
        break;
    }

    const proteinKcal = Math.round(targetCalories * pPct);
    const carbKcal = Math.round(targetCalories * cPct);
    const fatKcal = Math.round(targetCalories * fPct);

    const proteinGrams = Math.round(proteinKcal / 4);
    const carbGrams = Math.round(carbKcal / 4);
    const fatGrams = Math.round(fatKcal / 9);
    const fiberGrams = Math.round((targetCalories / 1000) * 14); // 14g / 1000 kcal önerisi
    const waterLiters = parseFloat(((weightKg * 35) / 1000).toFixed(1));

    return {
      bmr,
      tdee,
      targetCalories,
      bmi,
      bmiCategory,
      bmiTone,
      idealWeightRange,
      waterLiters,
      macros: {
        proteinGrams,
        proteinKcal,
        proteinPct: Math.round(pPct * 100),
        carbGrams,
        carbKcal,
        carbPct: Math.round(cPct * 100),
        fatGrams,
        fatKcal,
        fatPct: Math.round(fPct * 100),
        fiberGrams,
      },
    };
  }

  /**
   * Yapay Zekâ Destekli Klinik Menü ve Beslenme Planı Üreticisi
   */
  generateSmartMealPlan(input: MetabolicInput): MealPlanDay {
    const meta = this.calculateMetabolism(input);
    const { dietType, intolerances = [] } = input;
    const hasLactose = intolerances.includes('Laktos') || intolerances.includes('Süt');
    const hasGluten = intolerances.includes('Gluten') || intolerances.includes('Çölyak');

    const breakfastMilk = hasLactose ? 'Laktozsuz Kefir / Badem Sütü' : 'Organik Yoğurt / Kefir';
    const breadChoice = hasGluten ? 'Karasabun Ekmeği / Glutensiz Ekmek' : 'Siyez / Ekşi Mayalı Çavdar Ekmeği';

    const day: MealPlanDay = {
      title: `${input.dietType.toUpperCase()} - Günlük Klinik Beslenme Menüsü`,
      totalCalories: meta.targetCalories,
      meals: {
        breakfast: [
          {
            name: 'Haşlanmış Köy Yumurtası',
            portion: '2 adet',
            calories: 144,
            protein: 12,
            carbs: 1,
            fat: 10,
            clinicalNote: 'Yüksek biyoyararlanımlı protein ve kolin kaynağı.',
          },
          {
            name: breadChoice,
            portion: '1 ince dilim (35g)',
            calories: 75,
            protein: 3,
            carbs: 15,
            fat: 1,
            clinicalNote: 'Düşük glisemik indeksli kompleks lif.',
          },
          {
            name: 'Az Tuzlu Ezine / Keçi Peyniri',
            portion: '1 dilim (30g)',
            calories: 90,
            protein: 6,
            carbs: 0.5,
            fat: 7,
          },
          {
            name: 'Zeytinyağlı Roka & Maydanoz & Ceviz',
            portion: 'Geniş kase + 2 tam ceviz',
            calories: 130,
            protein: 3,
            carbs: 4,
            fat: 11,
            clinicalNote: 'Omega-3 ve C vitamini ile demir emilimi optimizasyonu.',
          },
        ],
        morningSnack: [
          {
            name: 'Yeşil Çay & Çiğ Badem',
            portion: '1 fincan + 8 adet çiğ badem',
            calories: 60,
            protein: 2,
            carbs: 2,
            fat: 5,
            clinicalNote: 'EGCG antioksidan desteği, termojenik etki.',
          },
        ],
        lunch: [
          {
            name: 'Izgara Somon / Hindi Göğsü',
            portion: '160g pişmiş',
            calories: 280,
            protein: 34,
            carbs: 0,
            fat: 14,
            clinicalNote: 'Yağsız kas kütlesi korunumu ve hücresel toparlanma.',
          },
          {
            name: 'Kinoa / Karabuğday Salatası',
            portion: '4 yemek kaşığı (120g)',
            calories: 140,
            protein: 5,
            carbs: 26,
            fat: 2,
            clinicalNote: 'Glutensiz tam proteinli psödotahıl.',
          },
          {
            name: 'Zeytinyağlı Buharda Brokoli & Kabak',
            portion: '1 porsiyon (150g)',
            calories: 85,
            protein: 4,
            carbs: 9,
            fat: 4,
            clinicalNote: 'Sülforafan içeriği ile karaciğer faz 2 detoksifikasyonu.',
          },
        ],
        afternoonSnack: [
          {
            name: breakfastMilk + ' ile Yaban Mersini & Chia',
            portion: '1 kase (150g)',
            calories: 140,
            protein: 7,
            carbs: 16,
            fat: 5,
            clinicalNote: 'İkindi insülin dalgalanmasını önleyen çözünür lif.',
          },
        ],
        dinner: [
          {
            name: 'Zeytinyağlı Taze Fasulye / Enginar',
            portion: '8 yemek kaşığı',
            calories: 160,
            protein: 4,
            carbs: 18,
            fat: 8,
            clinicalNote: 'Hafif sindirilen prebiyotik sebze yemeği.',
          },
          {
            name: hasLactose ? 'Laktozsuz Yoğurt' : 'Ev Yapımı Probiyotik Yoğurt',
            portion: '1 kase (200g)',
            calories: 120,
            protein: 8,
            carbs: 10,
            fat: 5,
            clinicalNote: 'Bağırsak mikrobiyotası ve gece kazein tokluğu.',
          },
          {
            name: 'Mevsim Yeşillikleri & Elma Sirkesi Salatası',
            portion: 'Sınırsız porsiyon',
            calories: 45,
            protein: 1,
            carbs: 5,
            fat: 2,
            clinicalNote: 'Sirke asetik asidi ile öğün sonrası glisemi baskılama.',
          },
        ],
      },
      clinicalTips: [
        `Hedef Kalori: ${meta.targetCalories} kcal (Protein: ${meta.macros.proteinGrams}g, Karb: ${meta.macros.carbGrams}g, Yağ: ${meta.macros.fatGrams}g).`,
        `Günlük su hedefi: En az ${meta.waterLiters} litre.`,
        'Akşam öğünü ile uyku arasında en az 3 saatlik sindirim penceresi bırakılmalıdır.',
        dietType === 'insulin_resistance'
          ? 'İnsülin Direnci Uyarısı: Glisemik yükü yüksek meyveler tek başına tüketilmemeli, ceviz/badem ile dengelenmelidir.'
          : 'Öğünlerde çiğneme süresini uzatmak leptin tokluk hormonunun uyarılmasını hızlandırır.',
      ],
    };

    return day;
  }

  /**
   * Laboratuvar ve Biyobelirteç Karar Destek Sistemi
   */
  evaluateBiomarkers(labs: LabInput): LabFinding[] {
    const findings: LabFinding[] = [];

    // Açlık Şekeri
    if (labs.fastingGlucose !== undefined) {
      const v = labs.fastingGlucose;
      if (v < 70) {
        findings.push({
          marker: 'Açlık Kan Şekeri',
          value: v,
          unit: 'mg/dL',
          status: 'low',
          assessment: 'Hipoglisemi riski mevcut.',
          dietRecommendation: 'Uzun süreli açlıktan kaçınılmalı, ara öğünlerde kompleks karbonhidrat ve protein kombini eklenmeli.',
        });
      } else if (v <= 99) {
        findings.push({
          marker: 'Açlık Kan Şekeri',
          value: v,
          unit: 'mg/dL',
          status: 'optimal',
          assessment: 'Optimal insülin duyarlılığı aralığında.',
          dietRecommendation: 'Mevcut kompleks karbonhidrat ve lif dengesi sürdürülmelidir.',
        });
      } else {
        findings.push({
          marker: 'Açlık Kan Şekeri',
          value: v,
          unit: 'mg/dL',
          status: 'critical',
          assessment: 'Bozulmuş açlık glukozu / Prediyabet riski.',
          dietRecommendation: 'Basit şekerler ve rafine unlar elenmeli, öğünlere elma sirkesi ve tarçın desteği eklenmeli, günlük lif 35g üzerine çıkarılmalı.',
        });
      }
    }

    // HbA1c
    if (labs.hba1c !== undefined) {
      const v = labs.hba1c;
      if (v < 5.7) {
        findings.push({
          marker: 'HbA1c (Glise Hemoglobin)',
          value: v,
          unit: '%',
          status: 'optimal',
          assessment: 'Son 3 aylık kan şekeri kontrolü mükemmel.',
          dietRecommendation: 'Düşük glisemik indeksli beslenme modeli devam ettirilmeli.',
        });
      } else if (v <= 6.4) {
        findings.push({
          marker: 'HbA1c (Glise Hemoglobin)',
          value: v,
          unit: '%',
          status: 'warning',
          assessment: 'Prediyabetik aralık. Glukotoksisite riski.',
          dietRecommendation: 'Öğün aralıkları 4 saatte tutulmalı, geç saatte karbonhidrat alımı kısıtlanmalı, yemek sonrası 15 dk tempolu yürüyüş reçete edilmeli.',
        });
      } else {
        findings.push({
          marker: 'HbA1c (Glise Hemoglobin)',
          value: v,
          unit: '%',
          status: 'critical',
          assessment: 'Diyabetik aralık. Tıbbi beslenme tedavisi zorunlu.',
          dietRecommendation: 'Karbonhidrat sayımı uygulanmalı, hekim konsültasyonu ile birlikte katı glisemik kontrol protokolü yürütülmeli.',
        });
      }
    }

    // Ferritin
    if (labs.ferritin !== undefined) {
      const v = labs.ferritin;
      if (v < 30) {
        findings.push({
          marker: 'Ferritin (Demir Deposu)',
          value: v,
          unit: 'ng/mL',
          status: 'warning',
          assessment: 'Hücresel demir depoları boşalmış / Anemi riski.',
          dietRecommendation: 'Hekim kontrolünde demir desteği önerilir. Kırmızı et/ciğer yanına limonlu yeşillik eklenmeli; ana öğünden 1.5 saat öncesine ve sonrasına kadar çay/kahve ve süt ürünleri kesinlikle tüketilmemelidir.',
        });
      } else {
        findings.push({
          marker: 'Ferritin (Demir Deposu)',
          value: v,
          unit: 'ng/mL',
          status: 'optimal',
          assessment: 'Demir deposu yeterli.',
          dietRecommendation: 'Haftada 2-3 gün kaliteli kırmızı et veya koyu yeşil yapraklı sebze tüketimi depoları korur.',
        });
      }
    }

    // D Vitamini
    if (labs.vitaminD !== undefined) {
      const v = labs.vitaminD;
      if (v < 30) {
        findings.push({
          marker: '25-OH Vitamin D',
          value: v,
          unit: 'ng/mL',
          status: 'warning',
          assessment: 'D vitamini yetersizliği. İnsülin direnci ve bağışıklık zafiyetiyle ilişkili.',
          dietRecommendation: 'D3K2 takviyesi sabah yağ içeren kahvaltı ile (örneğin zeytinyağlı yumurta) birlikte alınmalıdır. Yağlı balık (somon/uskumru) tüketimi haftada 2 güne çıkarılmalıdır.',
        });
      } else {
        findings.push({
          marker: '25-OH Vitamin D',
          value: v,
          unit: 'ng/mL',
          status: 'optimal',
          assessment: 'Yeterli ve koruyucu düzey.',
          dietRecommendation: 'Mevcut düzey idame dozu ve dengeli beslenme ile korunmalıdır.',
        });
      }
    }

    // LDL Kolesterol
    if (labs.ldl !== undefined) {
      const v = labs.ldl;
      if (v > 130) {
        findings.push({
          marker: 'LDL Kolesterol',
          value: v,
          unit: 'mg/dL',
          status: 'warning',
          assessment: 'Aterojenik lipid fraksiyonu yüksek.',
          dietRecommendation: 'Doymuş yağ ve trans yağlar kısıtlanmalı; psyllium lifi, yulaf betaglukanı, keten tohumu ve çiğ fındık/ceviz günlük plana dahil edilmelidir.',
        });
      } else {
        findings.push({
          marker: 'LDL Kolesterol',
          value: v,
          unit: 'mg/dL',
          status: 'optimal',
          assessment: 'Kardiyovasküler açıdan optimal sınırda.',
          dietRecommendation: 'Akdeniz tipi sızma zeytinyağı ağırlıklı yağ dağılımı korunmalıdır.',
        });
      }
    }

    return findings;
  }

  /**
   * Kaçamak & Dengeleme Simülatörü (48 Saatlik Bilimsel Toparlanma Protokolü)
   */
  simulateRecovery(input: CheatRecoveryInput): CheatRecoveryProtocol {
    const { cheatFood, estimatedExtraKcal, severity } = input;

    const hydration =
      severity === 'heavy'
        ? 'Standart su ihtiyacına ek olarak bugün +1.5 Litre limonlu, sodyumu dengelenmiş maden sodalı su tüketilmelidir.'
        : 'Standart su ihtiyacına ek olarak bugün +800 mL su tüketilmelidir.';

    const adjustments = [
      'Açlık hissetmeden asla kahvaltı yapılmamalı; ilk öğün en az 14-16 saatlik açlık (intermittent fasting) penceresinden sonra açılmalı.',
      'Sonraki 48 saat boyunca tüm basit şekerler, beyaz unlu mamuller ve paketli gıdalar sıfırlanmalıdır.',
      `Öğünlerde net karbonhidrat %30 azaltılarak protein oranı artırılmalı (${severity === 'heavy' ? 'Yağsız tavuk göğsü, somon, yumurta beyazı' : 'Süzme yoğurt, lor, ızgara balık'}).`,
      'Glikojen deposu aşırı doyduğu için vücutta oluşan su tutulumunu (ödem) atmak amacıyla potasyumdan zengin maydanoz, salatalık, haşlanmış enginar ve ananas tercih edilmelidir.',
    ];

    const activity =
      severity === 'heavy'
        ? 'Bugün akşam yemeğinden sonra en az 50 dakika tempolu yürüyüş (ortalama 7.500 adım) ile kaslardaki GLUT-4 reseptörleri aktif edilmeli ve glikoz kas dokusuna çekilmelidir.'
        : 'Gün içinde 35 dakika orta tempolu yürüyüş ile metabolik harcama desteklenmelidir.';

    return {
      foodSummary: `${cheatFood} (~+${estimatedExtraKcal} kcal ekstra glisemik ve kalori yükü)`,
      metabolicImpact:
        severity === 'heavy'
          ? 'Karaciğer glikojen depoları maksimum kapasiteye ulaştı; yaklaşık 1.5 - 2 kg geçici su/ödem artışı tartıya yansıyabilir.'
          : 'Hafif glukoz dalgalanması oluştu; 24 saatlik dengeli mikro-öğünlerle glisemik denge kolayca toparlanabilir.',
      hydrationPlan: hydration,
      nextDayDietAdjustments: adjustments,
      activityPrescription: activity,
      mindsetNote:
        'Önemli Klinik Mesaj: Kaçamak bir irade yenilgisi değil, sürecin doğal bir parçasıdır. Kendinizi suçlayıp aç kalarak metabolizmayı yavaşlatmak yerine, yukarıdaki toparlanma protokolüyle ritme geri dönün.',
    };
  }

  /**
   * Seans Notu ve Danışan Motivasyon Özeti Oluşturucu
   */
  summarizeConsultation(input: ConsultationInput): ConsultationSummaryOutput {
    const { clientName, weekNumber, weightDiffKg, complianceRatePct, struggles, dietitianNotes } =
      input;

    const diffText =
      weightDiffKg < 0
        ? `${Math.abs(weightDiffKg)} kg kayıp sağlandı (Başarılı)`
        : weightDiffKg > 0
          ? `${weightDiffKg} kg artış görüldü`
          : 'Kilo sabit kaldı (Plato dönemi)';

    const soap = {
      subjective: `Danışan ${clientName} (${weekNumber}. hafta takibinde). Danışan geri bildirimi: "${struggles || 'Ciddi bir zorlanma belirtilmedi, süreç olumlu ilerliyor.'}"`,
      objective: `Haftalık Kilo Değişimi: ${diffText}. Beslenme Planına Uyum Oranı: %${complianceRatePct}.`,
      assessment: `Metabolik uyum %${complianceRatePct} düzeyinde. ${weightDiffKg < 0 ? 'Hedeflenen yağ kaybı trendi sağlıklı şekilde korunuyor.' : 'Uyum dalgalanmasına bağlı metabolik duraklama gözlemlendi; plan revizyonu gerekebilir.'} Diyetisyen İzlemi: ${dietitianNotes || 'Stabil seyir.'}`,
      plan: `Gelecek seansa kadar su tüketimi günlük 2.5L üzerine hedeflenecek. ${struggles ? 'Zorlanılan öğünlerde esnek porsiyon değişimi uygulanacak.' : 'Mevcut kalori ve makro dağılımı korunacak.'} 7 gün sonra kontrol seansı planlandı.`,
    };

    const clientMsg =
      `Merhaba ${clientName} Harika bir ${weekNumber}. haftayı geride bıraktık! 🌟\n\n` +
      `Bu haftaki sonucumuz: ${weightDiffKg < 0 ? `-${Math.abs(weightDiffKg)} kg ile hedefe bir adım daha yaklaştık! 👏` : 'Vücudumuz yeni dengesine alışıyor, istikrarı elden bırakmıyoruz! 💪'}\n` +
      `Uyum oranımız %${complianceRatePct}. Zorlandığımız anları konuştuk, yeni haftada daha rahat uygulayabileceğin pratik alternatifleri listene ekledim. 🥗✨\n\n` +
      `Unutma; bu bir maraton ve sen çok iyi gidiyorsun. Bol su içmeyi ve enerjini yüksek tutmayı ihmal etme! Haftaya görüşmek üzere. Sevgiler! 💚`;

    return {
      soapRecord: soap,
      clientMessage: clientMsg,
    };
  }

  /**
   * AI Meal Vision — Tabak Fotoğrafı veya Seçilen Öğün Üzerinden Porsiyon, Makro & Glisemik Yük Analizi
   */
  analyzeMealPlate(presetKey: string, customNote = ''): MealPlateAnalysis {
    const presets: Record<string, MealPlateAnalysis> = {
      kofte_bulgur: {
        presetKey: 'kofte_bulgur',
        plateTitle: 'Izgara Köfte, Bulgur Pilavı & Mevsim Salata Tabağı',
        totalKcal: 540,
        proteinG: 34,
        carbG: 42,
        fatG: 24,
        fiberG: 8,
        glycemicLoad: 'Düşük',
        adherenceScorePct: 92,
        items: [
          { name: 'Anne Köftesi (Izgara)', portion: '4 adet (120g)', kcal: 260, proteinG: 26, carbG: 4, fatG: 16 },
          { name: 'Sebzeli Bulgur Pilavı', portion: '4 yemek kaşığı', kcal: 140, proteinG: 4, carbG: 28, fatG: 2 },
          { name: 'Zeytinyağlı Çoban Salata', portion: '1 orta kase', kcal: 95, proteinG: 2, carbG: 7, fatG: 6 },
          { name: 'Ev Yapımı Ayran', portion: '1 su bardağı (200 ml)', kcal: 45, proteinG: 2, carbG: 3, fatG: 0 },
        ],
        coachFeedback:
          'Protein ve lif dengesi harika (%92 plan uyumu). Salatadaki posa bulgurun glisemik etkisini başarıyla yavaşlatıyor.',
        swapSuggestion:
          'Akşam öğününde karbonhidratı dengelemek için ekmek/tahıl hakkınızı 1 dilim azaltabilirsiniz.',
      },
      serpme_kahvalti: {
        presetKey: 'serpme_kahvalti',
        plateTitle: 'Hafta Sonu Kahvaltı Tabağı (Yumurta, Peynir, Zeytin, Bal/Kaymak)',
        totalKcal: 685,
        proteinG: 24,
        carbG: 54,
        fatG: 41,
        fiberG: 5,
        glycemicLoad: 'Orta',
        adherenceScorePct: 76,
        items: [
          { name: 'Sahanda Yumurta', portion: '2 adet', kcal: 190, proteinG: 13, carbG: 1, fatG: 15 },
          { name: 'Beyaz Peynir & Kaşar', portion: '2 dilim (60g)', kcal: 185, proteinG: 9, carbG: 2, fatG: 15 },
          { name: 'Simit / Beyaz Ekmek', portion: 'Yarım simit', kcal: 190, proteinG: 2, carbG: 38, fatG: 3 },
          { name: 'Bal & Kaymak / Reçel', portion: '1 tatlı kaşığı', kcal: 120, proteinG: 0, carbG: 13, fatG: 8 },
        ],
        coachFeedback:
          'Protein yeterli ancak simit ve bal/kaymak kombinasyonu sabah insülin pikini tetikleyebilir (%76 uyum).',
        swapSuggestion:
          'Kahvaltı sonrası 20 dk yürüyüş yapın ve öğle öğününü zeytinyağlı sebze + yoğurt ile hafif geçin.',
      },
      somon_kinoa: {
        presetKey: 'somon_kinoa',
        plateTitle: 'Fırın Somon, Kinoa & Avokadolu Yeşil Kase (Bowl)',
        totalKcal: 490,
        proteinG: 38,
        carbG: 29,
        fatG: 23,
        fiberG: 9,
        glycemicLoad: 'Düşük',
        adherenceScorePct: 98,
        items: [
          { name: 'Fırın Norveç Somonu', portion: '150g', kcal: 270, proteinG: 32, carbG: 0, fatG: 15 },
          { name: 'Haşlanmış Kinoa', portion: '3 yemek kaşığı', kcal: 110, proteinG: 4, carbG: 20, fatG: 2 },
          { name: 'Avokado & Roka Salatası', portion: 'Çeyrek avokado + yeşillik', kcal: 110, proteinG: 2, carbG: 9, fatG: 6 },
        ],
        coachFeedback:
          'Kusursuz anti-inflamatuar klinik tabak (%98 uyum)! Omega-3 ve yüksek lif insülin duyarlılığını maksimum destekliyor.',
        swapSuggestion: 'Hiçbir değişikliğe gerek yok; öğünden 30 dk sonra 2 bardak su içmeyi unutmayın.',
      },
      disarida_burger: {
        presetKey: 'disarida_burger',
        plateTitle: 'Restoran Burger & Fırın/Kızartma Patates Öğünü',
        totalKcal: 890,
        proteinG: 31,
        carbG: 88,
        fatG: 46,
        fiberG: 4,
        glycemicLoad: 'Yüksek',
        adherenceScorePct: 54,
        items: [
          { name: 'Dana Burger (Brioche Ekmekli)', portion: '1 adet (140g köfte)', kcal: 560, proteinG: 27, carbG: 46, fatG: 30 },
          { name: 'Patates Kızartması & Sos', portion: '1 küçük porsiyon', kcal: 330, proteinG: 4, carbG: 42, fatG: 16 },
        ],
        coachFeedback:
          'Yüksek sodyum ve rafine karbonhidrat yükü nedeniyle yarın sabah tartıda +700g geçici ödem (su tutulumu) görülebilir.',
        swapSuggestion:
          'Burgerin üst ekmeğini ayırmak -140 kcal kazandırır. Bu akşam +750 ml su için ve akşam yemeğinde sadece 1 kase probiyotik yoğurt tüketin.',
      },
    };

    const base = presets[presetKey] ?? presets['kofte_bulgur'];
    if (!customNote.trim()) return base;
    return {
      ...base,
      plateTitle: `${base.plateTitle} (${customNote.trim()})`,
    };
  }

  /**
   * AI e-Nabız Kan Tahlili PDF & InBody / Tanita Fişi OCR Okuyucu
   */
  extractOcrDocument(kind: OcrDocumentKind, fileName?: string): OcrExtractionResult {
    const now = new Date().toISOString();
    if (kind === 'enabiz_insulin') {
      return {
        kind,
        documentTitle: fileName || 'e-Nabiz_Biyokimya_Hemogram_Raporu.pdf',
        confidencePct: 98.7,
        extractedAt: now,
        clinicalFlags: [
          'HOMA-IR: 3.48 (İnsülin Direnci Eşiği > 2.5 — Düşük Glisemik İndeks + Elma Sirkesi Protokolü Önerilir)',
          'Ferritin: 16 ng/mL (Hücresel Demir Deposu Düşük — Çay/Kahve Öğünlerden 90 dk Ayrılmalı)',
          '25-OH Vitamin D: 18.4 ng/mL (Yetersiz — Sabah Yağlı Öğünle D3K2 Desteği)',
        ],
        labValues: {
          fastingGlucoseMgDl: 98,
          fastingInsulinUiuMl: 14.4,
          hba1cPct: 5.8,
          triglyceridesMgDl: 168,
          hdlMgDl: 44,
          ldlMgDl: 136,
          ferritinNgMl: 16,
          vitaminDNgMl: 18.4,
          vitaminB12PgMl: 285,
          tshMiuL: 2.6,
          uricAcidMgDl: 5.4,
          crpMgL: 2.1,
        },
      };
    }

    if (kind === 'tanita_athlete') {
      return {
        kind,
        documentTitle: fileName || 'Tanita_MC780_Segmental_Analiz.jpg',
        confidencePct: 99.1,
        extractedAt: now,
        clinicalFlags: [
          'Faz Açısı: 6.8° (Yüksek Hücresel Zar Bütünlüğü ve Kas Kalitesi)',
          'ECW/TBW: 0.376 (Optimal Hücre Dışı Sıvı Dengesi — Ödem Yok)',
          'Viseral Yağ: Seviye 5 (Sağlıklı İç Organ Yağlanması)',
        ],
        bodyValues: {
          weightKg: 74.2,
          bodyFatPct: 16.8,
          muscleMassKg: 58.4,
          visceralFatRating: 5,
          bodyWaterPct: 60.2,
          ecwTbwRatio: 0.376,
          metabolicAge: 26,
          phaseAngleDeg: 6.8,
          waistCm: 79,
        },
      };
    }

    return {
      kind: 'inbody_sheet',
      documentTitle: fileName || 'InBody_270_Termal_Cikti_Tarama.jpg',
      confidencePct: 98.4,
      extractedAt: now,
      clinicalFlags: [
        'ECW/TBW: 0.394 (Hafif Ödem / Hücre Dışı Su Tutulumu — Sodyum Kısıtlaması + Potasyum Desteği)',
        'Viseral Yağ: Seviye 11 (Abdominal Yağlanma Sınır Üstü — Akşam Karbonhidrat Kısıtlaması)',
        'Metabolik Yaş: 41 (Kronolojik Yaştan +6 Yıl Yüksek)',
      ],
      bodyValues: {
        weightKg: 81.6,
        bodyFatPct: 33.4,
        muscleMassKg: 28.9,
        visceralFatRating: 11,
        bodyWaterPct: 48.6,
        ecwTbwRatio: 0.394,
        metabolicAge: 41,
        phaseAngleDeg: 5.3,
        waistCm: 94,
      },
    };
  }

  /**
   * 7/24 Cep Diyetisyen Restoran & Menü Danışmanı (Klinik Sınır Korumalı RAG)
   */
  askMenuAdvisor(query: string): MenuAdvisorReply {
    const q = query.trim().toLocaleLowerCase('tr');
    const medicalKeywords = [
      'ilaç',
      'doz',
      'iğne',
      'bayıl',
      'çarpıntı',
      'göğüs ağrısı',
      'kanama',
      'insülin ünite',
      'ozempic doz',
    ];
    if (medicalKeywords.some((k) => q.includes(k))) {
      return {
        query,
        medicalEscalation: true,
        recommendedChoice:
          'Bu soru tıbbi/farmakolojik değerlendirme gerektirdiği için otomatik olarak diyetisyeninize öncelikli bildirim olarak iletilmelidir.',
        portionRule: 'İlaç dozu veya akut semptomlarda lütfen doğrudan uzmanınıza veya hekiminize danışın.',
        avoidList: 'Kendi başınıza ilaç/takviye doz değişikliği yapmayın.',
        glycemicTip: 'Talepler veya Mesajlar ekranından diyetisyeninize doğrudan yazabilirsiniz.',
      };
    }

    if (q.includes('balık') || q.includes('rakı') || q.includes('meze')) {
      return {
        query,
        medicalEscalation: false,
        recommendedChoice: 'Izgara Levrek / Çipura / Somon + Bol Roka Salatası + 2 Yemek Kaşığı Humus veya Deniz Börülcesi',
        portionRule: 'Ana yemek 1 tam ızgara balık; mezelerden kızartma olmayan 2 çeşit (toplam 3 yemek kaşığı). Ekmek sepetini masadan kaldırın.',
        avoidList: 'Kalamar tava, karides güveç (tereyağlı), patates kızartması, sıcak helva (paylaşarak maksimum 1 çatal).',
        glycemicTip: 'Yemeğe sirkeli/limonlu roka salatasıyla başlamak öğün sonrası glukoz pikini %30 azaltır.',
      };
    }

    if (q.includes('kahve') || q.includes('tatlı') || q.includes('çikolata') || q.includes('kriz')) {
      return {
        query,
        medicalEscalation: false,
        recommendedChoice: 'Sade Türk Kahvesi veya Americano + 2 Kare (%80+) Bitter Çikolata veya 1 Hurma (İçi 1 Tam Cevizli)',
        portionRule: 'Sütlü/şuruplu kahveler yerine sade kahve veya tarçınlı laktozsuz sütlü filtre kahve tercih edin.',
        avoidList: 'Beyaz çikolatalı mocha, karamel şuruplu latte (yaklaşık 380 kcal sıvı şeker), cheesecake.',
        glycemicTip: 'Tatlı isteği çoğu zaman susuzluk veya krom/magnezyum açlığıdır; önce 1 büyük bardak tarçınlı su için.',
      };
    }

    if (q.includes('gece') || q.includes('nöbet') || q.includes('açlık') || q.includes('uyku')) {
      return {
        query,
        medicalEscalation: false,
        recommendedChoice: '1 Su Bardağı Kefir veya 4 Yemek Kaşığı Ev Yoğurdu + 1 Çay Kaşığı Чиa / Tarçın + Salatalık Dilimleri',
        portionRule: 'Gece 21:30 sonrasında 150 kcal sınırını aşmayan, insülin salgılatmayan kazein/protein bazlı mini ara öğün.',
        avoidList: 'Meyve tabağı, kuruyemiş kasesi (porsiyon kontrolü zor), kraker/bisküvi.',
        glycemicTip: 'Gece meyve yemek büyüme hormonu (GH) salınımını baskılar; yoğurt/kefir ise gece yağ yakımını korur.',
      };
    }

    return {
      query: query || 'Dışarıda / Ev Dışı Öğün Seçimi',
      medicalEscalation: false,
      recommendedChoice: 'Izgara Et / Tavuk / Köfte veya Zeytinyağlı Sebze + 1 Kase Yoğurt/Ayran + Mevsim Salata',
      portionRule: 'Tabağınızın yarısını çiğ/pişmiş sebze, çeyreğini kaliteli protein, kalan çeyreğini ise 3-4 kaşık bulgur/karabuğday veya 1 dilim tam tahıl ekmeği yapın.',
      avoidList: 'Kremalı makarnalar, pane/kızartma soslu ürünler, şekerli meşrubatlar.',
      glycemicTip: 'Yemeav sıralaması: Önce lif (salata/sebze), sonra protein/yağ, en son karbonhidrat tüketin.',
    };
  }

  /**
   * Danışan Kopma (Churn) Tahmin Radarı & Kişiselleştirilmiş Geri Kazanım Mesajı
   */
  evaluateClientChurn(
    clients: readonly {
      id: string;
      firstName: string;
      lastName: string;
      daysSinceMeasurement: number;
      overdueTasks: number;
      unreadFromDietitian: number;
    }[],
  ): ChurnRiskAssessment[] {
    return clients
      .map((c) => {
        const reasons: string[] = [];
        let score = 15;

        if (c.daysSinceMeasurement >= 10) {
          score += 42;
          reasons.push(`${c.daysSinceMeasurement} gündür yeni tartı/ölçüm kaydı girilmedi`);
        } else if (c.daysSinceMeasurement >= 6) {
          score += 22;
          reasons.push(`${c.daysSinceMeasurement} gündür tartı güncellemesi bekleniyor`);
        }

        if (c.overdueTasks > 0) {
          score += c.overdueTasks * 18;
          reasons.push(`${c.overdueTasks} adet süresi geçmiş portal görevi var`);
        }

        if (c.unreadFromDietitian > 0) {
          score += 15;
          reasons.push('Gönderilen son mesaj henüz yanıtlanmadı');
        }

        if (reasons.length === 0) {
          reasons.push('Düzenli veri girişi ve yüksek seans uyumu');
        }

        const riskScore = Math.min(96, score);
        const riskLevel: 'high' | 'medium' | 'low' =
          riskScore >= 65 ? 'high' : riskScore >= 40 ? 'medium' : 'low';

        const fullName = `${c.firstName} ${c.lastName}`;
        const nudgeMessage =
          riskLevel === 'high'
            ? `Merhaba ${c.firstName} Hanım/Bey 🌿 Son birkaç gündür portalda tartı ve öğün kayıtlarınızı göremedim, her şey yolunda mı? Süreçte zorlandığınız bir öğün varsa listemizi 2 dakikada esnetebiliriz. Yanınızdayım! 💚`
            : riskLevel === 'medium'
              ? `Merhaba ${c.firstName} 🌟 Bu haftaki kontrolümüz öncesi sabah aç karnına güncel tartı ve su takibinizi portala girmenizi rica ederim. Harika gidiyoruz, ritmi koruyalım!`
              : `Merhaba ${c.firstName} 👏 Bu haftaki istikrarlı takibiniz için tebrik ederim! Yeni hafta hedeflerimiz için aynı enerjiyle devam ediyoruz.`;

        return {
          clientId: c.id,
          clientName: fullName,
          riskScore,
          riskLevel,
          daysSinceLastMeasurement: c.daysSinceMeasurement,
          overdueTasks: c.overdueTasks,
          reasons,
          nudgeMessage,
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Instagram / Web Metabolik Check-Up Hunisinden Gelen Örnek Potansiyel Danışanlar (Leads)
   */
  defaultLeads(): LeadCandidate[] {
    return [
      {
        id: 'lead-1',
        fullName: 'Selin Demirtaş',
        phone: '+90 532 418 92 10',
        email: 'selin.demirtas@ornek.com',
        age: 34,
        gender: 'female',
        heightCm: 165,
        weightKg: 78.4,
        targetWeightKg: 62,
        bmi: 28.8,
        metabolicAgeEstimate: 41,
        insulinRiskLabel: 'Yüksek Risk',
        goalLabel: 'İnsülin Direnci & Kalıcı Yağ Kaybı (-16 kg)',
        source: 'Instagram Bio Testi',
        createdAt: 'Bugün · 14 dk önce',
      },
      {
        id: 'lead-2',
        fullName: 'Kaan Özkan',
        phone: '+90 544 812 33 05',
        email: 'kaan.ozkan@ornek.com',
        age: 29,
        gender: 'male',
        heightCm: 181,
        weightKg: 94.0,
        targetWeightKg: 82,
        bmi: 28.7,
        metabolicAgeEstimate: 35,
        insulinRiskLabel: 'Orta Risk',
        goalLabel: 'Göbek Çevresi İncelme & Sporcu Beslenmesi',
        source: 'Web Metabolik Check-Up',
        createdAt: 'Bugün · 2 saat önce',
      },
      {
        id: 'lead-3',
        fullName: 'Ayilin Soylu',
        phone: '+90 533 901 44 77',
        email: 'aylin.soylu@ornek.com',
        age: 41,
        gender: 'female',
        heightCm: 162,
        weightKg: 83.0,
        targetWeightKg: 66,
        bmi: 31.6,
        metabolicAgeEstimate: 49,
        insulinRiskLabel: 'Yüksek Risk',
        goalLabel: 'Haşimato + Ödem Yönetimi & Online Takip',
        source: 'WhatsApp Huni',
        createdAt: 'Dün · 19:40',
      },
    ];
  }

  /**
   * Diyetisyenin Danışanlarına Satabileceği Hazır Online Hizmet & Takip Paketleri
   */
  defaultServicePackages(): ClinicServicePackage[] {
    return [
      {
        id: 'pkg-1',
        title: '1 Aylık Online Yoğun Beslenme & Portal Takip Paketi',
        durationLabel: '4 Hafta · 4 Görüntülü Seans',
        priceTl: 4500,
        installmentLabel: 'Kredi kartına 3 taksit imkânı',
        badge: 'En Çok Satan Başlangıç',
        includes: [
          'Haftalık kişiselleştirilmiş liste revizyonu',
          '7/24 OdivonDiet Danışan Portalı & su/öğün takibi',
          'AI Tabak Fotoğrafı geri bildirimi & WhatsApp desteği',
        ],
      },
      {
        id: 'pkg-2',
        title: '3 Aylık Metabolik Dönüşüm & İnsülin Direnci/GLP-1 Paketi',
        durationLabel: '12 Hafta · 12 Seans + Biyobelirteç Analizi',
        priceTl: 11500,
        installmentLabel: 'Kredi kartına 6 taksit imkânı',
        badge: 'Yüksek Klinik Gelir',
        includes: [
          'e-Nabız kan tahlili & HOMA-IR / mikronutrient takibi',
          'InBody / Tanita segmental kas-yağ ve ödem analizi',
          'Kaçamak telafi protokolü & haftalık market alışveriş listesi',
        ],
      },
      {
        id: 'pkg-3',
        title: 'Kurumsal / Spor Salonu (B2B2C) VIP Performans Paketi',
        durationLabel: '8 Hafta · Antrenman Günü Makro Döngüsü',
        priceTl: 8500,
        installmentLabel: 'Kurumsal fatura & taksit imkânı',
        badge: 'Sporcu & Kurumsal',
        includes: [
          'Antrenman / dinlenme günü karbonhidrat döngüsü (Carb-Cycling)',
          'Ergogenic supplement & hidrasyon protokolü',
          'Haftalık performans ve faz açısı (Phase Angle) izlemi',
        ],
      },
    ];
  }
}
