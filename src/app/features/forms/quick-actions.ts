import { Injectable, signal } from '@angular/core';

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
  readonly state = signal<QuickAction | null>(null);

  open(
    kind: QuickActionKind,
    clientId?: string,
    consultationId?: string,
    date?: string,
    time?: string,
  ): void {
    this.state.set({ kind, clientId, consultationId, date, time });
  }

  close(): void {
    this.state.set(null);
  }
}
