import { TestBed } from '@angular/core/testing';
import { DietClient } from '../api/diet-api.service';
import { DietStateService } from './diet-state.service';

describe('DietStateService', () => {
  let service: DietStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DietStateService);
  });

  it('selects active client and clears properly', () => {
    expect(service.activeClient()).toBeNull();

    const client: DietClient = {
      id: 10,
      fullName: 'Ayşe Demir',
      age: 29,
      gender: 'female',
      heightCm: 168,
      currentWeightKg: 64,
      targetWeightKg: 58,
      clinicBranch: 'Nişantaşı Şube',
      programType: 'Kilo Verme',
      status: 'active',
      allergies: ['Gluten'],
      clinicalDiagnoses: [],
      createdAt: '2026-11-01',
      updatedAt: '2026-11-09',
    };

    service.selectClientForAi(client);
    expect(service.activeClient()?.fullName).toBe('Ayşe Demir');
    expect(service.activeClient()?.clinicBranch).toBe('Nişantaşı Şube');

    service.clearActiveClient();
    expect(service.activeClient()).toBeNull();
  });
});

