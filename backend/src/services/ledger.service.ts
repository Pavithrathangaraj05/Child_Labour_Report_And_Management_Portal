import crypto from 'crypto';
import { getPostgresPool } from '../config/postgres';

// System Root RSA Keypair for State Transition Ledger Provenance
let keyPair: crypto.KeyPairSyncResult<string, string>;

function ensureKeys() {
  if (!keyPair) {
    keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
  }
  return keyPair;
}

export interface LedgerEventInput {
  caseId: string;
  eventType: string;
  timestamp?: Date;
  agencyId?: string;
  agencyName?: string;
  userId?: string;
  userName?: string;
  role?: string;
  metadata?: Record<string, any>;
}

export interface LedgerRecord {
  id: number;
  eventId: string;
  caseId: string;
  previousHash: string;
  currentEvent: string;
  timestamp: string;
  agencyId: string | null;
  agencyName: string | null;
  authorizedUserId: string | null;
  authorizedUserName: string | null;
  authorizedRole: string | null;
  digitalSignature: string;
  publicKey: string;
  metadata: Record<string, any>;
  currentHash: string;
  createdAt: string;
}

export interface VerificationResult {
  verified: boolean;
  tamperDetected: boolean;
  totalEvents: number;
  genesisHash: string | null;
  headHash: string | null;
  brokenLinkIndex?: number;
  signatureFailureIndex?: number;
  details: string;
  events: LedgerRecord[];
}

export const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Standard SHA-256 payload calculation for ledger chaining
 */
