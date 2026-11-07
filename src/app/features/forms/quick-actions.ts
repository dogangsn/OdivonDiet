import { Injectable, signal } from '@angular/core';

export type QuickActionKind =
  | 'client-new'
  | 'client-edit'
  | 'client-detail'
  | 'measurement'
  | 'plan'
  | 'consultation'
  | 'consultation-complete';

export interface QuickAction {
  readonly kind: QuickActionKind;
  /** Client the action is about, when known. */
  readonly clientId?: string;
  /** Consultation to complete, for `consultation-complete`. */
  readonly consultationId?: string;
}

/**
 * Opens the shared create/edit drawers from anywhere (top bar, dashboard, client detail).
 * Only one drawer is open at a time; the host component lives in the app shell.
 */
@Injectable({ providedIn: 'root' })
export class QuickActions {
  readonly state = signal<QuickAction | null>(null);

  open(kind: QuickActionKind, clientId?: string, consultationId?: string): void {
    this.state.set({ kind, clientId, consultationId });
  }

  close(): void {
    this.state.set(null);
  }
}
