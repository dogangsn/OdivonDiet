import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import axe from 'axe-core';
import { AuthStore } from '../../core/auth/auth-store';
import { MessagesPage } from '../messages/messages-page';
import { RequestsPage } from '../requests/requests-page';
import { TasksPage } from '../tasks/tasks-page';
import { PortalHome } from './portal-home';
import { PortalMessages } from './portal-messages';
import { PortalProfile } from './portal-profile';
import { PortalProgress } from './portal-progress';
import { PortalRequests } from './portal-requests';
import { PortalTasks } from './portal-tasks';

async function blocking(component: Type<unknown>): Promise<unknown[]> {
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  const result = await axe.run(fixture.nativeElement as HTMLElement, {
    resultTypes: ['violations'],
    rules: { 'color-contrast': { enabled: false } },
  });
  return result.violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => v.id);
}

describe('Member portal pages', () => {
  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    await TestBed.inject(AuthStore).continueMemberDemo();
  });
  afterEach(() => localStorage.clear());

  it('greets the member with their own plan and tasks', async () => {
    const fixture = TestBed.createComponent(PortalHome);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Elif');
    expect(text).toContain('Öğle yemeğinin fotoğrafını gönder');
    expect(text).not.toContain('Açlık kan şekeri');
  });

  for (const page of [PortalHome, PortalMessages, PortalTasks, PortalRequests, PortalProgress, PortalProfile]) {
    it(`${page.name} has no critical or serious AXE violations`, async () => {
      expect(await blocking(page)).toEqual([]);
    });
  }
});

describe('Dietitian portal pages', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(AuthStore).continueDemo();
  });
  afterEach(() => localStorage.clear());

  for (const page of [MessagesPage, RequestsPage, TasksPage]) {
    it(`${page.name} has no critical or serious AXE violations`, async () => {
      expect(await blocking(page)).toEqual([]);
    });
  }
});
