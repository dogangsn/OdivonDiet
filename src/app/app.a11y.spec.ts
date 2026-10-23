import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import axe from 'axe-core';
import { App } from './app';

describe('App accessibility', () => {
  it('has no critical or serious AXE violations', async () => {
    await TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const result = await axe.run(fixture.nativeElement as HTMLElement, {
      resultTypes: ['violations'],
      rules: { 'color-contrast': { enabled: false } },
    });
    const blocking = result.violations.filter(violation =>
      violation.impact === 'critical' || violation.impact === 'serious',
    );
    expect(blocking).toEqual([]);
  });
});
