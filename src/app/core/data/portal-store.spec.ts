import { TestBed } from '@angular/core/testing';
import { PortalStore } from './portal-store';

describe('PortalStore', () => {
  let store: PortalStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(PortalStore);
  });

  it('counts unread messages per side and clears them on read', () => {
    expect(store.unreadCount('c-2', 'dietitian')).toBe(2);
    store.markRead('c-2', 'dietitian');
    expect(store.unreadCount('c-2', 'dietitian')).toBe(0);
  });

  it('marks the conversation read for the sender', () => {
    store.sendMessage('c-2', 'dietitian', 'Dyt. Deniz', 'Teşekkürler Mert Bey');
    expect(store.unreadCount('c-2', 'dietitian')).toBe(0);
    expect(store.unreadCount('c-2', 'member')).toBe(1);
  });

  it('ignores empty messages', () => {
    const before = store.messages().length;
    expect(store.sendMessage('c-1', 'member', 'Elif', '   ')).toBeNull();
    expect(store.messages().length).toBe(before);
  });

  it('drops unsupported attachments', () => {
    const ok = new File(['x'], 'ogle.png', { type: 'image/png' });
    const bad = new File(['x'], 'virus.exe', { type: 'application/x-msdownload' });
    const message = store.sendMessage('c-1', 'member', 'Elif', '', [ok, bad]);
    expect(message?.attachments.map((a) => a.name)).toEqual(['ogle.png']);
    expect(message?.attachments[0].kind).toBe('image');
  });

  it('announces assigned tasks in the chat and notifies on completion', () => {
    const task = store.assignTask(
      { clientId: 'c-1', title: 'Su takibi', description: '', category: 'water', dueDate: null },
      'Dyt. Deniz',
    );
    expect(store.messagesFor('c-1').at(-1)?.taskId).toBe(task.id);

    store.completeTask(task.id, 'Tamam');
    expect(store.task(task.id)?.status).toBe('done');
    const notice = store.messagesFor('c-1').at(-1)!;
    expect(notice.author).toBe('system');
    expect(notice.body).toContain('Tamam');
  });

  it('tracks member requests through to a response', () => {
    const request = store.createRequest({
      clientId: 'c-1',
      type: 'question',
      subject: 'Kahve içebilir miyim?',
      detail: '',
    });
    expect(store.openRequestCount()).toBe(2);
    store.respondToRequest(request.id, 'resolved', 'Günde 2 fincan olabilir.', 'Dyt. Deniz');
    expect(store.request(request.id)?.status).toBe('resolved');
    expect(store.request(request.id)?.response).toBe('Günde 2 fincan olabilir.');
    expect(store.messagesFor('c-1').at(-1)?.author).toBe('dietitian');
  });

  it('only lets invited or active clients log in to the portal', () => {
    const clients = [
      { id: 'c-1', email: 'elif.kaya@ornek.com', status: 'active' },
      { id: 'c-5', email: 'zeynep@ornek.com', status: 'active' },
    ] as never;
    expect(store.clientIdForLogin('Elif.Kaya@ornek.com ', clients)).toBe('c-1');
    expect(store.clientIdForLogin('zeynep@ornek.com', clients)).toBeUndefined();
    store.invite('c-5');
    expect(store.clientIdForLogin('zeynep@ornek.com', clients)).toBe('c-5');
    store.disable('c-5');
    expect(store.clientIdForLogin('zeynep@ornek.com', clients)).toBeUndefined();
  });
});
