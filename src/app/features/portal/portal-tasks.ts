import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { MemberPortal } from '../../core/data/member-portal';
import { isoDate } from '../../domain/diet-calc';
import { CareTask, TASK_CATEGORY_ICONS, TASK_CATEGORY_LABELS } from '../../domain/portal.models';
import { AttachmentList } from '../../shared/ui/attachment-list';
import { EmptyState } from '../../shared/ui/empty-state';
import { FilePicker, PickedFiles } from '../../shared/ui/file-picker';
import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'app-portal-tasks',
  imports: [PageHeader, EmptyState, AttachmentList, FilePicker, PickedFiles, DatePipe],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Takip"
        title="Görevlerim"
        description="Diyetisyeninizin sizden istedikleri. Tamamladığınızda not ve fotoğraf ekleyebilirsiniz."
      />

      <section aria-labelledby="open-title">
        <h2 id="open-title" class="odv-section-title mb-3">Bekleyen ({{ member.openTasks().length }})</h2>
        <ul class="space-y-3">
          @for (t of member.openTasks(); track t.id) {
            <li class="odv-card p-5" [class.ring-2]="t.id === expanded()" [class.ring-emerald-300]="t.id === expanded()">
              <div class="flex items-start gap-3">
                <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
                  ><span class="material-symbols-rounded" aria-hidden="true">{{ icons[t.category] }}</span></span
                >
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <strong class="text-sm">{{ t.title }}</strong>
                    <span class="odv-badge odv-tone-neutral">{{ labels[t.category] }}</span>
                    @if (overdue(t)) {
                      <span class="odv-badge odv-tone-danger">Süresi geçti</span>
                    }
                  </div>
                  @if (t.description) {
                    <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ t.description }}</p>
                  }
                  @if (t.dueDate) {
                    <p class="mt-1 text-xs text-slate-500">Son tarih: {{ t.dueDate | date: 'd MMMM EEEE' }}</p>
                  }
                </div>
                @if (t.id !== expanded()) {
                  <button type="button" class="odv-btn-primary shrink-0" (click)="expand(t.id)">Tamamla</button>
                }
              </div>

              @if (t.id === expanded()) {
                <form class="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800" (submit)="complete($event, t)">
                  <label class="block">
                    <span class="odv-label">Not (isteğe bağlı)</span>
                    <textarea
                      class="odv-input min-h-20 resize-y"
                      placeholder="Örn. Öğle yemeğinde ızgara tavuk ve salata yedim."
                      [value]="note()"
                      (input)="note.set($any($event.target).value)"
                    ></textarea>
                  </label>
                  <app-file-picker label="Fotoğraf / dosya ekle" [(files)]="files" [(errors)]="errors" />
                  <app-picked-files [(files)]="files" [errors]="errors()" />
                  <div class="flex gap-2">
                    <button type="submit" class="odv-btn-primary">
                      <span class="material-symbols-rounded !text-lg">task_alt</span>Tamamlandı olarak gönder
                    </button>
                    <button type="button" class="odv-btn-ghost" (click)="expand(null)">Vazgeç</button>
                  </div>
                </form>
              }
            </li>
          } @empty {
            <li class="odv-card"><app-empty-state icon="task_alt" title="Bekleyen göreviniz yok" body="Yeni görevler atandığında burada ve sohbetinizde göreceksiniz." /></li>
          }
        </ul>
      </section>

      @if (done().length) {
        <section aria-labelledby="done-title">
          <h2 id="done-title" class="odv-section-title mb-3">Tamamlanan</h2>
          <ul class="odv-card divide-y divide-slate-100 dark:divide-slate-800">
            @for (t of done(); track t.id) {
              <li class="flex items-start gap-3 px-5 py-4">
                <span class="material-symbols-rounded icon-fill text-emerald-500" aria-hidden="true">check_circle</span>
                <div class="min-w-0 flex-1">
                  <strong class="text-sm">{{ t.title }}</strong>
                  <p class="text-xs text-slate-500">{{ t.completedAt | date: 'd MMM, HH:mm' }}</p>
                  @if (t.completionNote) {
                    <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">“{{ t.completionNote }}”</p>
                  }
                  @if (t.attachments.length) {
                    <app-attachment-list class="mt-2" [attachments]="t.attachments" />
                  }
                </div>
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `,
})
export class PortalTasks {
  /** `?task=` opens that task's completion form. */
  readonly task = input<string>();
  readonly member = inject(MemberPortal);
  readonly icons = TASK_CATEGORY_ICONS;
  readonly labels = TASK_CATEGORY_LABELS;
  readonly expanded = signal<string | null>(null);
  readonly note = signal('');
  readonly files = signal<File[]>([]);
  readonly errors = signal<string[]>([]);
  readonly done = computed(() => this.member.tasks().filter((t) => t.status === 'done'));
  private readonly today = isoDate(new Date());

  constructor() {
    effect(() => {
      const id = this.task();
      untracked(() => {
        if (id && this.member.openTasks().some((t) => t.id === id)) this.expand(id);
      });
    });
  }

  overdue(t: CareTask): boolean {
    return !!t.dueDate && t.dueDate < this.today;
  }

  expand(id: string | null): void {
    this.expanded.set(id);
    this.note.set('');
    this.files.set([]);
    this.errors.set([]);
  }

  complete(event: Event, t: CareTask): void {
    event.preventDefault();
    this.member.completeTask(t.id, this.note(), this.files());
    this.expand(null);
  }
}
