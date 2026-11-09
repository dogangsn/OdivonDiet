import { Component, inject, signal } from '@angular/core';
import { MemberPortal } from '../../core/data/member-portal';

/** KVKK explicit consent, given by the member from the portal. */
@Component({
  selector: 'app-consent-card',
  host: { class: 'block' },
  template: `
    <section
      class="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40"
      aria-labelledby="consent-title"
    >
      <div class="flex items-start gap-3">
        <span class="material-symbols-rounded text-amber-600" aria-hidden="true">policy</span>
        <div class="flex-1">
          <h2 id="consent-title" class="text-sm font-extrabold">Açık rıza onayınız bekleniyor</h2>
          <p class="mt-1 text-xs leading-5 text-slate-700 dark:text-slate-300">
            Sağlık verilerinizin (ölçüm, hastalık, alerji bilgileri ve paylaştığınız fotoğraflar)
            beslenme danışmanlığı amacıyla diyetisyeniniz tarafından işlenmesi için 6698 sayılı KVKK
            kapsamında açık rızanız gerekir.
          </p>
          <label class="mt-3 flex items-start gap-2 text-xs font-semibold">
            <input type="checkbox" class="mt-0.5 size-4 accent-emerald-600" [checked]="agreed()" (change)="agreed.set($any($event.target).checked)" />
            Aydınlatma metnini okudum, sağlık verilerimin işlenmesine açık rıza veriyorum.
          </label>
          <button type="button" class="odv-btn-primary mt-3" [disabled]="!agreed()" (click)="member.giveConsent()">
            Onayla
          </button>
        </div>
      </div>
    </section>
  `,
})
export class ConsentCard {
  readonly member = inject(MemberPortal);
  readonly agreed = signal(false);
}
