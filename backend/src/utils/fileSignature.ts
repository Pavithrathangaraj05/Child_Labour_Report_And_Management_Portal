import { EVIDENCE_FILE_TYPES } from '../config/constants';

export type DetectedFile = { mime: string; ext: string; fileType: (typeof EVIDENCE_FILE_TYPES)[number] };

const ascii = (b: Buffer, start: number, len: number) => b.subarray(start, start + len).toString('latin1');

/**
 * Detects the real file type from magic bytes. The client-supplied MIME type / extension is never trusted.
 * Only a deliberately small allow-list is accepted in Module 1.
 */
export function detectFile(b: Buffer): DetectedFile | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg', fileType: 'PHOTO' };
  if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG') return { mime: 'image/png', ext: 'png', fileType: 'PHOTO' };
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return { mime: 'image/webp', ext: 'webp', fileType: 'PHOTO' };
  if (ascii(b, 0, 4) === '%PDF') return { mime: 'application/pdf', ext: 'pdf', fileType: 'DOCUMENT' };
  if (ascii(b, 4, 4) === 'ftyp') {
    const brand = ascii(b, 8, 4);
    if (brand === 'M4A ' || brand === 'M4B ') return { mime: 'audio/mp4', ext: 'm4a', fileType: 'AUDIO' };
    if (brand === 'qt  ') return { mime: 'video/quicktime', ext: 'mov', fileType: 'VIDEO' };
    return { mime: 'video/mp4', ext: 'mp4', fileType: 'VIDEO' };
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { mime: 'video/webm', ext: 'webm', fileType: 'VIDEO' };
  if (ascii(b, 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { mime: 'audio/mpeg', ext: 'mp3', fileType: 'AUDIO' };
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WAVE') return { mime: 'audio/wav', ext: 'wav', fileType: 'AUDIO' };
  if (ascii(b, 0, 4) === 'OggS') return { mime: 'audio/ogg', ext: 'ogg', fileType: 'AUDIO' };
  return null;
}

/** Keeps only a safe basename; strips paths, control characters and exotic punctuation. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file';
  const cleaned = base.replace(/[^\w.\- ]+/g, '_').replace(/\.{2,}/g, '.').trim().slice(0, 100);
  return cleaned || 'file';
}
