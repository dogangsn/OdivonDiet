import { Injectable, signal } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  AppCheck,
  ReCaptchaEnterpriseProvider,
  getToken,
  initializeAppCheck,
} from 'firebase/app-check';
import {
  Auth,
  User,
  applyActionCode,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
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
    this.app = initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
    await setPersistence(this.auth, browserLocalPersistence);
    onAuthStateChanged(this.auth, (user) => this.user.set(user));
    if (environment.appCheckSiteKey) {
      this.appCheck = initializeAppCheck(this.app, {
        provider: new ReCaptchaEnterpriseProvider(environment.appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  }

  async idToken(): Promise<string | null> {
    await this.initialize();
    return this.auth?.currentUser?.getIdToken() ?? null;
  }

  /**
   * Role claims set by MainAPI on the Firebase user (`role`, `clientId`).
   * Members only ever receive their own `clientId`, so the portal cannot read other clients.
   */
  async claims(): Promise<{ role?: string; clientId?: string }> {
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
    const headers: Record<string, string> = {};
    const token = await this.idToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (this.appCheck) {
      const result = await getToken(this.appCheck, false);
      headers['X-Firebase-AppCheck'] = result.token;
    }
    return headers;
  }

  async signIn(email: string, password: string): Promise<User> {
    await this.initialize();
    if (!this.auth) throw new Error('Firebase Auth is not configured.');
    return (await signInWithEmailAndPassword(this.auth, email, password)).user;
  }

  async register(name: string, email: string, password: string): Promise<User> {
    await this.initialize();
    if (!this.auth) throw new Error('Firebase Auth is not configured.');
    const user = (await createUserWithEmailAndPassword(this.auth, email, password)).user;
    await updateProfile(user, { displayName: name });
    await this.sendVerification(user);
    return user;
  }

  /** Sends Firebase's verification e-mail; the link brings the user back to `/verify-email`. */
  async sendVerification(user = this.auth?.currentUser ?? null): Promise<void> {
    if (!user) throw new Error('No signed-in user to verify.');
    await sendEmailVerification(user, {
      url: `${globalThis.location?.origin ?? ''}/verify-email`,
    });
  }

  /** Re-reads the signed-in user from Firebase and reports whether the e-mail is verified. */
  async refreshVerified(): Promise<boolean> {
    await this.initialize();
    const user = this.auth?.currentUser;
    if (!user) return false;
    await reload(user);
    // Force a fresh ID token so MainAPI sees `email_verified: true`.
    if (user.emailVerified) await user.getIdToken(true);
    return user.emailVerified;
  }

  /** Applies the `oobCode` from a verification link opened in this app. */
  async applyVerificationLink(oobCode: string): Promise<void> {
    await this.initialize();
    if (!this.auth) throw new Error('Firebase Auth is not configured.');
    await applyActionCode(this.auth, oobCode);
  }

  async logout(): Promise<void> {
    await this.initialize();
    if (this.auth) await signOut(this.auth);
  }
}
