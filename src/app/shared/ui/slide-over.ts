import { Component, ElementRef, effect, inject, input, output, viewChild } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/i18n';
import { Notify } from '../../core/notify/notify';

@Component({
  selector: 'app-slide-over',
  imports: [TranslatePipe],
  host: { '(document:keydown.escape)': 'requestClose()' },
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px]"
        (click)="requestClose()"
      ></div>
      <section
        #panel
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        tabindex="-1"
        (keydown.tab)="trapFocus($event)"
        class="animate-slide-in fixed inset-y-0 end-0 z-50 flex w-full flex-col overflow-hidden border-s border-slate-200 bg-white shadow-2xl outline-none dark:border-slate-800 dark:bg-slate-900 sm:m-2 sm:rounded-2xl sm:border"
        [class.sm:max-w-3xl]="wide()"
        [class.sm:max-w-xl]="!wide()"
      >
        <header
          class="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6"
        >
          <div class="flex min-w-0 items-start gap-3">
            <span
              class="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"
            >
              <span class="material-symbols-rounded" aria-hidden="true">{{ icon() }}</span>
            </span>
            <div class="min-w-0">
              @if (eyebrow()) {
                <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {{ eyebrow() }}
                </div>
              }
              <h2
                class="truncate text-lg font-extrabold tracking-tight text-slate-900 dark:text-white"
              >
                {{ title() }}
              </h2>
              @if (description()) {
                <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ description() }}</p>
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
        </header>
        <form class="flex min-h-0 flex-1 flex-col" (submit)="submit($event)" novalidate>
          <div class="custom-scroll flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
            <ng-content />
          </div>
          <footer
            class="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/60 sm:px-6"
          >
            <ng-content select="[footer]" />
            <div class="ms-auto flex items-center gap-2">
              <button type="button" class="odv-btn-ghost" (click)="requestClose()">
                {{ showSubmit() ? ('common.cancel' | t) : 'Kapat' }}
              </button>
              @if (showSubmit()) {
                <button type="submit" class="odv-btn-primary" [disabled]="submitting()">
                  <span class="material-symbols-rounded">check</span
                  >{{ submitting() ? 'Kaydediliyor…' : submitLabel() }}
                </button>
              }
            </div>
          </footer>
        </form>
      </section>
    }
  `,
})
export class SlideOver {
  private readonly notify = inject(Notify);
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly description = input('');
  readonly eyebrow = input('');
  readonly icon = input('edit_note');
  readonly dirty = input(false);
  readonly wide = input(false);
  readonly submitting = input(false);
  readonly submitLabel = input('Kaydet');
  readonly showSubmit = input(true);
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
    if (!this.open()) return;
    if (this.dirty()) {
      const confirmed = await this.notify.confirm({
        title: 'Kaydedilmemiş değişiklikler',
        text: 'Yaptığınız değişiklikler kaybolacak. Çıkılsın mı?',
        confirmText: 'Çık',
        tone: 'danger',
      });
      if (!confirmed) return;
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
