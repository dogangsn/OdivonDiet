import { Component, computed, signal } from '@angular/core';

@Component({
  selector: 'app-workspace-page',
  template: `
    <section class="odv-card p-5 sm:p-6" aria-labelledby="workspace-title">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="workspace-title" class="m-0 text-xl font-extrabold">Operasyon çalışma alanı</h2><p class="mb-0 text-sm text-slate-500">Lazy feature route ve Signals tabanlı örnek durum.</p></div>
        <button type="button" class="odv-btn-soft" (click)="showCompleted.update(value => !value)">{{ showCompleted() ? 'Açık görevler' : 'Tamamlananlar' }}</button>
      </div>
      <p class="mt-5 text-sm font-bold text-violet-600">Görünen görev: {{ visibleCount() }}</p>
    </section>
  `,
})
export class WorkspacePage {
  readonly showCompleted = signal(false);
  readonly tasks = signal([{ done: false }, { done: false }, { done: true }]);
  readonly visibleCount = computed(() => this.tasks().filter(task => task.done === this.showCompleted()).length);
}
