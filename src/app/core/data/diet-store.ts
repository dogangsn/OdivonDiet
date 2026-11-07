import { Injectable, computed, signal } from '@angular/core';
import {
  ageFrom,
  bmi,
  bmiBand,
  bmr,
  BmiBand,
  daysBetween,
  goalProgress,
  isSameDay,
  round1,
  tdee,
} from '../../domain/diet-calc';
import {
  ActivityEntry,
  Client,
  ClientStatus,
  Consultation,
  MealPlan,
  Measurement,
  PlanStatus,
  Tone,
} from '../../domain/diet.models';
import { createSeed } from './diet-seed';

export interface ClientView {
  readonly client: Client;
  readonly fullName: string;
  readonly age: number;
  readonly currentWeightKg: number;
  readonly bmi: number;
  readonly bmiBand: BmiBand;
  readonly bmr: number;
  readonly tdee: number;
  readonly progress: number;
  readonly changeKg: number;
  readonly lastMeasurement: Measurement | null;
  readonly daysSinceMeasurement: number | null;
  readonly activePlan: MealPlan | null;
  readonly nextConsultation: Consultation | null;
  readonly avgAdherence: number | null;
}

export interface Attention {
  readonly clientId: string;
  readonly name: string;
  readonly reason: string;
  readonly icon: string;
  readonly tone: Tone;
}

/** Days without a measurement before a client is flagged for follow-up. */
export const MEASUREMENT_OVERDUE_DAYS = 14;

/**
 * Single source of truth for the dietitian workspace.
 *
 * Every page reads from these signals, so a record created on one page shows up
 * everywhere. Data is in memory for now; the mutation methods are the seam where
 * MainAPI (`/api/v1/diet`) calls will go.
 */
@Injectable({ providedIn: 'root' })
export class DietStore {
  private readonly seed = createSeed(new Date());
  readonly clients = signal<Client[]>(this.seed.clients);
  readonly measurements = signal<Measurement[]>(this.seed.measurements);
  readonly plans = signal<MealPlan[]>(this.seed.plans);
  readonly consultations = signal<Consultation[]>(this.seed.consultations);
  readonly activity = signal<ActivityEntry[]>(this.seed.activity);

  readonly clientViews = computed<ClientView[]>(() => {
    const now = new Date();
    const measurements = this.measurements();
    const plans = this.plans();
    const consultations = this.consultations();
    return this.clients().map((client) => {
      const own = measurements
        .filter((m) => m.clientId === client.id)
        .sort((a, b) => a.date.localeCompare(b.date));
      const last = own.at(-1) ?? null;
      const current = last?.weightKg ?? client.startWeightKg;
      const age = ageFrom(client.birthDate, now);
      const bmrValue = bmr(client.sex, current, client.heightCm, age);
      const bmiValue = bmi(current, client.heightCm);
      const ownConsultations = consultations.filter((c) => c.clientId === client.id);
      const rated = ownConsultations.filter((c) => c.adherence !== null);
      return {
        client,
        fullName: `${client.firstName} ${client.lastName}`,
        age,
        currentWeightKg: current,
        bmi: bmiValue,
        bmiBand: bmiBand(bmiValue),
        bmr: bmrValue,
        tdee: tdee(bmrValue, client.activity),
        progress: goalProgress(client.startWeightKg, current, client.targetWeightKg),
        changeKg: round1(current - client.startWeightKg),
        lastMeasurement: last,
        daysSinceMeasurement: last ? daysBetween(last.date, now) : null,
        activePlan: plans.find((p) => p.clientId === client.id && p.status === 'active') ?? null,
        nextConsultation:
          ownConsultations
            .filter((c) => c.status === 'scheduled' && new Date(c.at) >= startOfToday())
            .sort((a, b) => a.at.localeCompare(b.at))[0] ?? null,
        avgAdherence: rated.length
          ? round1(rated.reduce((sum, c) => sum + (c.adherence ?? 0), 0) / rated.length)
          : null,
      };
    });
  });

  readonly activeClients = computed(() =>
    this.clientViews().filter((v) => v.client.status === 'active'),
  );

  readonly todaysConsultations = computed(() =>
    this.consultations()
      .filter((c) => c.status !== 'cancelled' && isSameDay(c.at, new Date()))
      .sort((a, b) => a.at.localeCompare(b.at)),
  );

  readonly attention = computed<Attention[]>(() => {
    const items: Attention[] = [];
    for (const view of this.activeClients()) {
      const days = view.daysSinceMeasurement;
      if (days === null || days > MEASUREMENT_OVERDUE_DAYS) {
        items.push({
          clientId: view.client.id,
          name: view.fullName,
          reason: days === null ? 'Henüz ölçüm yok' : `${days} gündür ölçüm alınmadı`,
          icon: 'monitor_weight',
          tone: 'warning',
        });
      }
      if (!view.activePlan) {
        items.push({
          clientId: view.client.id,
          name: view.fullName,
          reason: 'Aktif beslenme planı yok',
          icon: 'restaurant_menu',
          tone: 'info',
        });
      }
      if (view.avgAdherence !== null && view.avgAdherence < 3) {
        items.push({
          clientId: view.client.id,
          name: view.fullName,
          reason: `Plan uyumu düşük (${view.avgAdherence}/5)`,
          icon: 'trending_down',
          tone: 'danger',
        });
      }
      if (!view.client.consentAt) {
        items.push({
          clientId: view.client.id,
          name: view.fullName,
          reason: 'KVKK açık rızası alınmadı',
          icon: 'policy',
          tone: 'danger',
        });
      }
    }
    return items;
  });

