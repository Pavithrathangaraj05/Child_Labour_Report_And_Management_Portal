import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';

export interface StorageDriver {
  save(buffer: Buffer, ext: string): Promise<string>;
  saveEncrypted(buffer: Buffer, ext: string): Promise<string>;
  read(storageReference: string): Promise<Buffer>;
  readEncrypted(storageReference: string): Promise<Buffer>;
}

// Derive a deterministic 32-byte key for AES-256 from JWT_ACCESS_SECRET or custom env
const ENCRYPTION_KEY = crypto.createHash('sha256').update(process.env.EVIDENCE_ENCRYPTION_KEY || env.JWT_ACCESS_SECRET || 'childsafe_evidence_secret_key_32').digest();

class LocalDiskStorage implements StorageDriver {
  private root = path.resolve(env.UPLOAD_DIR);

  private resolvePath(storageReference: string): string {
    const cleanRef = storageReference.replace(/^local:/, '');
    return path.join(this.root, cleanRef);
  }

  async save(buffer: Buffer, ext: string): Promise<string> {
    const sub = String(new Date().getFullYear());
    const name = `${crypto.randomBytes(24).toString('hex')}.${ext}`;
    await fs.mkdir(path.join(this.root, sub), { recursive: true, mode: 0o700 });
    await fs.writeFile(path.join(this.root, sub, name), buffer, { flag: 'wx', mode: 0o600 });
    return `local:${sub}/${name}`;
  }

  async saveEncrypted(buffer: Buffer, ext: string): Promise<string> {
    const sub = `${String(new Date().getFullYear())}/encrypted`;
    const name = `${crypto.randomBytes(24).toString('hex')}.${ext}.enc`;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Pack: [IV (12 bytes)][Tag (16 bytes)][Encrypted Data]
    const payload = Buffer.concat([iv, tag, encrypted]);

    await fs.mkdir(path.join(this.root, sub), { recursive: true, mode: 0o700 });
    await fs.writeFile(path.join(this.root, sub, name), payload, { flag: 'wx', mode: 0o600 });
    return `local:${sub}/${name}`;
  }

  async read(storageReference: string): Promise<Buffer> {
    const filePath = this.resolvePath(storageReference);
    return await fs.readFile(filePath);
  }

  async readEncrypted(storageReference: string): Promise<Buffer> {
    const filePath = this.resolvePath(storageReference);
    const payload = await fs.readFile(filePath);

    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encryptedData = payload.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  }
}

export const storage: StorageDriver = new LocalDiskStorage();
