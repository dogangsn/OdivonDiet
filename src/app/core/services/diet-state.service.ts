import { Injectable, signal } from '@angular/core';
import { DietClient } from '../api/diet-api.service';

@Injectable({ providedIn: 'root' })
export class DietStateService {
  readonly activeClient = signal<DietClient | null>(null);

  selectClientForAi(client: DietClient): void {
    this.activeClient.set(client);
  }

  clearActiveClient(): void {
    this.activeClient.set(null);
  }
}

