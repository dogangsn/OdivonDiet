import { AttachmentKind } from './portal.models';

/** Upload limits, shared by chat, tasks and requests. MainAPI enforces the same values. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
export const DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/** Value for `<input type="file" accept>`. */
export const ACCEPTED_FILE_TYPES = [...IMAGE_TYPES, ...DOCUMENT_TYPES, '.heic'].join(',');

export interface FileCandidate {
  readonly name: string;
  readonly type: string;
  readonly size: number;
}

export type AttachmentCheck =
  | { readonly ok: true; readonly kind: AttachmentKind }
  | { readonly ok: false; readonly reason: string };

export function checkAttachment(file: FileCandidate): AttachmentCheck {
  const type = file.type || guessType(file.name);
  if (file.size === 0) return { ok: false, reason: `${file.name}: dosya boş.` };
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, reason: `${file.name}: en fazla ${formatBytes(MAX_ATTACHMENT_BYTES)} olabilir.` };
  }
  if (IMAGE_TYPES.includes(type)) return { ok: true, kind: 'image' };
  if (DOCUMENT_TYPES.includes(type)) return { ok: true, kind: 'file' };
  return { ok: false, reason: `${file.name}: bu dosya türü desteklenmiyor.` };
}

/** Validates a batch, keeping the per-message limit in mind. */
export function partitionAttachments<T extends FileCandidate>(
  files: readonly T[],
  alreadySelected: number,
): { accepted: Array<{ file: T; kind: AttachmentKind }>; errors: string[] } {
  const accepted: Array<{ file: T; kind: AttachmentKind }> = [];
  const errors: string[] = [];
  for (const file of files) {
    if (alreadySelected + accepted.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
      errors.push(`Bir mesaja en fazla ${MAX_ATTACHMENTS_PER_MESSAGE} dosya eklenebilir.`);
      break;
    }
    const check = checkAttachment(file);
    if (check.ok) accepted.push({ file, kind: check.kind });
    else errors.push(check.reason);
  }
  return { accepted, errors };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

function guessType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    heic: 'image/heic',
    pdf: 'application/pdf',
    txt: 'text/plain',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return map[ext] ?? '';
}
