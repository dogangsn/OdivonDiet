import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
  checkAttachment,
  formatBytes,
  partitionAttachments,
} from './attachment-rules';

describe('attachment rules', () => {
  it('accepts images and documents', () => {
    expect(checkAttachment({ name: 'ogle.jpg', type: 'image/jpeg', size: 2000 })).toEqual({
      ok: true,
      kind: 'image',
    });
    expect(checkAttachment({ name: 'tahlil.pdf', type: 'application/pdf', size: 2000 })).toEqual({
      ok: true,
      kind: 'file',
    });
  });

  it('falls back to the extension when the browser gives no type', () => {
    expect(checkAttachment({ name: 'IMG_1.HEIC', type: '', size: 10 })).toEqual({
      ok: true,
      kind: 'image',
    });
  });

  it('rejects empty, oversized and unsupported files', () => {
    expect(checkAttachment({ name: 'a.png', type: 'image/png', size: 0 }).ok).toBe(false);
    expect(
      checkAttachment({ name: 'a.png', type: 'image/png', size: MAX_ATTACHMENT_BYTES + 1 }).ok,
    ).toBe(false);
    expect(checkAttachment({ name: 'run.exe', type: 'application/x-msdownload', size: 5 }).ok).toBe(
      false,
    );
  });

  it('enforces the per-message limit', () => {
    const files = Array.from({ length: 4 }, (_, i) => ({
      name: `${i}.png`,
      type: 'image/png',
      size: 10,
    }));
    const result = partitionAttachments(files, MAX_ATTACHMENTS_PER_MESSAGE - 2);
    expect(result.accepted.length).toBe(2);
    expect(result.errors.length).toBe(1);
  });

  it('formats sizes for people', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1,5 MB');
  });
});
