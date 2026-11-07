import { TestBed } from '@angular/core/testing';
import axe from 'axe-core';
import { QuickActions } from '../forms/quick-actions';
import { ClientsPage } from './clients-page';

describe('ClientsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ClientsPage] }).compileComponents();
  });

  it('lists active clients and filters by search', async () => {
    const fixture = TestBed.createComponent(ClientsPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('li').length).toBe(5);
    fixture.componentInstance.typed.set('elif');
    await fixture.whenStable();
    expect(element.querySelectorAll('li').length).toBe(1);
    expect(element.textContent).toContain('Elif Kaya');
  });

  it('opens the client profile from a card', async () => {
    const fixture = TestBed.createComponent(ClientsPage);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('li button')!.click();
    expect(TestBed.inject(QuickActions).state()?.kind).toBe('client-detail');
  });

  it('has no critical or serious AXE violations', async () => {
    const fixture = TestBed.createComponent(ClientsPage);
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
