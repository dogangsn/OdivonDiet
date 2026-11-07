import { Component, computed, input, signal } from '@angular/core';
import { formatBytes } from '../../domain/attachment-rules';
import { Attachment } from '../../domain/portal.models';

/** Image thumbnails (open in a viewer) and download chips for documents. */
@Component({
  selector: 'app-attachment-list',
  host: { class: 'block', '(document:keydown.escape)': 'preview.set(null)' },
  template: `
    @if (images().length) {
      <ul class="flex flex-wrap gap-1.5" aria-label="Görseller">
        @for (item of images(); track item.id) {
          <li>
            <button
              type="button"
              class="block overflow-hidden rounded-xl border border-black/5 bg-slate-100 focus-visible:outline-3 focus-visible:outline-violet-400 dark:bg-slate-800"
              [attr.aria-label]="item.name + ' görselini büyüt'"
              (click)="preview.set(item)"
            >
              @if (item.url) {
                <img [src]="item.url" [alt]="item.name" class="size-28 object-cover" />
              } @else {
                <span class="grid size-28 place-items-center text-slate-400">
                  <span class="material-symbols-rounded !text-3xl" aria-hidden="true">image</span>
                </span>
              }
            </button>
          </li>
        }
      </ul>
    }
    @if (files().length) {
      <ul class="mt-1.5 flex flex-col gap-1.5" aria-label="Dosyalar">
        @for (item of files(); track item.id) {
          <li>
            <a
              [href]="item.url || null"
              [attr.download]="item.name"
              class="flex max-w-72 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-start text-slate-700 hover:border-violet-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span
                class="material-symbols-rounded shrink-0 text-violet-600 dark:text-violet-300"
                aria-hidden="true"
                >{{ item.mimeType === 'application/pdf' ? 'picture_as_pdf' : 'description' }}</span
              >
              <span class="min-w-0 flex-1">
                <span class="block truncate text-xs font-bold">{{ item.name }}</span>
                <span class="block text-[11px] text-slate-500">{{ size(item.sizeBytes) }}</span>
              </span>
              <span class="material-symbols-rounded !text-lg text-slate-400" aria-hidden="true"
                >download</span
              >
            </a>
          </li>
        }
      </ul>
    }

    @if (preview(); as item) {
      <div
        class="fixed inset-0 z-[70] grid place-items-center bg-slate-950/85 p-4"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="item.name"
        (click)="preview.set(null)"
      >
        <img
          [src]="item.url"
          [alt]="item.name"
          class="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
        />
        <div class="absolute end-4 top-4 flex gap-2">
          <a
            class="odv-icon-btn !bg-white/10 !text-white"
            [href]="item.url"
            [attr.download]="item.name"
            aria-label="İndir"
            (click)="$event.stopPropagation()"
            ><span class="material-symbols-rounded">download</span></a
          >
          <button
            type="button"
            class="odv-icon-btn !bg-white/10 !text-white"
            aria-label="Kapat"
            (click)="preview.set(null)"
          >
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
      </div>
    }
  `,
})
export class AttachmentList {
  readonly attachments = input.required<readonly Attachment[]>();
  readonly images = computed(() => this.attachments().filter((a) => a.kind === 'image'));
  readonly files = computed(() => this.attachments().filter((a) => a.kind === 'file'));
  readonly preview = signal<Attachment | null>(null);
  readonly size = formatBytes;
}
