import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../../core/auth/auth-store';
import { SettingsPage } from './settings-page';

describe('SettingsPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SettingsPage],
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('loads session details, saves updated practice settings, and toggles KVKK protocol view', () => {
    const auth = TestBed.inject(AuthStore);
    auth.continueDemo({
      name: 'Uzm. Dyt. Deniz Arslan',
      email: 'deniz@odivon.com',
      practice: 'Odivon Beslenme Kliniği',
      specialty: 'Metabolik Beslenme',
      licenseNo: 'TR-DYT-10482',
    });

    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.practiceName.set('Nişantaşı Klinik Merkezi');
    comp.setDuration('60');
    comp.saveSettings();

    expect(auth.session()?.practice).toBe('Nişantaşı Klinik Merkezi');
    expect(comp.sessionDurationMin()).toBe(60);

    expect(comp.showKvkkModal()).toBe(false);
    comp.showKvkkModal.set(true);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('6698 Sayılı KVKK Kapsamında Özel Nitelikli Sağlık Verisi');
  });
});

