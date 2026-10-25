import { Injectable, computed, inject, signal } from '@angular/core';
import { FirebaseIdentity } from './firebase-identity';

export interface AppSession {
  readonly name: string;
  readonly email: string;
  readonly demo: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly identity = inject(FirebaseIdentity);
  private readonly storageKey = 'odivon:session';
  readonly session = signal<AppSession | null>(this.restore());
  readonly isAuthenticated = computed(() => this.session() !== null);

  async signIn(email: string, password: string): Promise<void> {
    if (!this.identity.configured) {
      this.persist({ name: email.split('@')[0] || 'Odivon Kullanıcısı', email, demo: true });
      return;
    }
    const user = await this.identity.signIn(email, password);
    this.persist({ name: user.displayName || email.split('@')[0], email, demo: false });
  }
  async register(name: string, email: string, password: string): Promise<void> {
    if (!this.identity.configured) {
      this.persist({ name, email, demo: true });
      return;
    }
    const user = await this.identity.register(name, email, password);
    this.persist({ name: user.displayName || name, email, demo: false });
  }
  continueDemo(): void {
    this.persist({ name: 'Demo Yöneticisi', email: 'demo@odivon.com', demo: true });
  }
  logout(): void {
    void this.identity.logout();
    localStorage.removeItem(this.storageKey);
    this.session.set(null);
  }
  private persist(session: AppSession): void {
    localStorage.setItem(this.storageKey, JSON.stringify(session));
    this.session.set(session);
  }
  private restore(): AppSession | null {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) ?? 'null') as AppSession | null;
    } catch {
      return null;
    }
  }
}
