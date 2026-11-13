import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DietApiService } from './diet-api.service';

describe('DietApiService', () => {
  let service: DietApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DietApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DietApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('returns fallback clinical clients if backend is unreachable', async () => {
    const clientsPromise = firstValueFrom(service.getClients());
    const req = httpTesting.expectOne('https://mainapi.odivon.com/api/v1/diet/clients');
    req.error(new ProgressEvent('Network error'));
    const clients = await clientsPromise;
    expect(clients.length).toBeGreaterThan(0);
    expect(clients[0].fullName).toBe('Elif Kaya');
    expect(clients[0].programType).toContain('PCOS');
  });

  it('saves client and handles response', async () => {
    const savePromise = firstValueFrom(
      service.saveClient({
        fullName: 'Yeni Danışan',
        currentWeightKg: 70,
        targetWeightKg: 65,
      }),
    );
    const req = httpTesting.expectOne('https://mainapi.odivon.com/api/v1/diet/clients');
    req.flush({
      id: 'cl-123',
      fullName: 'Yeni Danışan',
      currentWeightKg: 70,
      targetWeightKg: 65,
    });
    const result = await savePromise;
    expect(result.fullName).toBe('Yeni Danışan');
    expect(result.id).toBe('cl-123');
  });

  it('saves nutrition plan and handles response', async () => {
    const planPromise = firstValueFrom(
      service.saveNutritionPlan({
        clientName: 'Elif Kaya',
        title: 'Akdeniz Beslenme Planı',
        targetCalories: 1800,
      }),
    );
    const req = httpTesting.expectOne('https://mainapi.odivon.com/api/v1/diet/plans');
    req.flush({
      id: 'plan-999',
      clientName: 'Elif Kaya',
      title: 'Akdeniz Beslenme Planı',
      targetCalories: 1800,
    });
    const result = await planPromise;
    expect(result.title).toBe('Akdeniz Beslenme Planı');
    expect(result.id).toBe('plan-999');
  });

  it('synchronizes clinic workspace, settings, and attachment upload tickets with MainAPI', async () => {
    const ticketPromise = firstValueFrom(
      service.createAttachmentUpload({
        name: 'tahlil.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 124_000,
      }),
    );
    const reqTicket = httpTesting.expectOne('https://mainapi.odivon.com/api/v1/diet/attachments');
    reqTicket.flush({
      attachmentId: 'att-1',
      uploadUrl: 'https://storage.odivon.com/upload/att-1',
      downloadUrl: 'https://storage.odivon.com/dl/att-1',
    });
    const ticket = await ticketPromise;
    expect(ticket?.attachmentId).toBe('att-1');

    const settingsPromise = firstValueFrom(
      service.savePracticeSettings({
        dietitianName: 'Dyt. Deniz',
        practiceName: 'Levent Klinik',
        specialty: 'Metabolik Beslenme',
        licenseNo: 'TR-100',
        sessionDurationMin: 45,
        unitSystem: 'metric',
        notifications: { reminder: true, overdue: true, weekly: false, portalMessage: true },
      }),
    );
    const reqSettings = httpTesting.expectOne('https://mainapi.odivon.com/api/v1/diet/settings');
    reqSettings.flush({ ok: true });
    expect(await settingsPromise).toBe(true);
  });
});
