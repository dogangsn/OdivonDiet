import { TestBed } from '@angular/core/testing';
import { isoDate } from '../../domain/diet-calc';
import { ConsultationForm } from '../forms/consultation-form';
import { QuickActions } from '../forms/quick-actions';
import { ConsultationsPage } from './consultations-page';

describe('ConsultationsPage visual calendar & ConsultationForm', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultationsPage, ConsultationForm],
    }).compileComponents();
  });

  it('builds a 42-day monthly calendar grid, switches views, and opens a pre-filled slot in ConsultationForm', async () => {
    const pageFixture = TestBed.createComponent(ConsultationsPage);
    const formFixture = TestBed.createComponent(ConsultationForm);
    await pageFixture.whenStable();

    const page = pageFixture.componentInstance;
    expect(page.viewMode()).toBe('month');
    expect(page.calendarCells().length).toBe(42);
    expect(page.weekDays().length).toBe(7);

    const targetDate = isoDate(new Date());
    page.openScheduleAt(targetDate, '14:30');
    await formFixture.whenStable();

    const form = formFixture.componentInstance;
    expect(form.scheduleOpen()).toBe(true);
    expect(form.schedule().date).toBe(targetDate);
    expect(form.schedule().time).toBe('14:30');
    expect(form.daySlots().length).toBeGreaterThan(10);
  });
});

