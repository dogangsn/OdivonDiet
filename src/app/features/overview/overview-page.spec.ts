import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import axe from 'axe-core';
import { OverviewPage } from './overview-page';

describe('OverviewPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverviewPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it("shows today's consultations from the shared store", async () => {
    const fixture = TestBed.createComponent(OverviewPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Bugünün programı');
    expect(text).toContain('Elif Kaya');
    expect(text).toContain('KVKK açık rızası alınmadı');
  });

  it('has no critical or serious AXE violations', async () => {
    const fixture = TestBed.createComponent(OverviewPage);
    await fixture.whenStable();
    const result = await axe.run(fixture.nativeElement as HTMLElement, {
      resultTypes: ['violations'],
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(
      result.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
    ).toEqual([]);
  });
});
