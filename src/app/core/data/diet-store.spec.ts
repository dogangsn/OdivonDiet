import { TestBed } from '@angular/core/testing';
import { isoDate } from '../../domain/diet-calc';
import { DietStore } from './diet-store';

describe('DietStore', () => {
  let store: DietStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(DietStore);
  });

  it('derives current weight from the latest measurement', () => {
    const view = store.view('c-1')!;
    expect(view.currentWeightKg).toBe(74.6);
    expect(view.changeKg).toBe(-7.4);

    store.addMeasurement({
      clientId: 'c-1',
      date: isoDate(new Date()),
      weightKg: 73.9,
      waistCm: null,
      hipCm: null,
      bodyFatPct: null,
      note: '',
    });
    expect(store.view('c-1')!.currentWeightKg).toBe(73.9);
    expect(store.view('c-1')!.daysSinceMeasurement).toBe(0);
  });

  it('keeps only one active plan per client', () => {
    store.savePlan({
      clientId: 'c-1',
      title: 'Faz 3',
      startDate: isoDate(new Date()),
      endDate: isoDate(new Date()),
      kcal: 1600,
      proteinPct: 30,
      carbPct: 40,
      fatPct: 30,
      meals: [],
      status: 'active',
      notes: '',
    });
    const active = store.plans().filter((p) => p.clientId === 'c-1' && p.status === 'active');
    expect(active.map((p) => p.title)).toEqual(['Faz 3']);
  });

  it('updates an existing client instead of duplicating it', () => {
    const before = store.clients().length;
    const existing = store.clients().find((c) => c.id === 'c-2')!;
    store.saveClient({ ...existing, targetWeightKg: 90 });
    expect(store.clients().length).toBe(before);
    expect(store.clients().find((c) => c.id === 'c-2')!.targetWeightKg).toBe(90);
  });

  it('flags missing consent and stale measurements', () => {
    const reasons = store.attention().map((a) => `${a.clientId}:${a.icon}`);
    expect(reasons).toContain('c-5:policy');
    expect(reasons).toContain('c-2:monitor_weight');
  });

  it('logs completed consultations', () => {
    store.completeConsultation('v-1', 5, 'Harika', '');
    expect(store.consultations().find((c) => c.id === 'v-1')!.status).toBe('done');
    expect(store.activity()[0].title).toBe('Görüşme tamamlandı');
  });
});
