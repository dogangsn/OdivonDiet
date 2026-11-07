import { isoDate } from '../../domain/diet-calc';
import {
  ActivityEntry,
  Client,
  Consultation,
  MealPlan,
  Measurement,
} from '../../domain/diet.models';

/**
 * Demo data, built relative to `today` so the dashboard always has a live-looking day.
 * Remove once the workspace reads from MainAPI.
 */
export function createSeed(today: Date) {
  const day = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d;
  };
  const at = (offset: number, hh: number, mm: number) => {
    const d = day(offset);
    d.setHours(hh, mm, 0, 0);
    return d.toISOString();
  };

  const clients: Client[] = [
    client(
      'c-1',
      'Elif',
      'Kaya',
      'female',
      '1992-04-12',
      168,
      82,
      68,
      'moderate',
      'weight_loss',
      [],
      ['Laktoz'],
      -84,
    ),
    client(
      'c-2',
      'Mert',
      'Yıldız',
      'male',
      '1988-09-03',
      181,
      104,
      88,
      'light',
      'weight_loss',
      ['Tip 2 diyabet'],
      [],
      -70,
    ),
    client(
      'c-3',
      'Selin',
      'Aras',
      'female',
      '1996-01-22',
      163,
      54,
      58,
      'active',
      'weight_gain',
      [],
      ['Fıstık'],
      -56,
    ),
    client(
      'c-4',
      'Burak',
      'Demir',
      'male',
      '1999-06-30',
      186,
      79,
      83,
      'very_active',
      'sports',
      [],
      [],
      -42,
    ),
    client(
      'c-5',
      'Zeynep',
      'Şahin',
      'female',
      '1979-11-08',
      160,
      77,
      66,
      'sedentary',
      'clinical',
      ['Hipotiroidi', 'İnsülin direnci'],
      ['Gluten'],
      -35,
      null,
    ),
    client(
      'c-6',
      'Can',
      'Öztürk',
      'male',
      '1985-03-15',
      175,
      92,
      80,
      'light',
      'weight_loss',
      [],
      [],
      -120,
      undefined,
      'paused',
    ),
  ];

  const series: Record<string, Array<[number, number, number | null]>> = {
    // [day offset, weight, body fat %]
    'c-1': [
      [-84, 82, 34],
      [-70, 80.6, 33.2],
      [-56, 79.1, 32.5],
      [-42, 77.8, 31.6],
      [-28, 76.9, 31],
      [-14, 75.4, 30.1],
      [-3, 74.6, 29.6],
    ],
    'c-2': [
      [-70, 104, 31],
      [-56, 102.2, 30.4],
      [-42, 101.5, 30.1],
      [-28, 101.9, 30.3],
      [-21, 100.8, 29.8],
    ],
    'c-3': [
      [-56, 54, 19],
      [-42, 54.6, 19.2],
      [-28, 55.3, 19.6],
      [-14, 55.9, 19.9],
      [-2, 56.4, 20.1],
    ],
    'c-4': [
      [-42, 79, 12],
      [-28, 79.8, 12.1],
      [-14, 80.7, 12.2],
      [-6, 81.2, 12.3],
    ],
    'c-5': [
      [-35, 77, 38],
      [-21, 76.1, 37.5],
      [-7, 75.3, 37],
    ],
    'c-6': [
      [-120, 92, 28],
      [-100, 90.4, 27.4],
      [-80, 89.9, 27.1],
    ],
  };
  const measurements: Measurement[] = Object.entries(series).flatMap(([clientId, rows]) =>
    rows.map(([offset, weightKg, bodyFatPct], index) => ({
      id: `m-${clientId}-${index}`,
      clientId,
      date: isoDate(day(offset)),
      weightKg,
      waistCm: Math.round(weightKg * 1.02),
      hipCm: Math.round(weightKg * 1.2),
      bodyFatPct,
      note: index === 0 ? 'Başlangıç ölçümü' : '',
    })),
  );

  const plans: MealPlan[] = [
    plan('p-1', 'c-1', 'Kilo verme · Faz 2', -28, 28, 1650, 30, 40, 30, 'active'),
    plan('p-0', 'c-1', 'Kilo verme · Faz 1', -84, -29, 1750, 25, 45, 30, 'completed'),
    plan('p-2', 'c-2', 'Düşük glisemik indeksli plan', -42, 14, 1900, 25, 40, 35, 'active'),
    plan('p-3', 'c-3', 'Sağlıklı kilo alımı', -56, 28, 2300, 20, 50, 30, 'active'),
    plan('p-4', 'c-4', 'Kas kütlesi · antrenman günleri', -14, 42, 3100, 25, 50, 25, 'active'),
    plan('p-5', 'c-5', 'Glutensiz anti-inflamatuar plan', 0, 28, 1500, 25, 40, 35, 'draft'),
  ];

  const consultations: Consultation[] = [
    visit('v-1', 'c-1', at(0, 9, 30), 'clinic', 'scheduled'),
    visit('v-2', 'c-4', at(0, 11, 0), 'video', 'scheduled'),
    visit('v-3', 'c-5', at(0, 15, 30), 'clinic', 'scheduled'),
    visit('v-4', 'c-2', at(2, 10, 0), 'phone', 'scheduled'),
    visit('v-5', 'c-3', at(5, 14, 0), 'video', 'scheduled'),
    visit(
      'v-6',
      'c-1',
      at(-14, 9, 30),
      'clinic',
      'done',
      4,
      'Akşam atıştırmaları azaldı, su tüketimi hedefte.',
      'Ara öğüne protein ekle',
    ),
    visit(
      'v-7',
      'c-2',
      at(-21, 16, 0),
      'clinic',
      'done',
      2,
      'Hafta sonları plana uyum zorlanıyor.',
      'Hafta sonu için esnek menü hazırla',
    ),
    visit('v-8', 'c-2', at(-35, 16, 0), 'video', 'done', 3, 'Kan şekeri takibi düzenli.', ''),
    visit(
      'v-9',
      'c-3',
      at(-14, 13, 0),
      'video',
      'done',
      5,
      'Kalori hedefi tutturuluyor.',
      'Porsiyonları %10 artır',
    ),
    visit(
      'v-10',
      'c-4',
      at(-6, 18, 0),
      'message',
      'done',
      4,
      'Antrenman sonrası öğün düzeni oturdu.',
      '',
    ),
    visit(
      'v-11',
      'c-5',
      at(-7, 10, 30),
      'clinic',
      'done',
      3,
      'Gluten hassasiyeti nedeniyle plan revize edilecek.',
      'Glutensiz plan hazırla',
    ),
  ];

  const activity: ActivityEntry[] = [
    {
      id: 'a-1',
      at: at(-1, 17, 20),
      icon: 'monitor_weight',
      tone: 'info',
      title: 'Yeni ölçüm kaydedildi',
      detail: 'Selin Aras · 56,4 kg',
    },
    {
      id: 'a-2',
      at: at(-1, 11, 5),
      icon: 'restaurant_menu',
      tone: 'primary',
      title: 'Beslenme planı taslağı oluşturuldu',
      detail: 'Zeynep Şahin · 1500 kcal',
    },
    {
      id: 'a-3',
      at: at(-3, 9, 45),
      icon: 'monitor_weight',
      tone: 'info',
      title: 'Yeni ölçüm kaydedildi',
      detail: 'Elif Kaya · 74,6 kg',
    },
    {
      id: 'a-4',
      at: at(-6, 18, 30),
      icon: 'task_alt',
      tone: 'positive',
      title: 'Görüşme tamamlandı',
      detail: 'Burak Demir · uyum 4/5',
    },
  ];

  return { clients, measurements, plans, consultations, activity };

  function client(
    id: string,
    firstName: string,
    lastName: string,
    sex: Client['sex'],
    birthDate: string,
    heightCm: number,
    startWeightKg: number,
    targetWeightKg: number,
    activityLevel: Client['activity'],
    program: Client['program'],
    conditions: string[],
    allergies: string[],
    createdOffset: number,
    consent: string | null | undefined = undefined,
    status: Client['status'] = 'active',
  ): Client {
    const slug = `${firstName}.${lastName}`.toLocaleLowerCase('tr').replace(/[^a-z.]/g, '');
    return {
      id,
      firstName,
      lastName,
      email: `${slug}@ornek.com`,
      phone: '+90 5•• ••• •• ••',
      birthDate,
      sex,
      heightCm,
      startWeightKg,
      targetWeightKg,
      activity: activityLevel,
      program,
      conditions,
      allergies,
      consentAt: consent === undefined ? isoDate(day(createdOffset)) : consent,
      status,
      createdAt: day(createdOffset).toISOString(),
    };
  }

  function plan(
    id: string,
    clientId: string,
    title: string,
    startOffset: number,
    endOffset: number,
    kcal: number,
    proteinPct: number,
    carbPct: number,
    fatPct: number,
    status: MealPlan['status'],
  ): MealPlan {
    return {
      id,
      clientId,
      title,
      startDate: isoDate(day(startOffset)),
      endDate: isoDate(day(endOffset)),
      kcal,
      proteinPct,
      carbPct,
      fatPct,
      meals: [
        { name: 'Kahvaltı', time: '08:00', kcal: Math.round(kcal * 0.25) },
        { name: 'Ara öğün', time: '10:30', kcal: Math.round(kcal * 0.1) },
        { name: 'Öğle', time: '13:00', kcal: Math.round(kcal * 0.3) },
        { name: 'Ara öğün', time: '16:00', kcal: Math.round(kcal * 0.1) },
        { name: 'Akşam', time: '19:00', kcal: Math.round(kcal * 0.25) },
      ],
      status,
      notes: '',
    };
  }

  function visit(
    id: string,
    clientId: string,
    when: string,
    channel: Consultation['channel'],
    status: Consultation['status'],
    adherence: number | null = null,
    notes = '',
    nextAction = '',
  ): Consultation {
    return { id, clientId, at: when, channel, status, adherence, notes, nextAction };
  }
}
