import { HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders, Injectable, inject, makeEnvironmentProviders } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FirebaseIdentity } from '../auth/firebase-identity';
import { BUILD_INFO } from '../version/build-info';
import { VersionStore } from '../version/version-store';
import { BUILD_ID_HEADER, CLIENT_VERSION_HEADER } from './client-contract';
export const clientVersionInterceptor: HttpInterceptorFn = (req, next) => {
  const versions = inject(VersionStore);
  const identity = inject(FirebaseIdentity);
  return from(identity.requestHeaders()).pipe(
    switchMap(identityHeaders => next(req.clone({ setHeaders: {
      ...identityHeaders,
      [CLIENT_VERSION_HEADER]: BUILD_INFO.version,
      [BUILD_ID_HEADER]: BUILD_INFO.buildId,
    }}))),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 426) versions.requireUpdate();
      return throwError(() => error);
    }),
  );
};
export function provideOdivonApi():EnvironmentProviders{return makeEnvironmentProviders([provideHttpClient(withInterceptors([clientVersionInterceptor]))]);}
@Injectable({providedIn:'root'}) export class ApiConfig { readonly baseUrl=environment.mainApiUrl; }
