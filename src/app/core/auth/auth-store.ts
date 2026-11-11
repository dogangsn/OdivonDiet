import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import type { UserRole } from '../../domain/portal.models';
import { SAMPLE_WORKSPACE } from '../data/workspace';
import { FirebaseIdentity } from './firebase-identity';

export interface AppSession {
  readonly name: string;
  readonly email: string;
  readonly demo: boolean;
  readonly practice?: string;
  readonly specialty?: string;
  readonly licenseNo?: string;
  readonly workspaceMode?: string;
  /** Missing on sessions saved before the member portal existed; treated as `dietitian`. */
  readonly role?: UserRole;
  /** Only for members: the client record this login belongs to. */
  readonly clientId?: string;
  /** The demo account with sample data. Real accounts start with an empty practice. */
  readonly sample?: boolean;
  /** Only for members without Firebase: the dietitian workspace the client belongs to. */
  readonly workspace?: string;
}

/** Thrown when a login exists but is not allowed into the chosen area. */
export class PortalAccessError extends Error {}

/** Thrown when the account exists but its e-mail address is not verified yet. */
export class EmailNotVerifiedError extends Error {}

/** Thrown when a verification code or link is wrong, expired or not confirmed yet. */
export class VerificationError extends Error {}

/** A registration waiting for its e-mail address to be confirmed. */
export interface PendingVerification {
  readonly name: string;
  readonly email: string;
  readonly practice: string;
  readonly demo: boolean;
  /** Demo mode only: there is no mail server, so the 6-digit code is kept locally. */
  readonly code?: string;
  readonly expiresAt?: number;
  /** When the last e-mail went out; drives the resend cooldown. */
  readonly sentAt: number;
}

/** Minimum wait between two verification e-mails. */
export const RESEND_COOLDOWN_MS = 60_000;
/** Lifetime of a demo verification code. */
export const CODE_TTL_MS = 15 * 60_000;

function newCode(): string {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return String(value[0] % 1_000_000).padStart(6, '0');
}

