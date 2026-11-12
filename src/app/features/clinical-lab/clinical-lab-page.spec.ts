import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach } from 'vitest';
import { AuthStore } from '../../core/auth/auth-store';
import { ClinicalLabPage } from './clinical-lab-page';

describe('ClinicalLabPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ClinicalLabPage],
      providers: [provideRouter([])],
    }).compileComponents();
    TestBed.inject(AuthStore).continueDemo();
  });

  it('renders HOMA-IR, drug-nutrient interactions, GLP-1 sarcopenia radar, and chrono-nutrition tabs', () => {
    const fixture = TestBed.createComponent(ClinicalLabPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('HOMA-IR İnsülin Direnci İndeksi');
    expect(el.textContent).toContain('TG / HDL Aterojenik Dislipidemi İndeksi');

    fixture.componentInstance.activeTab.set('interactions');
    fixture.detectChanges();
    expect(el.textContent).toContain('İlaç × Beslenme Planı × Kan Tahlili');

    fixture.componentInstance.activeTab.set('glp1');
    fixture.detectChanges();
    expect(el.textContent).toContain('Sarkopeni & Yağsız Kütle Koruma Radarı');

    fixture.componentInstance.activeTab.set('chrono');
    fixture.detectChanges();
    expect(el.textContent).toContain('24 Saatlik Post-Prandiyal Glisemik Dalga Simülasyonu');

    fixture.componentInstance.activeTab.set('equations');
    fixture.detectChanges();
    expect(el.textContent).toContain('Katch-McArdle');
    expect(el.textContent).toContain('Cunningham Denklemi');
  });
});

