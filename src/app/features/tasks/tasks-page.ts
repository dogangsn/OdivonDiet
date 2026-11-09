import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { DietStore } from '../../core/data/diet-store';
import { PortalStore } from '../../core/data/portal-store';
import { isoDate } from '../../domain/diet-calc';
import { CareTask, TASK_CATEGORY_ICONS, TASK_CATEGORY_LABELS } from '../../domain/portal.models';
import { AttachmentList } from '../../shared/ui/attachment-list';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { PageHeader } from '../../shared/ui/page-header';
import { QuickActions } from '../forms/quick-actions';

type Filter = 'open' | 'overdue' | 'done';

@Component({
  selector: 'app-tasks-page',
  imports: [PageHeader, Avatar, EmptyState, AttachmentList, DatePipe, RouterLink],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Danışan portalı"
        title="Görevler"
        description="Danışanlarınıza atadığınız görevleri ve tamamlama durumlarını takip edin."
      >
        <button actions type="button" class="odv-btn-primary" (click)="qa.open('task')">
          <span class="material-symbols-rounded !text-lg">add_task</span>Görev ata
        </button>
      </app-page-header>

      <div class="odv-segment" role="group" aria-label="Görev filtresi">
        <button type="button" class="odv-segment-item" [attr.aria-pressed]="filter() === 'open'" (click)="filter.set('open')">
          Açık <span class="tabular text-slate-400">{{ counts().open }}</span>
        </button>
        <button type="button" class="odv-segment-item" [attr.aria-pressed]="filter() === 'overdue'" (click)="filter.set('overdue')">
          Gecikmiş <span class="tabular text-rose-500">{{ counts().overdue }}</span>
        </button>
        <button type="button" class="odv-segment-item" [attr.aria-pressed]="filter() === 'done'" (click)="filter.set('done')">
          Tamamlanan <span class="tabular text-slate-400">{{ counts().done }}</span>
        </button>
      </div>

      <ul class="odv-card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        @for (t of list(); track t.id) {
          <li class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
            <span
              class="grid size-10 shrink-0 place-items-center rounded-xl"
              [class]="t.status === 'done' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300'"
              ><span class="material-symbols-rounded" aria-hidden="true">{{
                t.status === 'done' ? 'task_alt' : icons[t.category]
              }}</span></span
            >
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <strong class="text-sm" [class.line-through]="t.status === 'done'">{{ t.title }}</strong>
                <span class="odv-badge odv-tone-neutral">{{ labels[t.category] }}</span>
                @if (isOverdue(t)) {
                  <span class="odv-badge odv-tone-danger">Gecikti</span>
                }
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                <span class="inline-flex items-center gap-1.5"
                  ><app-avatar [name]="diet.clientName(t.clientId)" size="sm" />{{ diet.clientName(t.clientId) }}</span
                >
                @if (t.status === 'done') {
                  <span>Tamamlandı · {{ t.completedAt | date: 'd MMM, HH:mm' }}</span>
                } @else if (t.dueDate) {
                  <span>Son tarih {{ t.dueDate | date: 'd MMM y' }}</span>
                }
              </div>
              @if (t.completionNote) {
                <p class="mt-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  “{{ t.completionNote }}”
                </p>
              }
              @if (t.attachments.length) {
                <app-attachment-list class="mt-2" [attachments]="t.attachments" />
              }
            </div>
            <div class="flex shrink-0 gap-1">
              <a class="odv-icon-btn" routerLink="/messages" [queryParams]="{ client: t.clientId }" aria-label="Sohbete git">
                <span class="material-symbols-rounded">forum</span>
              </a>
              @if (t.status === 'done') {
                <button type="button" class="odv-icon-btn" aria-label="Görevi yeniden aç" (click)="portal.reopenTask(t.id)">
                  <span class="material-symbols-rounded">undo</span>
                </button>
              }
              <button type="button" class="odv-icon-btn" aria-label="Görevi sil" (click)="remove(t)">
                <span class="material-symbols-rounded">delete</span>
              </button>
            </div>
          </li>
        } @empty {
          <li>
            <app-empty-state icon="task_alt" title="Bu listede görev yok" body="Danışanlarınıza ölçüm, fotoğraf veya öğün kaydı gibi görevler atayabilirsiniz.">
              <button type="button" class="odv-btn-soft" (click)="qa.open('task')">Görev ata</button>
            </app-empty-state>
          </li>
        }
      </ul>
    </div>
  `,
})
export class TasksPage {
  readonly diet = inject(DietStore);
  readonly portal = inject(PortalStore);
  readonly qa = inject(QuickActions);
  readonly icons = TASK_CATEGORY_ICONS;
  readonly labels = TASK_CATEGORY_LABELS;
  readonly filter = signal<Filter>('open');
  private readonly today = isoDate(new Date());

  readonly counts = computed(() => {
    const tasks = this.portal.tasks();
    return {
      open: tasks.filter((t) => t.status === 'open').length,
      overdue: tasks.filter((t) => this.isOverdue(t)).length,
      done: tasks.filter((t) => t.status === 'done').length,
    };
  });

  readonly list = computed(() => {
    const filter = this.filter();
    return this.portal
      .tasks()
      .filter((t) =>
        filter === 'done' ? t.status === 'done' : filter === 'overdue' ? this.isOverdue(t) : t.status === 'open',
      )
      .sort((a, b) =>
        filter === 'done'
          ? (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
          : (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'),
      );
  });

  isOverdue(t: CareTask): boolean {
    return t.status === 'open' && !!t.dueDate && t.dueDate < this.today;
  }

  async remove(t: CareTask): Promise<void> {
    const result = await Swal.fire({
      title: 'Görev silinsin mi?',
      text: `“${t.title}” danışanın portalından da kaldırılır.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sil',
      cancelButtonText: 'Vazgeç',
      customClass: { popup: 'odv-swal-popup', confirmButton: 'odv-swal-danger', cancelButton: 'odv-swal-cancel' },
    });
    if (result.isConfirmed) this.portal.deleteTask(t.id);
  }
}
