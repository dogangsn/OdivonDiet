import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/auth/auth-store';
import { SubscriptionStore } from '../../core/billing/subscription-store';
import { Notify } from '../../core/notify/notify';
import { isQuickActionAllowedForStaffRole, staffRoleById } from '../../domain/staff-rbac';

export type QuickActionKind =
  | 'client-new'
  | 'client-edit'
  | 'client-detail'
  | 'measurement'
  | 'plan'
  | 'consultation'
  | 'consultation-complete'
  | 'task';

export interface QuickAction {
  readonly kind: QuickActionKind;
  /** Client the action is about, when known. */
  readonly clientId?: string;
  /** Consultation to complete, for `consultation-complete`. */
  readonly consultationId?: string;
  /** Pre-selected ISO date (`YYYY-MM-DD`) when opening from a calendar day/slot. */
  readonly date?: string;
  /** Pre-selected time (`HH:mm`) when opening from a calendar time slot. */
  readonly time?: string;
}

/**
 * Opens the shared create/edit drawers from anywhere (top bar, dashboard, client detail, calendar).
 * Only one drawer is open at a time; the host component lives in the app shell.
 */
@Injectable({ providedIn: 'root' })
export class QuickActions {
  private readonly subs = inject(SubscriptionStore);
  private readonly auth = inject(AuthStore);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router, { optional: true });
  readonly state = signal<QuickAction | null>(null);

  open(
    kind: QuickActionKind,
    clientId?: string,
    consultationId?: string,
    date?: string,
    time?: string,
  ): void {
    if (this.subs.expired()) {
      this.notify.warning(
        'Abonelik veya deneme süreniz doldu',
        'Yeni işlem yapmak için abonelik sayfasından bir paket seçin.',
      );
      void this.router?.navigateByUrl('/billing');
      return;
    }

    if (kind === 'task' && !this.subs.canUsePortal()) {
      this.notify.warning(
        'Danışan Portalı Profesyonel ve Klinik pakette aktiftir',
        'Görev atamak için paketinizi yükseltin.',
      );
      void this.router?.navigateByUrl('/billing');
      return;
    }

    if (
      kind !== 'consultation-complete' &&
      !isQuickActionAllowedForStaffRole(this.auth.staffRole(), kind)
    ) {
      const roleDef = staffRoleById(this.auth.staffRole());
      this.notify.warning(
        'Rol yetkisi kısıtlı',
        `"${roleDef.label}" rolü bu işlemi gerçekleştiremez.`,
      );
      return;
    }

    this.state.set({ kind, clientId, consultationId, date, time });
  }

  close(): void {
    this.state.set(null);
  }
}
