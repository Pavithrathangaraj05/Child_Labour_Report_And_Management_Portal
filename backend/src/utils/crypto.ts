import crypto from 'crypto';

// Unambiguous alphabet (no 0/O, 1/I/L) so IDs can be read aloud or typed from paper.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function randomCode(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;
}
export const generateTrackingId = () => `CS-${randomCode(7)}`;
export const generatePin = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
export const sha256 = (data: string | Buffer) => crypto.createHash('sha256').update(data).digest('hex');
export const randomToken = (bytes = 48) => crypto.randomBytes(bytes).toString('base64url');
export const formatCaseId = (year: number, seq: number) => `CL-${year}-${String(seq).padStart(6, '0')}`;
