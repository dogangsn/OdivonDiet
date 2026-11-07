import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { resetClientIfNewBuild } from './app/core/version/client-reset';

// Yeni sürüm yayınlandıysa çerez/önbellek temizlenir ve login'e yönlendirilir.
if (!resetClientIfNewBuild()) {
  bootstrapApplication(App, appConfig).catch((err) => console.error(err));
}
