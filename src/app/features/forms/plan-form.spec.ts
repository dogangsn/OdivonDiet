import { TestBed } from '@angular/core/testing';
import { DietStore } from '../../core/data/diet-store';
import { PlanForm } from './plan-form';
import { QuickActions } from './quick-actions';

describe('PlanForm', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PlanForm] }).compileComponents();
  });

  it('pre-fills the suggested energy target and rejects macros that do not add up', async () => {
    const fixture = TestBed.createComponent(PlanForm);
    const store = TestBed.inject(DietStore);
    TestBed.inject(QuickActions).open('plan', 'c-1');
    await fixture.whenStable();
    const form = fixture.componentInstance;
    expect(form.model().kcal).toBeGreaterThan(1000);

    const before = store.plans().length;
    form.model.update((v) => ({ ...v, title: 'Test planı', proteinPct: 50 }));
    form.save();
    await fixture.whenStable();
    expect(store.plans().length).toBe(before);

    form.model.update((v) => ({ ...v, proteinPct: 25 }));
    form.save();
    await fixture.whenStable();
    expect(store.plans().length).toBe(before + 1);
  });

  it('calculates meal calories from foods, scales portions, and syncs target from menu', async () => {
    const fixture = TestBed.createComponent(PlanForm);
    TestBed.inject(QuickActions).open('plan', 'c-1');
    await fixture.whenStable();
    const form = fixture.componentInstance;

    form.applyPreset('low-gi');
    expect(form.menuSummary().itemCount).toBeGreaterThan(5);
    const beforeKcal = form.menuSummary().kcal;

    form.adjustPortion(0, 0, 1);
    expect(form.menuSummary().kcal).toBeGreaterThan(beforeKcal);

    form.syncTargetFromMenu();
    expect(form.model().kcal).toBe(form.menuSummary().kcal);
    expect(form.macroTotal()).toBe(100);
  });
});
