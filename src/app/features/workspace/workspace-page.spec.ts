import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { PRODUCT_NAVIGATION } from '../../domain/domain-navigation';
import { WorkspacePage } from './workspace-page';

describe('WorkspacePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspacePage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { view: 'domain', section: PRODUCT_NAVIGATION[0].key },
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('renders the product domain with its detailed fields', async () => {
    const fixture = TestBed.createComponent(WorkspacePage);
    fixture.componentInstance.openCreate();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain(PRODUCT_NAVIGATION[0].title);
    expect(element.textContent).toContain('Teknik ve mevzuat bilgileri');
  });

  it('opens a record detail and exposes its audit trail', async () => {
    const fixture = TestBed.createComponent(WorkspacePage);
    const component = fixture.componentInstance;
    component.openDetail(component.rows()[0]);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Denetim izi');
    expect(element.textContent).toContain(component.rows()[0].name);
  });

  it('creates a valid detailed record', async () => {
    const fixture = TestBed.createComponent(WorkspacePage);
    const component = fixture.componentInstance;
    const initialCount = component.rows().length;
    component.openCreate();
    component.draftModel.update((value) => ({
      ...value,
      name: 'Yeni doğrulama kaydı',
      code: 'ODV-TEST-001',
      location: 'İstanbul / Test Tesisi',
      primaryValue: 'Test teknik değeri',
      dueDate: '2026-12-31',
      status: 'active',
    }));
    component.handleDrawerSubmit();
    await fixture.whenStable();
    expect(component.rows().length).toBe(initialCount + 1);
    expect(component.rows()[0].name).toBe('Yeni doğrulama kaydı');
  });
});
