import { isDevMode } from '@angular/core';
import { BUILD_INFO } from './build-info';

/** Tarayıcıda en son çalışan sürümün buildId'si burada tutulur. */
export const BUILD_STORAGE_KEY = 'odivon:build';
/** Sürüm geçişinden sonra login sayfasında gösterilecek bilgi notu. */
export const UPDATED_FLAG_KEY = 'odivon:updated-to';
/** Sürüm değişse bile korunacak kullanıcı tercihleri. */
const PRESERVED_KEYS = ['odivon:theme', 'odivon:preferred_lang'];

/** Bu domaine ait tüm çerezleri (path ve domain varyasyonlarıyla) siler. */
export function clearCookies(doc: Document = document): void {
  const host = doc.location?.hostname ?? '';
  const parts = host.split('.');
  const domains = [''];
  for (let i = 0; i < parts.length - 1; i++) domains.push(`; domain=.${parts.slice(i).join('.')}`);
  const segments = (doc.location?.pathname ?? '/').split('/').filter(Boolean);
  const paths = ['/', ...segments.map((_, i) => '/' + segments.slice(0, i + 1).join('/'))];
  for (const raw of doc.cookie ? doc.cookie.split(';') : []) {
    const name = raw.split('=')[0].trim();
    if (!name) continue;
    for (const domain of domains)
      for (const path of paths)
        doc.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=${path}${domain}`;
  }
}

/** Oturum, çerez ve önbellekleri temizler; tema/dil tercihlerini korur. */
export function clearClientState(): void {
  try {
    const keep = PRESERVED_KEYS.map((key) => [key, localStorage.getItem(key)] as const);
    localStorage.clear();
    for (const [key, value] of keep) if (value !== null) localStorage.setItem(key, value);
  } catch {}
  try {
    sessionStorage.clear();
  } catch {}
  try {
    clearCookies();
  } catch {}
  void clearCaches();
}

export async function clearCaches(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {}
}

/**
 * Uygulama açılmadan önce çağrılır. Tarayıcıdaki son sürüm ile bu paketin sürümü
 * farklıysa çerez/önbellek/oturum temizlenir ve kullanıcı login sayfasına yönlendirilir.
 * Dönüş değeri true ise yönlendirme başlatılmıştır; uygulama başlatılmamalıdır.
 */
export function resetClientIfNewBuild(): boolean {
  let previous: string | null = null;
  let hadSession = false;
  try {
    previous = localStorage.getItem(BUILD_STORAGE_KEY);
    hadSession = localStorage.getItem('odivon:session') !== null;
  } catch {
    return false;
  }
  // Geliştirme sunucusunda her yeniden başlatmada oturumu düşürmemek için sadece kaydet.
  if (isDevMode()) {
    localStorage.setItem(BUILD_STORAGE_KEY, BUILD_INFO.buildId);
    return false;
  }
  // İlk ziyaret: kaydedilmiş sürüm ve oturum yoksa temizlenecek bir şey yok.
  const isNewBuild = previous !== BUILD_INFO.buildId && (previous !== null || hadSession);
  if (!isNewBuild) {
    if (previous === null) localStorage.setItem(BUILD_STORAGE_KEY, BUILD_INFO.buildId);
    return false;
  }
  clearClientState();
  localStorage.setItem(BUILD_STORAGE_KEY, BUILD_INFO.buildId);
  localStorage.setItem(UPDATED_FLAG_KEY, BUILD_INFO.version);
  if (location.pathname !== '/login') {
    location.replace('/login');
    return true;
  }
  return false;
}
