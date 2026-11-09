import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { AuthStore } from '../../core/auth/auth-store';
import { DietStore } from '../../core/data/diet-store';
import { PortalStore } from '../../core/data/portal-store';
import { isoDate } from '../../domain/diet-calc';
import {
  TASK_CATEGORY_ICONS,
  TASK_CATEGORY_LABELS,
  TaskCategory,
} from '../../domain/portal.models';
import { SlideOver } from '../../shared/ui/slide-over';
import { QuickActions } from './quick-actions';

interface TaskDraft {
  clientId: string;
  title: string;
  description: string;
  category: TaskCategory;
  dueDate: string;
}

const TEMPLATES: ReadonlyArray<{ category: TaskCategory; title: string; description: string }> = [
  { category: 'photo', title: 'Öğününüzün fotoğrafını gönderin', description: 'Tabağın tamamı görünecek şekilde çekin.' },
  { category: 'measurement', title: 'Haftalık tartı ölçümü', description: 'Sabah aç karnına tartılıp portala girin.' },
  { category: 'water', title: 'Günde 2,5 L su', description: 'Gün sonunda tamamlandı olarak işaretleyin.' },
  { category: 'meal_log', title: '3 günlük besin kaydı', description: 'Yediklerinizi saatleriyle yazın.' },
  { category: 'exercise', title: 'Haftada 3 gün 30 dk yürüyüş', description: '' },
];

@Component({
  selector: 'app-task-form',
  imports: [SlideOver, FormField],
  template: `
    <app-slide-over
      [open]="open()"
      [dirty]="!!model().title || !!model().description"
      icon="add_task"
      eyebrow="Görev"
      title="Danışana görev ata"
      description="Görev danışanın portalına ve sohbetine düşer; tamamlayınca size bildirim gelir."
      submitLabel="Görevi ata"
      (closed)="qa.close()"
      (submitted)="save()"
    >
      <div class="odv-card space-y-4 p-5">
        <label class="block">
          <span class="odv-label">Danışan <b class="text-rose-500">*</b></span>
          <select class="odv-input" [formField]="f.clientId">
            <option value="" disabled>Danışan seçin</option>
            @for (view of store.activeClients(); track view.client.id) {
              <option [value]="view.client.id">{{ view.fullName }}</option>
            }
          </select>
          @if (f.clientId().touched() && f.clientId().invalid()) {
            <span class="odv-error">Danışan seçin.</span>
          }
          @if (noPortal()) {
            <span class="odv-hint !text-amber-600"
              >Bu danışanın portal erişimi yok; görevi görebilmesi için profilinden davet edin.</span
            >
          }
        </label>

        <fieldset>
          <legend class="odv-label">Hazır görevler</legend>
          <div class="flex flex-wrap gap-1.5">
            @for (t of templates; track t.title) {
              <button type="button" class="odv-btn-soft" (click)="useTemplate(t)">
                <span class="material-symbols-rounded !text-base" aria-hidden="true">{{
                  icons[t.category]
                }}</span
                >{{ t.title }}
              </button>
            }
          </div>
        </fieldset>

        <label class="block">
          <span class="odv-label">Görev <b class="text-rose-500">*</b></span>
          <input class="odv-input" [formField]="f.title" placeholder="Örn. Akşam yemeği fotoğrafı" />
          @if (f.title().touched() && f.title().invalid()) {
            <span class="odv-error">Görev başlığı zorunludur (en fazla 120 karakter).</span>
          }
        </label>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="odv-label">Tür</span>
            <select class="odv-input" [formField]="f.category">
              @for (key of categories; track key) {
                <option [value]="key">{{ labels[key] }}</option>
              }
            </select>
          </label>
          <label class="block">
            <span class="odv-label">Son tarih</span>
            <input class="odv-input" type="date" [formField]="f.dueDate" />
          </label>
        </div>
        <label class="block">
          <span class="odv-label">Açıklama</span>
          <textarea
            class="odv-input min-h-24 resize-y"
            [formField]="f.description"
            placeholder="Danışanın görevi nasıl yapacağını kısaca yazın."
          ></textarea>
        </label>
      </div>
    </app-slide-over>
  `,
})
export class TaskForm {
  readonly qa = inject(QuickActions);
  readonly store = inject(DietStore);
  private readonly portal = inject(PortalStore);
  private readonly auth = inject(AuthStore);
  readonly open = computed(() => this.qa.state()?.kind === 'task');
  readonly templates = TEMPLATES;
  readonly icons = TASK_CATEGORY_ICONS;
  readonly labels = TASK_CATEGORY_LABELS;
  readonly categories = Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[];
  readonly model = signal<TaskDraft>(this.empty());
  readonly f = form(this.model, (p) => {
    required(p.clientId);
    required(p.title);
    maxLength(p.title, 120);
  });
  readonly noPortal = computed(() => {
    const id = this.model().clientId;
    return !!id && !this.portal.canUsePortal(id);
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const clientId = this.qa.state()?.clientId;
      untracked(() => {
        this.model.set({ ...this.empty(), clientId: clientId ?? '' });
        this.f().reset();
      });
    });
  }

  useTemplate(t: (typeof TEMPLATES)[number]): void {
    this.model.update((m) => ({ ...m, ...t }));
  }

  save(): void {
    void submit(this.f, async () => {
      const v = this.model();
      this.portal.assignTask(
        {
          clientId: v.clientId,
          title: v.title,
          description: v.description,
          category: v.category,
          dueDate: v.dueDate || null,
        },
        this.auth.session()?.name ?? 'Diyetisyen',
      );
      this.qa.close();
    });
  }

  private empty(): TaskDraft {
    const due = new Date();
    due.setDate(due.getDate() + 3);
    return { clientId: '', title: '', description: '', category: 'other', dueDate: isoDate(due) };
  }
}
