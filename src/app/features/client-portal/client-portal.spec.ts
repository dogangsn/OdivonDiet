import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientPortalComponent } from './client-portal';

describe('ClientPortalComponent', () => {
  let component: ClientPortalComponent;
  let fixture: ComponentFixture<ClientPortalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientPortalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientPortalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the client portal component with initial defaults', () => {
    expect(component).toBeTruthy();
    expect(component.currentClient().fullName).toBe('Elif Kaya');
    expect(component.waterConsumedMl()).toBe(1750);
    expect(component.waterProgressPct()).toBe(70);
  });

  it('should update meal status and calculate reactive compliance score', () => {
    // Initial 3 consumed out of 5
    expect(component.consumedMealsCount()).toBe(3);
    const initialScore = component.complianceScore();
    expect(initialScore).toBeGreaterThan(0);

    // Consume 4th meal
    component.setMealStatus('m4', 'consumed');
    expect(component.consumedMealsCount()).toBe(4);
    expect(component.complianceScore()).toBeGreaterThan(initialScore);

    // Skip 5th meal
    component.setMealStatus('m5', 'skipped');
    expect(component.meals().find((m) => m.id === 'm5')?.status).toBe('skipped');
  });

  it('should accurately track water consumption and glasses', () => {
    component.addWater(250);
    expect(component.waterConsumedMl()).toBe(2000);
    expect(component.waterProgressPct()).toBe(80);

    component.setWaterByGlasses(10);
    expect(component.waterConsumedMl()).toBe(2500);
    expect(component.waterProgressPct()).toBe(100);

    component.resetWater();
    expect(component.waterConsumedMl()).toBe(0);
    expect(component.waterProgressPct()).toBe(0);
  });

  it('should generate an AI recovery plan when reporting a cheat meal', () => {
    component.cheatFoodType.set('tatli');
    component.cheatCalories.set(650);
    component.calculateCheatRecovery();

    const plan = component.cheatPlan();
    expect(plan).toBeTruthy();
    expect(plan?.activityPrescription).toContain('yürüyüş');
    expect(plan?.hydrationPlan).toContain('su');
    expect(plan?.mindsetNote).toContain('Kaçamak');
  });

  it('should allow switching between clients', () => {
    component.onClientChange('2');
    expect(component.selectedClientId()).toBe(2);
    expect(component.currentClient().fullName).toBe('Mert Yıldız');
    expect(component.weighInWeight()).toBe(84.1);
  });

  it('should open WhatsApp with pre-filled meal summary', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    component.sendWhatsAppMealSummary();
    expect(openSpy).toHaveBeenCalled();
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain('api.whatsapp.com');
    expect(url).toContain('Elif%20Kaya');
    openSpy.mockRestore();
  });
});
