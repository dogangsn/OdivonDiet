import { TestBed } from '@angular/core/testing';
import { Notify } from './notify';

describe('Notify.confirm', () => {
  it('resolves with the chosen answer and clears the request', async () => {
    const notify = TestBed.inject(Notify);
    const answer = notify.confirm({ title: 'Silinsin mi?', tone: 'danger' });
    expect(notify.pending()?.confirmText).toBe('Onayla');
    expect(notify.pending()?.icon).toBe('warning');
    notify.pending()!.resolve(true);
    await expect(answer).resolves.toBe(true);
    expect(notify.pending()).toBeNull();
  });

  it('cancels an open request when a new one starts', async () => {
    const notify = TestBed.inject(Notify);
    const first = notify.confirm({ title: 'Bir' });
    const second = notify.confirm({ title: 'İki' });
    await expect(first).resolves.toBe(false);
    expect(notify.pending()?.title).toBe('İki');
    notify.pending()!.resolve(false);
    await expect(second).resolves.toBe(false);
  });
});