export function calculateEventHash(
  caseId: string,
  previousHash: string,
  eventType: string,
  isoTimestamp: string,
  agencyId: string | null,
  userId: string | null,
  metadata: Record<string, any>
): string {
  // Deterministic JSON stringification of metadata
  const sortedMetadataKeys = Object.keys(metadata || {}).sort();
  const normalizedMetadata: Record<string, any> = {};
  for (const k of sortedMetadataKeys) {
    normalizedMetadata[k] = metadata[k];
  }

  const payload = [
    caseId,
    previousHash,
    eventType,
    isoTimestamp,
    agencyId || '',
    userId || '',
    JSON.stringify(normalizedMetadata),
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Digital signature using RSA-SHA256 asymmetric cryptography
 */
export function signHash(hash: string): { signature: string; publicKey: string } {
  const { privateKey, publicKey } = ensureKeys();
  const sign = crypto.createSign('SHA256');
  sign.update(hash);
  sign.end();
  const signature = sign.sign(privateKey, 'hex');
  return { signature, publicKey };
}

/**
 * Verify RSA signature
 */
export function verifySignature(hash: string, signature: string, publicKey: string): boolean {
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(hash);
    verify.end();
    return verify.verify(publicKey, signature, 'hex');
  } catch (e) {
    return false;
  }
}

/**
 * Appends an event to the permissioned cryptographic ledger in PostgreSQL
 */
export async function appendLedgerEvent(input: LedgerEventInput): Promise<LedgerRecord> {
  const pool = getPostgresPool();
  const caseId = input.caseId.toUpperCase();
  const eventTime = input.timestamp || new Date();
  const isoTime = eventTime.toISOString();
  const eventId = `EVT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const metadata = input.metadata || {};

  // 1. Fetch latest previous hash for this case
  const prevRes = await pool.query(
    'SELECT current_hash FROM case_ledger_events WHERE case_id = $1 ORDER BY id DESC LIMIT 1',
    [caseId]
  );

  const previousHash = prevRes.rows.length > 0 ? prevRes.rows[0].current_hash : GENESIS_PREV_HASH;

  // 2. Compute SHA-256 current hash
  const currentHash = calculateEventHash(
    caseId,
    previousHash,
    input.eventType,
    isoTime,
    input.agencyId || null,
    input.userId || null,
    metadata
  );

  // 3. Cryptographically sign the state transition
  const { signature, publicKey } = signHash(currentHash);

  // 4. Append to PostgreSQL
  const insertSql = `
    INSERT INTO case_ledger_events (
      event_id, case_id, previous_hash, current_event, event_timestamp,
      agency_id, agency_name, authorized_user_id, authorized_user_name,
      authorized_role, digital_signature, public_key, event_metadata,
      current_hash, created_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, $13,
      $14, CURRENT_TIMESTAMP
    ) RETURNING *
  `;

  const values = [
    eventId,
    caseId,
    previousHash,
    input.eventType,
    isoTime,
    input.agencyId || null,
    input.agencyName || null,
    input.userId || null,
    input.userName || null,
    input.role || null,
    signature,
    publicKey,
    JSON.stringify(metadata),
    currentHash,
  ];

  const result = await pool.query(insertSql, values);
  const row = result.rows[0];

  return {
    id: row.id,
    eventId: row.event_id,
    caseId: row.case_id,
    previousHash: row.previous_hash,
    currentEvent: row.current_event,
    timestamp: row.event_timestamp ? new Date(row.event_timestamp).toISOString() : isoTime,
    agencyId: row.agency_id,
    agencyName: row.agency_name,
    authorizedUserId: row.authorized_user_id,
    authorizedUserName: row.authorized_user_name,
    authorizedRole: row.authorized_role,
    digitalSignature: row.digital_signature,
    publicKey: row.public_key,
    metadata: typeof row.event_metadata === 'string' ? JSON.parse(row.event_metadata) : (row.event_metadata || {}),
    currentHash: row.current_hash,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : isoTime,
  };
}

/**
 * Reads all ledger events for a case
 */
export async function getCaseLedger(caseId: string): Promise<LedgerRecord[]> {
  const pool = getPostgresPool();
  const res = await pool.query(
    'SELECT * FROM case_ledger_events WHERE case_id = $1 ORDER BY id ASC',
    [caseId.toUpperCase()]
  );

  return res.rows.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    caseId: row.case_id,
    previousHash: row.previous_hash,
    currentEvent: row.current_event,
    timestamp: row.event_timestamp ? new Date(row.event_timestamp).toISOString() : new Date().toISOString(),
    agencyId: row.agency_id,
    agencyName: row.agency_name,
    authorizedUserId: row.authorized_user_id,
    authorizedUserName: row.authorized_user_name,
    authorizedRole: row.authorized_role,
    digitalSignature: row.digital_signature,
    publicKey: row.public_key,
    metadata: typeof row.event_metadata === 'string' ? JSON.parse(row.event_metadata) : (row.event_metadata || {}),
    currentHash: row.current_hash,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  }));
}

/**
 * Independently recomputes every block hash and verifies digital signatures
 */
export async function verifyCaseLedger(caseId: string): Promise<VerificationResult> {
  const events = await getCaseLedger(caseId);

  if (events.length === 0) {
    return {
      verified: true,
      tamperDetected: false,
      totalEvents: 0,
      genesisHash: null,
      headHash: null,
      details: 'No ledger events recorded yet for this case.',
      events: [],
    };
  }

  let expectedPrevHash = GENESIS_PREV_HASH;

  for (let i = 0; i < events.length; i++) {
    const evt = events[i];

    // 1. Check previous hash linkage
    if (evt.previousHash !== expectedPrevHash) {
      return {
        verified: false,
        tamperDetected: true,
        totalEvents: events.length,
        genesisHash: events[0].currentHash,
        headHash: events[events.length - 1].currentHash,
        brokenLinkIndex: i,
        details: `Hash chain linkage broken at event #${i + 1} (${evt.currentEvent}). Expected previous hash ${expectedPrevHash.slice(0, 16)}..., found ${evt.previousHash.slice(0, 16)}...`,
        events,
      };
    }

    // 2. Recompute current hash
    const recomputedHash = calculateEventHash(
      evt.caseId,
      evt.previousHash,
      evt.currentEvent,
      evt.timestamp,
      evt.agencyId,
      evt.authorizedUserId,
      evt.metadata
    );

    if (recomputedHash !== evt.currentHash) {
      return {
        verified: false,
        tamperDetected: true,
        totalEvents: events.length,
        genesisHash: events[0].currentHash,
        headHash: events[events.length - 1].currentHash,
        brokenLinkIndex: i,
        details: `Data integrity violation at event #${i + 1} (${evt.currentEvent}). Recomputed SHA-256 does not match recorded block hash.`,
        events,
      };
    }

    // 3. Verify cryptographic digital signature
    const sigValid = verifySignature(evt.currentHash, evt.digitalSignature, evt.publicKey);
    if (!sigValid) {
      return {
        verified: false,
        tamperDetected: true,
        totalEvents: events.length,
        genesisHash: events[0].currentHash,
        headHash: events[events.length - 1].currentHash,
        signatureFailureIndex: i,
        details: `Digital signature verification failed for event #${i + 1} (${evt.currentEvent}). Signature cannot be verified with the corresponding public key.`,
        events,
      };
    }

    expectedPrevHash = evt.currentHash;
  }

  return {
    verified: true,
    tamperDetected: false,
    totalEvents: events.length,
    genesisHash: events[0].currentHash,
    headHash: events[events.length - 1].currentHash,
    details: `All ${events.length} cryptographic chain blocks and digital signatures successfully verified. Integrity intact.`,
    events,
  };
}

/**
 * Tamper simulation helper for demonstration and verification testing
 */
export async function simulateTamperLedger(caseId: string, eventIndex = 0): Promise<boolean> {
  const pool = getPostgresPool();
  const events = await getCaseLedger(caseId);
  if (!events[eventIndex]) return false;

  const target = events[eventIndex];
  const tamperedMetadata = { ...target.metadata, tamperedAt: new Date().toISOString(), unauthorizedModification: true };

  await pool.query(
    'UPDATE case_ledger_events SET event_metadata = $1 WHERE id = $2',
    [JSON.stringify(tamperedMetadata), target.id]
  );

  return true;
}
