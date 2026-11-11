import { createSeed } from './diet-seed';
import type { DietData } from './diet-store';
import { createPortalSeed } from './portal-seed';
import { PortalData, memberClientId } from './portal-store';
import { SAMPLE_WORKSPACE, loadWorkspacePart, savedWorkspaces } from './workspace';

/**
 * Member login without Firebase: finds the practice that invited this e-mail address.
 * Registered practices on this device are searched first, then the demo practice.
 */
export function findLocalMember(email: string): { clientId: string; workspace: string } | null {
  for (const workspace of savedWorkspaces()) {
    const diet = loadWorkspacePart<DietData>(workspace, 'diet');
    const portal = loadWorkspacePart<PortalData>(workspace, 'portal');
    if (!diet?.clients || !portal?.access) continue;
    const clientId = memberClientId(email, diet.clients, portal.access);
    if (clientId) return { clientId, workspace };
  }
  const now = new Date();
  const clientId = memberClientId(email, createSeed(now).clients, createPortalSeed(now).access);
  return clientId ? { clientId, workspace: SAMPLE_WORKSPACE } : null;
}
