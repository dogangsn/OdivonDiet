import { registerLocaleData } from '@angular/common';
import localeTr from '@angular/common/locales/tr';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { provideOdivonApi } from './core/api/api';

registerLocaleData(localeTr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideOdivonApi(),
    { provide: LOCALE_ID, useValue: 'tr' },
  ],
};
