import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { BUILD_INFO } from './build-info';
import { BUILD_STORAGE_KEY, UPDATED_FLAG_KEY, clearCaches, clearClientState } from './client-reset';

export interface RemoteVersion {
  version: string;
  buildId?: string;
  commit?: string;
  releaseNotes?: string[];
}

@Injectable({ providedIn: 'root' })
export class VersionStore {
  private readonly document = inject(DOCUMENT);
  private timer: number | undefined;
  readonly current = BUILD_INFO;
  /** Ör. "v1.0.0 · a1b2c3d" */
  readonly label = `v${BUILD_INFO.version} · ${BUILD_INFO.commit}`;
  readonly remote = signal<RemoteVersion | null>(null);
  readonly updateRequired = signal(false);
  /** API eski sürümü reddettiyse (426) güncelleme ertelenemez. */
  readonly forced = signal(false);
  /** Kullanıcı "Daha sonra" dediyse bildirimin tekrar gösterileceği zaman. */
  private readonly snoozedUntil = signal(0);
  private readonly now = signal(Date.now());
  readonly showPrompt = computed(
    () => this.updateRequired() && (this.forced() || this.now() >= this.snoozedUntil()),
  );
  readonly updating = signal(false);
  /** Yeni sürüme geçişten sonra bir kez gösterilen bilgi notu. */
  readonly justUpdated = signal<string | null>(this.takeUpdatedFlag());

  start(): void {
    if (this.timer) return;
    void this.check();
    this.timer = window.setInterval(() => void this.check(), 300_000);
    this.document.addEventListener('visibilitychange', () => {
      if (this.document.visibilityState === 'visible') void this.check();
    });
  }

  async check(): Promise<void> {
    this.now.set(Date.now());
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const value = (await response.json()) as RemoteVersion;
      this.remote.set(value);
      if (value.buildId && value.buildId !== BUILD_INFO.buildId) this.updateRequired.set(true);
    } catch {}
  }

  requireUpdate(): void {
    this.forced.set(true);
    this.updateRequired.set(true);
    void this.check();
  }

  /** Bildirimi 30 dakika gizler; sayfa yenilendiğinde güncelleme zaten uygulanır. */
  snooze(): void {
    if (this.forced()) return;
    this.now.set(Date.now());
    this.snoozedUntil.set(Date.now() + 30 * 60_000);
  }

  /** Çerez, oturum ve önbellekleri temizler; yeni sürümle login sayfasını açar. */
  async applyUpdate(): Promise<void> {
    if (this.updating()) return;
    this.updating.set(true);
    try {
      clearClientState();
      await clearCaches();
      // Yeni paket yüklendiğinde main.ts tekrar temizlik yapmasın diye eski kaydı siliyoruz.
      localStorage.removeItem(BUILD_STORAGE_KEY);
      localStorage.setItem(UPDATED_FLAG_KEY, this.remote()?.version ?? BUILD_INFO.version);
    } catch {
    } finally {
      window.location.replace(`/login?v=${encodeURIComponent(this.remote()?.buildId ?? Date.now().toString())}`);
    }
  }

  dismissUpdatedNotice(): void {
    this.justUpdated.set(null);
  }

  private takeUpdatedFlag(): string | null {
    try {
      const value = localStorage.getItem(UPDATED_FLAG_KEY);
      if (value !== null) localStorage.removeItem(UPDATED_FLAG_KEY);
      return value;
    } catch {
      return null;
    }
  }
}
