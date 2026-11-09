import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSonnerToaster, toast } from 'ngx-sonner';
import { ThemeStore } from './core/theme/theme-store';
import { VersionStore } from './core/version/version-store';
import { ConfirmHost } from './shared/ui/confirm-host';
import { UpdatePrompt } from './shared/ui/update-prompt';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgxSonnerToaster, ConfirmHost, UpdatePrompt],
  template: `
    <router-outlet />
    <ngx-sonner-toaster
      position="top-right"
      richColors
      closeButton
      [theme]="theme.dark() ? 'dark' : 'light'"
      offset="76px"
      [duration]="4500"
      [toastOptions]="{ class: 'odv-toast' }"
    />
    <odv-confirm-host />
    <odv-update-prompt />
  `,
})
export class App {
  readonly version = inject(VersionStore);
  // Applies the saved or system theme before any page renders, including the login screen.
  readonly theme = inject(ThemeStore);

  constructor() {
    this.version.start();
    const updatedTo = this.version.justUpdated();
    if (updatedTo) {
      // Toaster ekrana yerleştikten sonra gösterilsin.
      setTimeout(() =>
        toast.success(`v${updatedTo} sürümüne güncellendi`, {
          description: 'Güvenliğiniz için oturum ve çerezler temizlendi, lütfen tekrar giriş yapın.',
          duration: 9000,
          onDismiss: () => this.version.dismissUpdatedNotice(),
          onAutoClose: () => this.version.dismissUpdatedNotice(),
        }),
      );
    }
  }
}
