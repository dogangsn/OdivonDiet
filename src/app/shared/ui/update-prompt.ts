import { Component, inject } from '@angular/core';
import { VersionStore } from '../../core/version/version-store';

/**
 * Yeni sürüm bildirimi. Normalde sayfayı kilitlemeyen bir kart olarak köşede çıkar;
 * API eski sürümü reddettiyse (426) ertelenemeyen bir pencereye dönüşür.
 */
@Component({
  selector: 'odv-update-prompt',
  template: `
    @if (version.showPrompt()) {
      @if (version.forced()) {
        <div
          class="odv-fade-in fixed inset-0 z-[90] bg-slate-950/50 backdrop-blur-sm"
          aria-hidden="true"
        ></div>
      }
      <section
        class="odv-slide-up fixed z-[91] w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-2xl shadow-indigo-900/15 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/95"
        [class]="
          version.forced()
            ? 'start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2'
            : 'bottom-4 start-4 sm:start-auto sm:end-6 sm:bottom-6'
        "
        [attr.role]="version.forced() ? 'alertdialog' : 'dialog'"
        [attr.aria-modal]="version.forced() ? 'true' : null"
        aria-labelledby="odv-update-title"
        aria-describedby="odv-update-text"
      >
        <div
          class="relative bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 px-5 pt-5 pb-4 text-white"
        >
          <div
            class="pointer-events-none absolute -end-6 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl"
            aria-hidden="true"
          ></div>
          <div class="flex items-start gap-3">
            <div
              class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30"
            >
              <span class="material-symbols-rounded icon-fill !text-[22px]" aria-hidden="true"
                >rocket_launch</span
              >
            </div>
            <div class="min-w-0 flex-1">
              <p
                class="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-white/80 uppercase"
              >
                <span class="relative flex h-2 w-2">
                  <span
                    class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75"
                  ></span>
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-300"></span>
                </span>
                Yeni sürüm
              </p>
              <h2
                id="odv-update-title"
                class="mt-0.5 text-lg leading-tight font-black tracking-tight"
              >
                Güncelleme hazır
              </h2>
            </div>
            @if (!version.forced()) {
              <button
                type="button"
                class="-me-1 -mt-1 grid h-8 w-8 place-items-center rounded-xl text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
                aria-label="Daha sonra hatırlat"
                (click)="version.snooze()"
              >
                <span class="material-symbols-rounded" aria-hidden="true">close</span>
              </button>
            }
          </div>
          <div class="mt-3 flex items-center gap-2 font-mono text-[11px]">
            <span class="rounded-full bg-white/15 px-2 py-0.5">v{{ version.current.version }}</span>
            <span
              class="material-symbols-rounded directional-icon !text-sm text-white/70"
              aria-hidden="true"
              >arrow_forward</span
            >
            <span class="rounded-full bg-white px-2 py-0.5 font-bold text-violet-700">
              v{{ version.remote()?.version ?? '…' }}
            </span>
            @if (version.remote()?.commit; as commit) {
              <span class="text-white/60">· {{ commit }}</span>
            }
          </div>
        </div>

        <div class="p-5">
          <p
            id="odv-update-text"
            class="text-sm leading-relaxed text-slate-600 dark:text-slate-300"
          >
            @if (version.forced()) {
              Bu sürüm artık desteklenmiyor. Devam etmek için uygulamayı güncelleyin.
            } @else {
              Yeni özellikler ve iyileştirmeler yayında. Güncellemek yalnızca birkaç saniye sürer.
            }
          </p>
          @if (version.remote()?.releaseNotes?.length) {
            <ul class="mt-3 space-y-1.5">
              @for (note of version.remote()!.releaseNotes!.slice(0, 4); track $index) {
                <li
                  class="flex items-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  <span
                    class="material-symbols-rounded !text-base text-emerald-500"
                    aria-hidden="true"
                    >check_circle</span
                  >
                  <span>{{ note }}</span>
                </li>
              }
            </ul>
          }
          <p
            class="mt-3 flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
          >
            <span class="material-symbols-rounded !text-base" aria-hidden="true">info</span>
            Güvenliğiniz için oturum kapatılır; tekrar giriş yapmanız gerekir.
          </p>
          <div class="mt-4 flex gap-2">
            @if (!version.forced()) {
              <button
                type="button"
                class="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:outline-none dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                (click)="version.snooze()"
              >
                Daha sonra
              </button>
            }
            <button
              type="button"
              class="inline-flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] disabled:opacity-60 dark:focus-visible:ring-offset-slate-900"
              [disabled]="version.updating()"
              (click)="version.applyUpdate()"
            >
              <span
                class="material-symbols-rounded !text-lg"
                [class.animate-spin]="version.updating()"
                aria-hidden="true"
                >{{ version.updating() ? 'progress_activity' : 'download' }}</span
              >
              {{ version.updating() ? 'Güncelleniyor…' : 'Şimdi güncelle' }}
            </button>
          </div>
        </div>
      </section>
    }
  `,
})
export class UpdatePrompt {
  readonly version = inject(VersionStore);
}
