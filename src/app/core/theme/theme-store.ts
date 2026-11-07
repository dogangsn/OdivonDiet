import { Injectable, signal } from '@angular/core';

const KEY = 'odivon:theme';

/** Light/dark theme. Follows the system setting until the user picks one. */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  readonly dark = signal(this.initial());

  constructor() {
    this.apply();
  }

  toggle(): void {
    this.dark.update((v) => !v);
    try {
      localStorage.setItem(KEY, this.dark() ? 'dark' : 'light');
    } catch {
      /* storage unavailable */
    }
    this.apply();
  }

  private apply(): void {
    document.documentElement.classList.toggle('dark', this.dark());
  }

  private initial(): boolean {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) return stored === 'dark';
    } catch {
      /* storage unavailable */
    }
    return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