  view(clientId: string): ClientView | undefined {
    return this.clientViews().find((v) => v.client.id === clientId);
  }

  clientName(clientId: string): string {
    const client = this.clients().find((c) => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : 'Bilinmeyen danışan';
  }

  measurementsFor(clientId: string): Measurement[] {
    return this.measurements()
      .filter((m) => m.clientId === clientId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  saveClient(client: Omit<Client, 'id' | 'createdAt'> & { id?: string }): Client {
    const existing = client.id ? this.clients().find((c) => c.id === client.id) : undefined;
    if (existing) {
      const updated: Client = { ...existing, ...client, id: existing.id };
      this.clients.update((list) => list.map((c) => (c.id === existing.id ? updated : c)));
      this.log(
        'edit',
        'primary',
        'Danışan bilgileri güncellendi',
        `${updated.firstName} ${updated.lastName}`,
      );
      return updated;
    }
    const created: Client = { ...client, id: newId('c'), createdAt: new Date().toISOString() };
    this.clients.update((list) => [created, ...list]);
    this.log(
      'person_add',
      'positive',
      'Yeni danışan eklendi',
      `${created.firstName} ${created.lastName}`,
    );
    return created;
  }

  setClientStatus(clientId: string, status: ClientStatus): void {
    this.clients.update((list) => list.map((c) => (c.id === clientId ? { ...c, status } : c)));
    const label = {
      active: 'yeniden aktifleştirildi',
      paused: 'duraklatıldı',
      archived: 'arşivlendi',
    };
    this.log('person', 'neutral', `Danışan ${label[status]}`, this.clientName(clientId));
  }

  addMeasurement(measurement: Omit<Measurement, 'id'>): void {
    this.measurements.update((list) => [...list, { ...measurement, id: newId('m') }]);
    this.log(
      'monitor_weight',
      'info',
      'Yeni ölçüm kaydedildi',
      `${this.clientName(measurement.clientId)} · ${measurement.weightKg} kg`,
    );
  }

  savePlan(plan: Omit<MealPlan, 'id'>): void {
    if (plan.status === 'active') {
      // A client follows one plan at a time; activating a new one completes the old one.
      this.plans.update((list) =>
        list.map((p) =>
          p.clientId === plan.clientId && p.status === 'active' ? { ...p, status: 'completed' } : p,
        ),
      );
    }
    this.plans.update((list) => [{ ...plan, id: newId('p') }, ...list]);
    this.log(
      'restaurant_menu',
      'primary',
      'Beslenme planı oluşturuldu',
      `${this.clientName(plan.clientId)} · ${plan.kcal} kcal`,
    );
  }

  setPlanStatus(planId: string, status: PlanStatus): void {
    const plan = this.plans().find((p) => p.id === planId);
    if (!plan) return;
    this.plans.update((list) =>
      list.map((p) => {
        if (p.id === planId) return { ...p, status };
        if (status === 'active' && p.clientId === plan.clientId && p.status === 'active') {
          return { ...p, status: 'completed' as const };
        }
        return p;
      }),
    );
    this.log('restaurant_menu', 'neutral', 'Plan durumu değişti', `${plan.title} · ${status}`);
  }

  addConsultation(consultation: Omit<Consultation, 'id'>): void {
    this.consultations.update((list) => [...list, { ...consultation, id: newId('v') }]);
    this.log('event', 'info', 'Görüşme planlandı', this.clientName(consultation.clientId));
  }

  completeConsultation(id: string, adherence: number, notes: string, nextAction: string): void {
    const item = this.consultations().find((c) => c.id === id);
    if (!item) return;
    this.consultations.update((list) =>
      list.map((c) => (c.id === id ? { ...c, status: 'done', adherence, notes, nextAction } : c)),
    );
    this.log(
      'task_alt',
      'positive',
      'Görüşme tamamlandı',
      `${this.clientName(item.clientId)} · uyum ${adherence}/5`,
    );
  }

  cancelConsultation(id: string): void {
    const item = this.consultations().find((c) => c.id === id);
    if (!item) return;
    this.consultations.update((list) =>
      list.map((c) => (c.id === id ? { ...c, status: 'cancelled' } : c)),
    );
    this.log('event_busy', 'warning', 'Görüşme iptal edildi', this.clientName(item.clientId));
  }

  private log(icon: string, tone: Tone, title: string, detail: string): void {
    this.activity.update((list) => [
      { id: newId('a'), at: new Date().toISOString(), icon, tone, title, detail },
      ...list,
    ]);
  }
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

let counter = 0;
function newId(prefix: string): string {
  counter++;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
