import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import type { UserRole } from '../../domain/portal.models';
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
}

/** Thrown when a login exists but is not allowed into the chosen area. */
export class PortalAccessError extends Error {}

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
  readonly session = signal<AppSession | null>(this.restore());
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly role = computed<UserRole | null>(() => {
    const session = this.session();
    return session ? (session.role ?? 'dietitian') : null;
  });
  readonly homePath = computed(() => HOME_BY_ROLE[this.role() ?? 'dietitian']);

  async signIn(email: string, password: string): Promise<void> {
    if (!this.identity.configured) {
      this.persist({
        name: email.split('@')[0] || 'Odivon Kullanıcısı',
        email,
        demo: true,
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
    this.persist({
      name: user.displayName || email.split('@')[0],
      email,
      demo: false,
      role: 'dietitian',
    });
  }

  /**
   * Member (client) login. With Firebase the `clientId` comes from the token claims MainAPI
   * sets when the dietitian invites the client; in demo mode it is matched by e-mail.
   */
  async signInMember(email: string, password: string): Promise<void> {
    const { diet, portal } = await this.stores();
    let clientId: string | undefined;
    let name = '';
    let demo = true;
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
      clientId = portal.clientIdForLogin(email, diet.clients());
      if (!clientId) {
        throw new PortalAccessError(
          'Bu e-posta için portal erişimi bulunamadı. Diyetisyeninizden davet isteyin.',
        );
      }
    }
    portal.markActivated(clientId);
    this.persist({
      name: name || diet.clientName(clientId),
      email,
      demo,
      role: 'member',
      clientId,
    });
  }

  async register(name: string, email: string, password: string, practice = ''): Promise<void> {
    if (!this.identity.configured) {
      this.persist({ name, email, demo: true, practice, role: 'dietitian' });
      return;
    }
    const user = await this.identity.register(name, email, password);
    this.persist({
      name: user.displayName || name,
      email,
      demo: false,
      practice,
      role: 'dietitian',
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
    const [{ DietStore }, { PortalStore }] = await Promise.all([
      import('../data/diet-store'),
      import('../data/portal-store'),
    ]);
    return { diet: this.injector.get(DietStore), portal: this.injector.get(PortalStore) };
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
