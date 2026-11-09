import { Tone } from './diet.models';

/** Who is signed in. Dietitians use the workspace, members (clients) use the portal. */
export type UserRole = 'dietitian' | 'member';

/** Sender of a chat message. `system` is used for automatic notices (task done, request status). */
export type MessageAuthor = 'dietitian' | 'member' | 'system';

export type AttachmentKind = 'image' | 'file';

export interface Attachment {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly kind: AttachmentKind;
  /** Download / preview URL. In demo mode this is a local object URL. */
  readonly url: string;
}

/** A chat message. There is one conversation per client, keyed by `clientId`. */
export interface Message {
  readonly id: string;
  readonly clientId: string;
  readonly author: MessageAuthor;
  readonly authorName: string;
  readonly body: string;
  readonly at: string;
  readonly attachments: readonly Attachment[];
  /** Set when the message announces a task, so the chat can render the live task card. */
  readonly taskId?: string;
  /** Set when the message is about a member request. */
  readonly requestId?: string;
}

/** Last time each side opened a conversation; drives unread counts. */
export interface ReadMarker {
  readonly clientId: string;
  readonly dietitianReadAt: string | null;
  readonly memberReadAt: string | null;
}

export type TaskCategory = 'meal_log' | 'measurement' | 'water' | 'exercise' | 'photo' | 'other';
export type TaskStatus = 'open' | 'done';

/** Something the dietitian asks the member to do, e.g. "send a photo of today's lunch". */
export interface CareTask {
  readonly id: string;
  readonly clientId: string;
  readonly title: string;
  readonly description: string;
  readonly category: TaskCategory;
  readonly dueDate: string | null;
  readonly status: TaskStatus;
  readonly createdAt: string;
  readonly completedAt: string | null;
  readonly completionNote: string;
  readonly attachments: readonly Attachment[];
}

export type RequestType = 'appointment' | 'plan_change' | 'question' | 'document' | 'other';
export type RequestStatus = 'open' | 'in_progress' | 'resolved' | 'rejected';

/** A request the member raises from the portal (new appointment, plan change, report…). */
export interface MemberRequest {
  readonly id: string;
  readonly clientId: string;
  readonly type: RequestType;
  readonly subject: string;
  readonly detail: string;
  readonly status: RequestStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly response: string;
  readonly attachments: readonly Attachment[];
}

export type PortalAccessStatus = 'none' | 'invited' | 'active' | 'disabled';

/** Portal login for a client. The client's e-mail is the login name. */
export interface PortalAccess {
  readonly clientId: string;
  readonly status: PortalAccessStatus;
  readonly invitedAt: string | null;
  readonly activatedAt: string | null;
}

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  meal_log: 'Öğün kaydı',
  measurement: 'Ölçüm',
  water: 'Su takibi',
  exercise: 'Egzersiz',
  photo: 'Fotoğraf',
  other: 'Diğer',
};

export const TASK_CATEGORY_ICONS: Record<TaskCategory, string> = {
  meal_log: 'restaurant',
  measurement: 'monitor_weight',
  water: 'water_drop',
  exercise: 'directions_run',
  photo: 'photo_camera',
  other: 'checklist',
};

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  appointment: 'Randevu talebi',
  plan_change: 'Plan değişikliği',
  question: 'Soru',
  document: 'Rapor / belge',
  other: 'Diğer',
};

export const REQUEST_TYPE_ICONS: Record<RequestType, string> = {
  appointment: 'event',
  plan_change: 'restaurant_menu',
  question: 'help',
  document: 'description',
  other: 'inbox',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  open: 'Yeni',
  in_progress: 'İnceleniyor',
  resolved: 'Sonuçlandı',
  rejected: 'Reddedildi',
};

export const REQUEST_STATUS_TONES: Record<RequestStatus, Tone> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'positive',
  rejected: 'neutral',
};

export const PORTAL_ACCESS_LABELS: Record<PortalAccessStatus, string> = {
  none: 'Portal erişimi yok',
  invited: 'Davet gönderildi',
  active: 'Portal aktif',
  disabled: 'Erişim kapalı',
};
