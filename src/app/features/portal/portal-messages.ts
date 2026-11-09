import { Component, inject } from '@angular/core';
import { MemberPortal } from '../../core/data/member-portal';
import { Avatar } from '../../shared/ui/avatar';
import { ChatThread } from '../messages/chat-thread';

@Component({
  selector: 'app-portal-messages',
  imports: [ChatThread, Avatar],
  template: `
    @if (member.clientId(); as clientId) {
      <div class="animate-fade-up odv-card flex h-[calc(100dvh-13rem)] min-h-[26rem] flex-col overflow-hidden lg:h-[calc(100dvh-10rem)]">
        <header class="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <app-avatar name="Deniz Arslan" size="sm" />
          <div class="min-w-0 flex-1">
            <h1 class="truncate text-sm font-extrabold">Dyt. Deniz Arslan</h1>
            <p class="text-[11px] text-slate-500">Genellikle iş günleri içinde yanıt verir</p>
          </div>
        </header>
        <app-chat-thread class="min-h-0 flex-1" [clientId]="clientId" viewer="member" />
      </div>
      <p class="mt-3 text-center text-[11px] text-slate-400">
        Acil sağlık sorunlarında mesaj yerine 112'yi arayın.
      </p>
    }
  `,
})
export class PortalMessages {
  readonly member = inject(MemberPortal);
}
