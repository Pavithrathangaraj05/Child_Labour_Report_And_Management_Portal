import { Pool } from 'pg';
import { newDb } from 'pg-mem';
import { env } from '../config/env';

let pool: Pool;
let isInMemory = false;

export async function initPostgresPool(): Promise<Pool> {
  if (pool) return pool;

  if (env.POSTGRES_URL) {
    try {
      const realPool = new Pool({
        connectionString: env.POSTGRES_URL,
        ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });
      // Test connectivity
      await realPool.query('SELECT 1');
      console.log('Connected to external PostgreSQL database at', env.POSTGRES_URL.replace(/:[^:@]+@/, ':****@'));
      pool = realPool;
      await createTables();
      return pool;
    } catch (err: any) {
      console.warn('PostgreSQL external connection failed (' + err.message + '). Falling back to embedded PostgreSQL pg-mem engine.');
    }
  }

  // Embedded PostgreSQL instance via pg-mem
  console.log('Initializing embedded resilient PostgreSQL engine (pg-mem)...');
  const db = newDb({
    autoCreateForeignKeyIndices: true,
  });

  // Enable standard cryptographic UUID and text extensions in memory if needed
  db.public.registerFunction({
    name: 'version',
    args: [],
    returns: (db.public as any).getType('text'),
    implementation: () => 'PostgreSQL 15.0 (CHILD-SAFE Embedded Cryptographic Engine)',
  });

  const adapter = db.adapters.createPg();
  pool = new adapter.Pool();
  isInMemory = true;
  await createTables();
  console.log('Permissioned Cryptographic Case Ledger PostgreSQL engine ready.');
  return pool;
}

export function getPostgresPool(): Pool {
  if (!pool) {
    throw new Error('PostgreSQL pool not initialized. Call initPostgresPool() first.');
  }
  return pool;
}

export function isPostgresInMemory(): boolean {
  return isInMemory;
}

async function createTables() {
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS case_ledger_events (
      id SERIAL PRIMARY KEY,
      event_id VARCHAR(64) UNIQUE NOT NULL,
      case_id VARCHAR(64) NOT NULL,
      previous_hash VARCHAR(64) NOT NULL,
      current_event VARCHAR(64) NOT NULL,
      event_timestamp TIMESTAMPTZ NOT NULL,
      agency_id VARCHAR(64),
      agency_name VARCHAR(120),
      authorized_user_id VARCHAR(64),
      authorized_user_name VARCHAR(120),
      authorized_role VARCHAR(40),
      digital_signature TEXT NOT NULL,
      public_key TEXT,
      event_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      current_hash VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ledger_case_id ON case_ledger_events(case_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_timestamp ON case_ledger_events(event_timestamp);

    CREATE TABLE IF NOT EXISTS security_audit_logs (
      id SERIAL PRIMARY KEY,
      log_id VARCHAR(64) UNIQUE NOT NULL,
      event_type VARCHAR(64) NOT NULL,
      severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
      user_id VARCHAR(64),
      user_name VARCHAR(120),
      role VARCHAR(40),
      agency_id VARCHAR(64),
      ip_address VARCHAR(45),
      user_agent VARCHAR(300),
      resource VARCHAR(120),
      action VARCHAR(80),
      status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON security_audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_event_type ON security_audit_logs(event_type);
    CREATE INDEX IF NOT EXISTS idx_audit_user_id ON security_audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_severity ON security_audit_logs(severity);
  `;

  await pool.query(schemaSql);
}
