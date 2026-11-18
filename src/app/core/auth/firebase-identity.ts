import { Injectable, signal } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import type { AppCheck } from 'firebase/app-check';
import type { Auth, User } from 'firebase/auth';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseIdentity {
  readonly user = signal<User | null>(null);
  private app?: FirebaseApp;
  private auth?: Auth;
  private appCheck?: AppCheck;

  readonly configured = Boolean(environment.firebase.apiKey);

  async initialize(): Promise<void> {
    if (this.app || !environment.firebase.apiKey) return;
    const [{ initializeApp }, authMod] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
    ]);
    this.app = initializeApp(environment.firebase);
    this.auth = authMod.getAuth(this.app);
    await authMod.setPersistence(this.auth, authMod.browserLocalPersistence);
    authMod.onAuthStateChanged(this.auth, (user) => this.user.set(user));
    if (environment.appCheckSiteKey) {
      const appCheckMod = await import('firebase/app-check');
      this.appCheck = appCheckMod.initializeAppCheck(this.app, {
        provider: new appCheckMod.ReCaptchaEnterpriseProvider(environment.appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  }

  async idToken(): Promise<string | null> {
    if (!this.configured) return null;
    await this.initialize();
    return this.auth?.currentUser?.getIdToken() ?? null;
  }

  /**
   * Role claims set by MainAPI on the Firebase user (`role`, `clientId`).
   * Members only ever receive their own `clientId`, so the portal cannot read other clients.
   */
  async claims(): Promise<{ role?: string; clientId?: string }> {
    if (!this.configured) return {};
    await this.initialize();
    const user = this.auth?.currentUser;
    if (!user) return {};
    const result = await user.getIdTokenResult();
    return {
      role: typeof result.claims['role'] === 'string' ? result.claims['role'] : undefined,
      clientId:
        typeof result.claims['clientId'] === 'string' ? result.claims['clientId'] : undefined,
    };
  }

  async requestHeaders(): Promise<Record<string, string>> {
    if (!this.configured) return {};
    const headers: Record<string, string> = {};
    const token = await this.idToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (this.appCheck) {
      const { getToken } = await import('firebase/app-check');
      const result = await getToken(this.appCheck, false);
      headers['X-Firebase-AppCheck'] = result.token;
    }
    return headers;
  }

  async signIn(email: string, password: string): Promise<User> {
    await this.initialize();
    if (!this.auth) throw new Error('Firebase Auth is not configured.');
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    return (await signInWithEmailAndPassword(this.auth, email, password)).user;
  }

  /**
   * Accounts are created by MainAPI (`/identity/register`), which creates the Firebase user, the
   * diet tenant with this user as owner, and sends the verification e-mail. We then sign in so the
   * verification screen can poll and resend.
   */
  async register(name: string, email: string, password: string, practice = ''): Promise<User> {
    await this.mainApi('/identity/register', {
      email,
      password,
      displayName: name,
      tenantName: practice.trim() || name,
      module: 'diet',
    });
    return this.signIn(email, password);
  }

  /** Asks MainAPI to send the verification e-mail again (its link confirms on MainAPI). */
  async sendVerification(user = this.auth?.currentUser ?? null): Promise<void> {
    if (!user?.email) throw new Error('No signed-in user to verify.');
    await this.mainApi('/identity/resend-verification', { email: user.email });
  }

  private async mainApi(path: string, body: unknown): Promise<void> {
    const response = await fetch(`${environment.apiBaseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (response.ok) return;
    const json = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    throw new MainApiError(response.status, json?.error?.code ?? 'HTTP_ERROR', json?.error?.message ?? '');
  }

  /** Re-reads the signed-in user from Firebase and reports whether the e-mail is verified. */
  async refreshVerified(): Promise<boolean> {
    if (!this.configured) return false;
    await this.initialize();
    const user = this.auth?.currentUser;
    if (!user) return false;
    const { reload } = await import('firebase/auth');
    await reload(user);
    // Force a fresh ID token so MainAPI sees `email_verified: true`.
    if (user.emailVerified) await user.getIdToken(true);
    return user.emailVerified;
  }

  /** Applies the `oobCode` from a verification link opened in this app. */
  async applyVerificationLink(oobCode: string): Promise<void> {
    await this.initialize();
    if (!this.auth) throw new Error('Firebase Auth is not configured.');
    const { applyActionCode } = await import('firebase/auth');
    await applyActionCode(this.auth, oobCode);
  }

  async logout(): Promise<void> {
    if (!this.configured) return;
    await this.initialize();
    if (this.auth) {
      const { signOut } = await import('firebase/auth');
      await signOut(this.auth);
    }
  }
}

export class MainApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message || code);
  }
}
