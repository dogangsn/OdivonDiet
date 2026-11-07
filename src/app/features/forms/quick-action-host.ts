import { Component } from '@angular/core';
import { ClientDetail } from './client-detail';
import { ClientForm } from './client-form';
import { ConsultationForm } from './consultation-form';
import { MeasurementForm } from './measurement-form';
import { PlanForm } from './plan-form';

/** Renders every shared drawer once; which one is open is driven by `QuickActions`. */
@Component({
  selector: 'app-quick-action-host',
  imports: [ClientDetail, ClientForm, MeasurementForm, PlanForm, ConsultationForm],
  template: `
    <app-client-detail />
    <app-client-form />
    <app-measurement-form />
    <app-plan-form />
    <app-consultation-form />
  `,
})
export class QuickActionHost {}
