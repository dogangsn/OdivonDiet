/**
 * MainAPI endpoints for the member portal and messaging. The in-memory stores
 * (`PortalStore`, `MemberPortal`) call these paths' equivalents today; swap each mutation
 * for an HTTP call when the backend ships.
 *
 * Authorization (enforced by MainAPI, mirrored in the client):
 * - Firebase ID token carries custom claims `role` ("dietitian" | "member") and, for members,
 *   `clientId`. MainAPI sets them when the dietitian invites a client.
 * - `/portal/*` routes ignore any client id in the request and use the token's `clientId`.
 * - Members never receive consultation `notes` or draft plans.
 * - Attachments are stored privately; downloads go through short-lived signed URLs.
 */
export const PORTAL_API = {
  // Dietitian side
  invite: (clientId: string) => `/api/v1/diet/clients/${clientId}/portal/invite`,
  disable: (clientId: string) => `/api/v1/diet/clients/${clientId}/portal/disable`,
  conversations: '/api/v1/diet/conversations',
  messages: (clientId: string) => `/api/v1/diet/conversations/${clientId}/messages`,
  markRead: (clientId: string) => `/api/v1/diet/conversations/${clientId}/read`,
  tasks: (clientId: string) => `/api/v1/diet/clients/${clientId}/tasks`,
  task: (taskId: string) => `/api/v1/diet/tasks/${taskId}`,
  requests: '/api/v1/diet/requests',
  request: (requestId: string) => `/api/v1/diet/requests/${requestId}`,
  attachments: '/api/v1/diet/attachments',

  // Member side (scoped to the token's clientId)
  me: '/api/v1/diet/portal/me',
  myPlans: '/api/v1/diet/portal/plans',
  myMeasurements: '/api/v1/diet/portal/measurements',
  myConsultations: '/api/v1/diet/portal/consultations',
  myMessages: '/api/v1/diet/portal/messages',
  myRead: '/api/v1/diet/portal/messages/read',
  myTasks: '/api/v1/diet/portal/tasks',
  completeTask: (taskId: string) => `/api/v1/diet/portal/tasks/${taskId}/complete`,
  myRequests: '/api/v1/diet/portal/requests',
  myConsent: '/api/v1/diet/portal/consent',
  myAttachments: '/api/v1/diet/portal/attachments',
} as const;