/** Home route for each role. */
export const HOME_BY_ROLE: Record<UserRole, string> = {
  dietitian: '/overview',
  member: '/portal',
};

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly identity = inject(FirebaseIdentity);
  private readonly injector = inject(Injector);
  private readonly storageKey = 'odivon:session';
  private readonly pendingKey = 'odivon:pending-verification';
  readonly session = signal<AppSession | null>(this.restore());
  readonly pendingVerification = signal<PendingVerification | null>(this.restorePending());
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly role = computed<UserRole | null>(() => {
    const session = this.session();
    return session ? (session.role ?? 'dietitian') : null;
  });
  readonly homePath = computed(() => HOME_BY_ROLE[this.role() ?? 'dietitian']);

  async signIn(email: string, password: string): Promise<void> {
    if (!this.identity.configured) {
      const pending = this.pendingVerification();
      if (pending?.demo && pending.email.toLowerCase() === email.toLowerCase()) {
        throw new EmailNotVerifiedError('E-posta adresiniz henüz doğrulanmadı.');
      }
      this.persist({
        name: email.split('@')[0] || 'Odivon Kullanıcısı',
        email,
        demo: true,
        sample: false,
        role: 'dietitian',
      });
      return;
    }
    const user = await this.identity.signIn(email, password);
    const claims = await this.identity.claims();
    if (claims.role === 'member') {
      await this.identity.logout();
      throw new PortalAccessError('Bu hesap danışan hesabı. Danışan girişini kullanın.');
    }
    if (!user.emailVerified) {
      // Stay signed in to Firebase so the verification e-mail can be resent.
      this.setPending({
        name: user.displayName || email.split('@')[0],
        email,
        practice: '',
        demo: false,
        sentAt: 0,
      });
      throw new EmailNotVerifiedError('E-posta adresiniz henüz doğrulanmadı.');
    }
    this.persist({
      name: user.displayName || email.split('@')[0],
      email,
      demo: false,
      sample: false,
      role: 'dietitian',
    });
  }

  /**
   * Member (client) login. With Firebase the `clientId` comes from the token claims MainAPI
   * sets when the dietitian invites the client; in demo mode it is matched by e-mail.
   */
  async signInMember(email: string, password: string): Promise<void> {
    const { diet, portal, findLocalMember } = await this.stores();
    let clientId: string | undefined;
    let name = '';
    let demo = true;
    let workspace: string = SAMPLE_WORKSPACE;
    if (this.identity.configured) {
      const user = await this.identity.signIn(email, password);
      const claims = await this.identity.claims();
      if (claims.role !== 'member' || !claims.clientId) {
        await this.identity.logout();
        throw new PortalAccessError('Bu hesabın danışan portalı erişimi yok.');
      }
      clientId = claims.clientId;
      name = user.displayName ?? '';
      demo = false;
    } else {
      const found = findLocalMember(email);
      if (!found) {
        throw new PortalAccessError(
          'Bu e-posta için portal erişimi bulunamadı. Diyetisyeninizden davet isteyin.',
        );
      }
      ({ clientId, workspace } = found);
    }
    const sample = workspace === SAMPLE_WORKSPACE && demo;
    diet.useWorkspace(workspace);
    portal.useWorkspace(workspace);
    portal.markActivated(clientId);
    this.persist({
      name: name || diet.clientName(clientId),
      email,
      demo,
      sample,
      role: 'member',
      clientId,
      ...(sample || !demo ? {} : { workspace }),
    });
  }

  /**
   * Creates the account but does not sign it in: the e-mail address must be verified first.
   * With Firebase the verification link is sent by Firebase Auth; in demo mode there is no
   * mail server, so a 6-digit code is generated locally and shown on the verification screen.
   */
  async register(name: string, email: string, password: string, practice = ''): Promise<void> {
    if (!this.identity.configured) {
      this.setPending({
        name,
        email,
        practice,
        demo: true,
        code: newCode(),
        expiresAt: Date.now() + CODE_TTL_MS,
        sentAt: Date.now(),
      });
      return;
    }
    const user = await this.identity.register(name, email, password);
    this.setPending({
      name: user.displayName || name,
      email,
      practice,
      demo: false,
      sentAt: Date.now(),
    });
  }

  continueDemo(profile?: {
    name: string;
    email: string;
    practice: string;
    specialty?: string;
    licenseNo?: string;
    workspaceMode?: string;
  }): void {
    this.persist({
      name: profile?.name ?? 'Uzm. Dyt. Deniz Arslan',
      email: profile?.email ?? 'demo@odivon.com',
      demo: true,
      practice: profile?.practice ?? 'Odivon Klinik Beslenme Merkezi',
      specialty: profile?.specialty ?? 'Obezite & Metabolik Beslenme',
      licenseNo: profile?.licenseNo ?? 'TR-DYT-10482',
      workspaceMode: profile?.workspaceMode ?? 'Klinik + Online Hibrit',
      role: 'dietitian',
      sample: true,
    });
  }

  /** Demo member login as the selected client (defaults to the first client with portal access, Elif Kaya). */
  async continueMemberDemo(preferredClientId?: string): Promise<void> {
    const { diet, portal } = await this.stores();
    const clientId = preferredClientId ?? portal.demoMemberId();
    const client = diet.clients().find((c) => c.id === clientId);
    if (!client) return;
    portal.markActivated(clientId);
    this.persist({
      name: `${client.firstName} ${client.lastName}`,
      email: client.email,
      demo: true,
      sample: true,
      role: 'member',
      clientId,
    });
  }

  logout(): void {
    void this.identity.logout();
    localStorage.removeItem(this.storageKey);
    this.session.set(null);
  }

  /** Loaded on demand so the data stores and demo seed stay out of the login bundle. */
  private async stores() {
    const [{ DietStore }, { PortalStore }, { findLocalMember }] = await Promise.all([
      import('../data/diet-store'),
      import('../data/portal-store'),
      import('../data/local-member'),
    ]);
    return {
      diet: this.injector.get(DietStore),
      portal: this.injector.get(PortalStore),
      findLocalMember,
    };
  }

  private activate(pending: PendingVerification): void {
    this.setPending(null);
    this.persist({
      name: pending.name,
      email: pending.email,
      demo: pending.demo,
      practice: pending.practice,
      role: 'dietitian',
      sample: false,
    });
  }

  private setPending(pending: PendingVerification | null): void {
    if (pending) localStorage.setItem(this.pendingKey, JSON.stringify(pending));
    else localStorage.removeItem(this.pendingKey);
    this.pendingVerification.set(pending);
  }

  private restorePending(): PendingVerification | null {
    try {
      return JSON.parse(
        localStorage.getItem(this.pendingKey) ?? 'null',
      ) as PendingVerification | null;
    } catch {
      return null;
    }
  }

  private persist(session: AppSession): void {
    localStorage.setItem(this.storageKey, JSON.stringify(session));
    this.session.set(session);
  }

  private restore(): AppSession | null {
    try {
      const session = JSON.parse(
        localStorage.getItem(this.storageKey) ?? 'null',
      ) as AppSession | null;
      // A member session without a client cannot be scoped safely; drop it.
      if (session?.role === 'member' && !session.clientId) return null;
      return session;
    } catch {
      return null;
    }
  }
}
