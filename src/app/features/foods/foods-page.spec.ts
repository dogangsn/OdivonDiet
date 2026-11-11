import { TestBed } from '@angular/core/testing';
import { DietStore } from '../../core/data/diet-store';
import { FoodsPage } from './foods-page';

describe('FoodsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FoodsPage] }).compileComponents();
  });

  it('filters the food library and creates a custom dish with Atwater calorie calculation', async () => {
    const fixture = TestBed.createComponent(FoodsPage);
    const store = TestBed.inject(DietStore);
    const comp = fixture.componentInstance;
    await fixture.whenStable();

    expect(comp.filteredFoods().length).toBe(store.foods().length);

    comp.categoryFilter.set('yemek');
    expect(comp.filteredFoods().every((f) => f.category === 'yemek')).toBe(true);

    comp.resetFilters();
    const initialCount = store.foods().length;
    comp.startCreate();
    comp.patchDraft({
      name: 'Fırında sebzeli mücver',
      unit: '2 adet',
      grams: 160,
      proteinG: 10,
      carbG: 20,
      fatG: 8,
      autoKcal: true,
    });
    expect(comp.draft().kcal).toBe(10 * 4 + 20 * 4 + 8 * 9);
    comp.saveFood();
    expect(store.foods().length).toBe(initialCount + 1);
  });
});

