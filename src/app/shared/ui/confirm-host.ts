import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { Notify } from '../../core/notify/notify';

/** `Notify.confirm()` isteklerini gösteren onay penceresi. Uygulama kökünde bir kez kullanılır. */
@Component({
  selector: 'odv-confirm-host',
  template: `
    @if (notify.pending(); as req) {
      <div
        class="odv-fade-in fixed inset-0 z-[95] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"
        (click)="req.resolve(false)"
      >
        <section
          #dialog
          class="odv-pop-in w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl shadow-slate-900/20 dark:border-slate-800 dark:bg-slate-900"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="odv-confirm-title"
          [attr.aria-describedby]="req.text ? 'odv-confirm-text' : null"
          (click)="$event.stopPropagation()"
          (keydown.escape)="req.resolve(false)"
          (keydown.tab)="trap($event)"
          (keydown.shift.tab)="trap($event)"
        >
          <div
            class="mb-4 grid h-12 w-12 place-items-center rounded-2xl"
            [class]="
              req.tone === 'danger'
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                : 'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300'
            "
          >
            <span class="material-symbols-rounded !text-2xl" aria-hidden="true">{{
              req.icon
            }}</span>
          </div>
          <h2
            id="odv-confirm-title"
            class="text-lg font-black tracking-tight text-slate-900 dark:text-white"
          >
            {{ req.title }}
          </h2>
          @if (req.text) {
            <p
              id="odv-confirm-text"
              class="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400"
            >
              {{ req.text }}
            </p>
          }
          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              data-role="cancel"
              class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:outline-none dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              (click)="req.resolve(false)"
            >
              {{ req.cancelText }}
            </button>
            <button
              type="button"
              data-role="confirm"
              class="rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] dark:focus-visible:ring-offset-slate-900"
              [class]="
                req.tone === 'danger'
                  ? 'bg-rose-600 shadow-rose-600/20 focus-visible:ring-rose-500'
                  : 'bg-gradient-to-r from-indigo-500 to-violet-600 shadow-indigo-500/20 focus-visible:ring-violet-500'
              "
              (click)="req.resolve(true)"
            >
              {{ req.confirmText }}
            </button>
          </div>
        </section>
      </div>
    }
  `,
})
export class ConfirmHost {
  readonly notify = inject(Notify);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private opener: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const req = this.notify.pending();
      const el = this.dialog()?.nativeElement;
      if (req && el) {
        this.opener ??= document.activeElement as HTMLElement | null;
        // Riskli işlemlerde varsayılan odak "Vazgeç" üzerinde olur.
        const target = el.querySelector<HTMLElement>(
          req.tone === 'danger' ? '[data-role=cancel]' : '[data-role=confirm]',
        );
        queueMicrotask(() => target?.focus());
      } else if (!req && this.opener) {
        const opener = this.opener;
        this.opener = null;
        queueMicrotask(() => opener.focus?.());
      }
    });
  }

  trap(event: Event): void {
    const el = this.dialog()?.nativeElement;
    if (!el) return;
    const buttons = [...el.querySelectorAll<HTMLElement>('button')];
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    const shift = (event as KeyboardEvent).shiftKey;
    if (shift && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!shift && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
