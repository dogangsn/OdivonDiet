import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import Swal from 'sweetalert2';
import { TranslatePipe } from '../../core/i18n/i18n';

@Component({
  selector: 'app-slide-over',
  imports: [TranslatePipe],
  host: { '(document:keydown.escape)': 'requestClose()' },
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
        (click)="requestClose()"
      ></div>
      <section
        #panel
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        tabindex="-1"
        (keydown.tab)="trapFocus($event)"
        class="fixed inset-y-0 end-0 z-50 flex w-full flex-col overflow-hidden border-s border-slate-200 bg-white shadow-[0_0_80px_rgba(15,23,42,.28)] outline-none dark:border-slate-800 dark:bg-slate-900"
        [class.max-w-3xl]="wide()"
        [class.max-w-lg]="!wide()"
      >
        <div class="h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400"></div>
        <header
          class="border-b border-slate-200 bg-gradient-to-b from-violet-50/80 to-white px-6 py-5 dark:border-slate-800 dark:from-violet-950/30 dark:to-slate-900 sm:px-8"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex min-w-0 items-start gap-3">
              <span
                class="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/25"
              >
                <span class="material-symbols-rounded">{{ icon() }}</span>
              </span>
              <div class="min-w-0">
                <div
                  class="mb-1 text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-600 dark:text-violet-300"
                >
                  {{ eyebrow() }}
                </div>
                <h2 class="m-0 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                  {{ title() }}
                </h2>
                @if (description()) {
                  <p
                    class="mb-0 mt-1 max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-400"
                  >
                    {{ description() }}
                  </p>
                }
              </div>
            </div>
            <button
              type="button"
              (click)="requestClose()"
              class="odv-icon-btn shrink-0"
              aria-label="Kapat"
            >
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
        </header>
        <form class="flex min-h-0 flex-1 flex-col" (submit)="submit($event)">
          <div
            class="custom-scroll flex-1 space-y-6 overflow-y-auto overscroll-contain bg-slate-50/60 p-5 dark:bg-slate-950/30 sm:p-8"
          >
            <ng-content />
          </div>
          <footer
            class="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-8"
          >
            <span
              class="hidden items-center gap-1.5 text-[11px] font-semibold text-slate-400 sm:inline-flex"
            >
              <span class="material-symbols-rounded !text-base">lock</span>Değişiklikler güvenli
              bağlantıyla kaydedilir
            </span>
            <div class="ms-auto flex items-center gap-3">
              <button type="button" class="odv-btn-ghost" (click)="requestClose()">
                {{ 'common.cancel' | t }}
              </button>
              <button type="submit" class="odv-btn-primary" [disabled]="submitting()">
                <span class="material-symbols-rounded">check</span
                >{{ submitting() ? 'Kaydediliyor…' : submitLabel() }}
              </button>
            </div>
          </footer>
        </form>
      </section>
    }
  `,
})
export class SlideOver {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly description = input('');
  readonly eyebrow = input('Kayıt Yönetimi');
  readonly icon = input('edit_note');
  readonly dirty = input(false);
  readonly wide = input(false);
  readonly submitting = input(false);
  readonly submitLabel = input('Kaydet');
  readonly closed = output<void>();
  readonly submitted = output<void>();
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private opener: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.opener = document.activeElement as HTMLElement;
        queueMicrotask(() => this.panel()?.nativeElement.focus());
      }
    });
  }

  async requestClose(): Promise<void> {
    if (this.dirty()) {
      const result = await Swal.fire({
        title: 'Kaydedilmemiş değişiklikler',
        text: 'Yaptığınız değişiklikler kaybolacak. Çıkılsın mı?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Çık',
        cancelButtonText: 'Vazgeç',
        customClass: {
          popup: 'odv-swal-popup',
          confirmButton: 'odv-swal-danger',
          cancelButton: 'odv-swal-cancel',
        },
      });
      if (!result.isConfirmed) return;
    }
    this.closed.emit();
    queueMicrotask(() => this.opener?.focus());
  }

  trapFocus(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const root = this.panel()?.nativeElement;
    if (!root) return;
    const nodes = [
      ...root.querySelectorAll<HTMLElement>(
        'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ),
    ];
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (keyboardEvent.shiftKey && document.activeElement === first) {
      keyboardEvent.preventDefault();
      last.focus();
    } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
      keyboardEvent.preventDefault();
      first.focus();
    }
  }

  submit(event: Event): void {
    event.preventDefault();
    this.submitted.emit();
  }
}
