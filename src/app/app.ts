import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VersionStore } from './core/version/version-store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    @if (version.justUpdated(); as updatedTo) {
      <div
        class="fixed bottom-4 start-1/2 z-[80] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-3 rounded-2xl bg-slate-900 p-4 text-sm text-white shadow-xl rtl:translate-x-1/2"
        role="status"
      >
        <span class="material-symbols-rounded text-emerald-400">verified</span>
        <p class="flex-1">
          Uygulama <strong>v{{ updatedTo }}</strong> sürümüne güncellendi. Güvenliğiniz için oturum
          ve çerezler temizlendi, lütfen tekrar giriş yapın.
        </p>
        <button
          type="button"
          class="text-slate-400 hover:text-white"
          aria-label="Bildirimi kapat"
          (click)="version.dismissUpdatedNotice()"
        >
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
    }
    @if (version.updateRequired()) {
      <div
        class="fixed inset-0 z-[90] grid place-items-center bg-slate-950/70 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-title"
      >
        <section class="odv-card max-w-md p-7 text-center">
          <span class="material-symbols-rounded mb-3 text-5xl text-violet-600">system_update</span>
          <h2 id="update-title" class="text-xl font-black">Uygulama güncellemesi hazır</h2>
          <p class="text-sm text-slate-500">Güvenli biçimde en güncel sürüme geçin.</p>
          <p class="mt-2 text-xs text-slate-400">
            Güncellemede oturumunuz kapatılır ve giriş sayfasına yönlendirilirsiniz.
          </p>
          <button
            type="button"
            class="odv-btn-primary mt-3 w-full"
            [disabled]="version.updating()"
            (click)="version.applyUpdate()"
          >
            Şimdi güncelle
          </button>
          <p class="mt-3 font-mono text-[11px] text-slate-400">
            {{ version.label }} → v{{ version.remote()?.version }} · {{ version.remote()?.commit }}
          </p>
        </section>
      </div>
    }
  `,
})
export class App {
  readonly version = inject(VersionStore);
  constructor() {
    this.version.start();
  }
}
