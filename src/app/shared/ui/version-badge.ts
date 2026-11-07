import { Component, inject } from '@angular/core';
import { VersionStore } from '../../core/version/version-store';

/** Uygulamanın sürüm ve commit bilgisini küçük bir etiket olarak gösterir. */
@Component({
  selector: 'odv-version-badge',
  template: `<span
    class="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400"
    [attr.title]="'Derleme: ' + version.current.buildId + ' · ' + version.current.builtAt"
    ><span class="material-symbols-rounded !text-sm" aria-hidden="true">tag</span>{{ version.label }}</span
  >`,
})
export class VersionBadge {
  readonly version = inject(VersionStore);
}
