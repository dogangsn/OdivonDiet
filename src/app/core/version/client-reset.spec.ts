import { clearClientState } from './client-reset';

describe('clearClientState', () => {
  beforeEach(() => localStorage.clear());

  it('oturumu ve diğer verileri siler, tema/dil tercihlerini korur', () => {
    localStorage.setItem('odivon:session', '{"name":"x"}');
    localStorage.setItem('odivon:theme', 'dark');
    localStorage.setItem('odivon:preferred_lang', 'en');
    sessionStorage.setItem('tmp', '1');
    document.cookie = 'odv_test=1; path=/';

    clearClientState();

    expect(localStorage.getItem('odivon:session')).toBeNull();
    expect(localStorage.getItem('odivon:theme')).toBe('dark');
    expect(localStorage.getItem('odivon:preferred_lang')).toBe('en');
    expect(sessionStorage.getItem('tmp')).toBeNull();
    expect(document.cookie).not.toContain('odv_test');
  });
});
