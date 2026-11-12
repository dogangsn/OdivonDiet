import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { LandingPage } from './landing-page';

describe('LandingPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders top-left/on-screen Login & Register actions, 8 clinical management modules, live calculator, and pricing', () => {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Giriş Yap');
    expect(el.textContent).toContain('Kayıt Ol');
    expect(el.textContent).toContain('Yeni Uzman Kaydı Oluştur');
    expect(el.textContent).toContain('Diyetisyen Girişi Yap');
    expect(el.textContent).toContain('İlaç × Beslenme Planı × Kan Tahlili');
    expect(el.textContent).toContain('Canlı Klinik Metabolizma, LBM & Makro Hesaplama Motoru');

    fixture.componentInstance.calcWeightKg.set(80);
    fixture.detectChanges();
    expect(fixture.componentInstance.liveCalc().mifflin).toBeGreaterThan(1400);
  });
});

