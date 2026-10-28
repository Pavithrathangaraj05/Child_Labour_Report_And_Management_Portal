import test from 'node:test';
import assert from 'node:assert/strict';
import { detectFile, sanitizeFilename } from './fileSignature';
import { generatePin, generateTrackingId, formatCaseId } from './crypto';

test('detects JPEG and PNG by magic bytes', () => {
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(16)]);
  assert.equal(detectFile(jpg)?.fileType, 'PHOTO');
  assert.equal(detectFile(png)?.mime, 'image/png');
});
test('rejects executables and scripts renamed as images', () => {
  assert.equal(detectFile(Buffer.from('MZ\x90\x00 fake exe bytes here....')), null);
  assert.equal(detectFile(Buffer.from('<script>alert(1)</script> padding')), null);
});
test('sanitizes filenames', () => {
  assert.equal(sanitizeFilename('../../etc/passwd'), 'passwd');
  assert.equal(sanitizeFilename('a<b>.jpg'), 'a_b_.jpg');
});
test('id generators have expected shape', () => {
  assert.match(generateTrackingId(), /^CS-[A-HJKMNP-Z2-9]{7}$/);
  assert.match(generatePin(), /^\d{6}$/);
  assert.equal(formatCaseId(2026, 1245), 'CL-2026-001245');
});
