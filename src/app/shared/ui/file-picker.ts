import { Component, OnDestroy, computed, effect, input, model } from '@angular/core';
import {
  ACCEPTED_FILE_TYPES,
  MAX_ATTACHMENTS_PER_MESSAGE,
  formatBytes,
  partitionAttachments,
} from '../../domain/attachment-rules';

interface Picked {
  readonly file: File;
  readonly preview: string | null;
}

/**
 * "Attach" button plus the list of picked files, with validation messages.
 * Bind the selection with `[(files)]`; the parent clears it after sending.
 */
@Component({
  selector: 'app-file-picker',
  host: { class: 'block' },
  template: `
    <input
      #input
      type="file"
      class="sr-only"
      multiple
      tabindex="-1"
      aria-hidden="true"
      [accept]="accept"
      (change)="add(input)"
    />
    @if (compact()) {
      <button
        type="button"
        class="odv-icon-btn"
        [attr.aria-label]="'Dosya veya fotoğraf ekle (en fazla ' + max + ')'"
        (click)="input.click()"
      >
        <span class="material-symbols-rounded">attach_file</span>
      </button>
    } @else {
      <button type="button" class="odv-btn-secondary" (click)="input.click()">
        <span class="material-symbols-rounded !text-lg">attach_file</span>{{ label() }}
      </button>
      <span class="odv-hint">Fotoğraf, PDF, Word veya Excel · en fazla {{ max }} dosya, 10 MB</span>
    }
  `,
})
export class FilePicker {
  readonly files = model<File[]>([]);
  readonly errors = model<string[]>([]);
  readonly compact = input(false);
  readonly label = input('Dosya ekle');
  readonly accept = ACCEPTED_FILE_TYPES;
  readonly max = MAX_ATTACHMENTS_PER_MESSAGE;

  add(input: HTMLInputElement): void {
    const picked = Array.from(input.files ?? []);
    input.value = '';
    const { accepted, errors } = partitionAttachments(picked, this.files().length);
    this.files.update((list) => [...list, ...accepted.map((a) => a.file)]);
    this.errors.set(errors);
  }
}

/** Chips for picked files, each with a remove button and an image preview. */
@Component({
  selector: 'app-picked-files',
  host: { class: 'block' },
  template: `
    @if (items().length || errors().length) {
      <div class="space-y-2">
        @if (items().length) {
          <ul class="flex flex-wrap gap-2" aria-label="Eklenecek dosyalar">
            @for (item of items(); track $index) {
              <li
                class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 ps-1 pe-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
              >
                @if (item.preview) {
                  <img [src]="item.preview" alt="" class="size-8 rounded-lg object-cover" />
                } @else {
                  <span
                    class="grid size-8 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"
                    ><span class="material-symbols-rounded !text-lg" aria-hidden="true"
                      >description</span
                    ></span
                  >
                }
                <span class="max-w-36 truncate font-semibold">{{ item.file.name }}</span>
                <span class="text-slate-400">{{ size(item.file.size) }}</span>
                <button
                  type="button"
                  class="odv-icon-btn !size-7"
                  [attr.aria-label]="item.file.name + ' dosyasını kaldır'"
                  (click)="remove($index)"
                >
                  <span class="material-symbols-rounded !text-base">close</span>
                </button>
              </li>
            }
          </ul>
        }
        @for (error of errors(); track error) {
          <p class="odv-error !mt-0" role="alert">{{ error }}</p>
        }
      </div>
    }
  `,
})
export class PickedFiles implements OnDestroy {
  readonly files = model<File[]>([]);
  readonly errors = input<string[]>([]);
  readonly size = formatBytes;
  private readonly previews = new Map<File, string>();
  readonly items = computed<Picked[]>(() =>
    this.files().map((file) => ({ file, preview: this.previewFor(file) })),
  );

  constructor() {
    // Free preview URLs of files that were removed or sent.
    effect(() => {
      const current = this.files();
      for (const [file, url] of this.previews) {
        if (!current.includes(file)) {
          URL.revokeObjectURL?.(url);
          this.previews.delete(file);
        }
      }
    });
  }

  remove(index: number): void {
    this.files.update((list) => list.filter((_, i) => i !== index));
  }

  ngOnDestroy(): void {
    for (const url of this.previews.values()) URL.revokeObjectURL?.(url);
  }

  private previewFor(file: File): string | null {
    if (!file.type.startsWith('image/') || typeof URL.createObjectURL !== 'function') return null;
    let url = this.previews.get(file);
    if (!url) {
      url = URL.createObjectURL(file);
      this.previews.set(file, url);
    }
    return url;
  }
}
