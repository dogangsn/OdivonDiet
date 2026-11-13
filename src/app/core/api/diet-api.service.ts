import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Subscription } from '../../domain/billing';
import type { DietData } from '../data/diet-store';
import type { PortalData } from '../data/portal-store';
import { PORTAL_API } from './portal-contract';

export interface DietClient {
  id: string | number;
  fullName: string;
  phone?: string;
  email?: string;
  age: number;
  gender: 'female' | 'male';
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  clinicBranch: string;
  programType: string;
  status: 'active' | 'pending' | 'completed';
  allergies: string[];
  clinicalDiagnoses: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NutritionPlan {
  id: string | number;
  clientId: string | number;
  clientName?: string;
  title: string;
  targetCalories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  dietType: string;
  status: 'draft' | 'active' | 'revision';
  startDate: string;
  endDate: string;
  mealsSummary?: string;
}

export interface BodyMeasurement {
  id: string | number;
  clientId: string | number;
  date: string;
  weightKg: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
  visceralFat?: number;
  waistCm?: number;
  hipCm?: number;
}

export interface PracticeSettings {
  readonly dietitianName: string;
  readonly practiceName: string;
  readonly specialty: string;
  readonly licenseNo: string;
  readonly sessionDurationMin: 30 | 45 | 60;
  readonly unitSystem: 'metric';
  readonly notifications: {
    readonly reminder: boolean;
    readonly overdue: boolean;
    readonly weekly: boolean;
    readonly portalMessage: boolean;
  };
}

export interface AttachmentUploadTicket {
  readonly attachmentId: string;
  readonly uploadUrl: string;
  readonly downloadUrl: string;
}

@Injectable({ providedIn: 'root' })
export class DietApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/diet`;

  getClients(): Observable<DietClient[]> {
    return this.http.get<DietClient[]>(`${this.baseUrl}/clients`).pipe(
      catchError(() => of(this.fallbackClients())),
    );
  }

  getPlans(clientId?: string | number): Observable<NutritionPlan[]> {
    const url = clientId ? `${this.baseUrl}/plans?clientId=${clientId}` : `${this.baseUrl}/plans`;
    return this.http.get<NutritionPlan[]>(url).pipe(
      catchError(() => of(this.fallbackPlans())),
    );
  }

  saveClient(client: Partial<DietClient>): Observable<DietClient> {
    return this.http.post<DietClient>(`${this.baseUrl}/clients`, client).pipe(
      catchError(() => of({ ...client, id: Date.now() } as DietClient)),
    );
  }

  saveNutritionPlan(plan: Partial<NutritionPlan>): Observable<NutritionPlan> {
    return this.http.post<NutritionPlan>(`${this.baseUrl}/plans`, plan).pipe(
      catchError(() => of({ ...plan, id: `plan-${Date.now()}` } as NutritionPlan)),
    );
  }

  /** Fetches the authenticated clinic's full workspace state from MainAPI. */
  fetchWorkspace(): Observable<DietData | null> {
    return this.http
      .get<DietData>(`${this.baseUrl}/workspace`)
      .pipe(catchError(() => of(null)));
  }

  /** Pushes workspace state changes to MainAPI (`/api/v1/diet/workspace`). */
  syncWorkspace(data: DietData): Observable<boolean> {
    return this.http.put(`${this.baseUrl}/workspace`, data).pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  /** Fetches the clinic's portal conversations, tasks, and member requests from MainAPI. */
  fetchPortalWorkspace(): Observable<PortalData | null> {
    return this.http
      .get<PortalData>(`${this.baseUrl}/portal/workspace`)
      .pipe(catchError(() => of(null)));
  }

  /** Pushes portal state to MainAPI (`/api/v1/diet/portal/workspace`). */
  syncPortalWorkspace(data: PortalData): Observable<boolean> {
    return this.http.put(`${this.baseUrl}/portal/workspace`, data).pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  /** Sends a portal invitation via MainAPI so Firebase sets custom claims (`role: 'member'`, `clientId`). */
  invitePortalMember(clientId: string, email: string): Observable<boolean> {
    return this.http
      .post(`${environment.apiBaseUrl}${PORTAL_API.invite(clientId).replace('/api/v1', '')}`, {
        email,
      })
      .pipe(
        map(() => true),
        catchError(() => of(false)),
      );
  }

  /** Revokes a client's member portal login on MainAPI. */
  disablePortalMember(clientId: string): Observable<boolean> {
    return this.http
      .post(`${environment.apiBaseUrl}${PORTAL_API.disable(clientId).replace('/api/v1', '')}`, {})
      .pipe(
        map(() => true),
        catchError(() => of(false)),
      );
  }

  /** Requests a short-lived signed upload URL for a clinical attachment (PDF lab report or meal photo). */
  createAttachmentUpload(input: {
    name: string;
    mimeType: string;
    sizeBytes: number;
  }): Observable<AttachmentUploadTicket | null> {
    return this.http
      .post<AttachmentUploadTicket>(`${this.baseUrl}/attachments`, input)
      .pipe(catchError(() => of(null)));
  }

  /** Fetches the clinic's SaaS subscription state from MainAPI. */
  fetchSubscription(): Observable<Subscription | null> {
    return this.http
      .get<Subscription>(`${this.baseUrl}/subscription`)
      .pipe(catchError(() => of(null)));
  }

  /** Persists subscription changes (trial, plan request, or confirmed PayTR payment) to MainAPI. */
  syncSubscription(subscription: Subscription): Observable<boolean> {
    return this.http.put(`${this.baseUrl}/subscription`, subscription).pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  /** Saves clinic profile & notification preferences to MainAPI. */
  savePracticeSettings(settings: PracticeSettings): Observable<boolean> {
    return this.http.put(`${this.baseUrl}/settings`, settings).pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  private fallbackClients(): DietClient[] {
    return [
      {
        id: 1,
        fullName: 'Elif Kaya',
        phone: '+905321002030',
        email: 'elif.kaya@example.com',
        age: 32,
        gender: 'female',
        heightCm: 165,
        currentWeightKg: 68,
        targetWeightKg: 58,
        clinicBranch: 'Levent Klinik',
        programType: 'Ketojenik & PCOS',
        status: 'active',
        allergies: ['Gluten', 'Laktos'],
        clinicalDiagnoses: ['PCOS', 'İnsülin Direnci'],
        createdAt: '2026-10-15',
        updatedAt: '2026-11-08',
      },
      {
        id: 2,
        fullName: 'Mert Yıldız',
        phone: '+905332003040',
        email: 'mert.yildiz@example.com',
        age: 28,
        gender: 'male',
        heightCm: 182,
        currentWeightKg: 84,
        targetWeightKg: 80,
        clinicBranch: 'Bağdat Caddesi Şube',
        programType: 'Sporcu Beslenmesi',
        status: 'pending',
        allergies: [],
        clinicalDiagnoses: ['Demir Eksikliği'],
        createdAt: '2026-10-20',
        updatedAt: '2026-11-06',
      },
      {
        id: 3,
        fullName: 'Selin Aras',
        phone: '+905353004050',
        email: 'selin.aras@example.com',
        age: 41,
        gender: 'female',
        heightCm: 162,
        currentWeightKg: 76,
        targetWeightKg: 62,
        clinicBranch: 'Online Seans / Zoom',
        programType: 'İnsülin Direnci & Kilo Yönetimi',
        status: 'active',
        allergies: [],
        clinicalDiagnoses: ['Haşimato'],
        createdAt: '2026-10-24',
        updatedAt: '2026-11-04',
      },
    ];
  }

  private fallbackPlans(): NutritionPlan[] {
    return [
      {
        id: 'plan-101',
        clientId: 1,
        clientName: 'Elif Kaya',
        title: 'PCOS & Düşük Glisemik İndeks Planı',
        targetCalories: 1750,
        proteinGrams: 90,
        carbGrams: 160,
        fatGrams: 65,
        dietType: 'insulin_resistance',
        status: 'active',
        startDate: '2026-11-01',
        endDate: '2026-11-28',
      },
    ];
  }
}
