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
}
