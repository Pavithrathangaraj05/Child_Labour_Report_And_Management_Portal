import crypto from 'crypto';
import { getPostgresPool } from '../config/postgres';

export type SecuritySeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface SecurityLogInput {
  eventType: string;
  severity?: SecuritySeverity;
  userId?: string;
  userName?: string;
  role?: string;
  agencyId?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  status?: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  metadata?: Record<string, any>;
}

export interface SecurityLogFilter {
  startDate?: string;
  endDate?: string;
  userId?: string;
  agencyId?: string;
  eventType?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}

export async function logSecurityEvent(input: SecurityLogInput) {
  try {
    const pool = getPostgresPool();
    const logId = `SEC-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const insertSql = `
      INSERT INTO security_audit_logs (
        log_id, event_type, severity, user_id, user_name, role,
        agency_id, ip_address, user_agent, resource, action,
        status, metadata, timestamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, CURRENT_TIMESTAMP
      )
    `;

    const values = [
      logId,
      input.eventType,
      input.severity || 'INFO',
      input.userId || null,
      input.userName || null,
      input.role || null,
      input.agencyId || null,
      input.ip || null,
      input.userAgent ? input.userAgent.slice(0, 300) : null,
      input.resource || null,
      input.action || null,
      input.status || 'SUCCESS',
      JSON.stringify(input.metadata || {}),
    ];

    await pool.query(insertSql, values);
  } catch (err: any) {
    console.error('[SECURITY AUDIT LOG ERROR]', err.message);
  }
}

export async function querySecurityLogs(filters: SecurityLogFilter) {
  const pool = getPostgresPool();
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (filters.eventType) {
    conditions.push(`event_type = $${paramIdx++}`);
    params.push(filters.eventType);
  }
  if (filters.severity) {
    conditions.push(`severity = $${paramIdx++}`);
    params.push(filters.severity);
  }
  if (filters.userId) {
    conditions.push(`user_id = $${paramIdx++}`);
    params.push(filters.userId);
  }
  if (filters.agencyId) {
    conditions.push(`agency_id = $${paramIdx++}`);
    params.push(filters.agencyId);
  }
  if (filters.startDate) {
    conditions.push(`timestamp >= $${paramIdx++}`);
    params.push(new Date(filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(`timestamp <= $${paramIdx++}`);
    params.push(new Date(filters.endDate));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ? Math.min(filters.limit, 200) : 50;
  const offset = filters.offset || 0;

  const countSql = `SELECT COUNT(*) FROM security_audit_logs ${whereClause}`;
  const countRes = await pool.query(countSql, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const querySql = `
    SELECT * FROM security_audit_logs
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;
  const listRes = await pool.query(querySql, [...params, limit, offset]);

  // Aggregated security indicators
  const statsSql = `
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'LOGIN_FAILURE') as failed_logins,
      COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_events,
      COUNT(*) FILTER (WHERE event_type LIKE '%EVIDENCE%') as evidence_access_count,
      COUNT(*) FILTER (WHERE event_type = 'MFA_STEP_UP') as step_up_count,
      COUNT(*) FILTER (WHERE event_type = 'SUSPICIOUS_ACCESS') as suspicious_count
    FROM security_audit_logs
    WHERE timestamp >= NOW() - INTERVAL '24 hours'
  `;
  const statsRes = await pool.query(statsSql);
  const stats = statsRes.rows[0] || {};

  return {
    total,
    items: listRes.rows.map((r) => ({
      id: r.id,
      logId: r.log_id,
      eventType: r.event_type,
      severity: r.severity,
      userId: r.user_id,
      userName: r.user_name,
      role: r.role,
      agencyId: r.agency_id,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      resource: r.resource,
      action: r.action,
      status: r.status,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {}),
      timestamp: r.timestamp,
    })),
    stats: {
      failedLogins24h: parseInt(stats.failed_logins || '0', 10),
      criticalEvents24h: parseInt(stats.critical_events || '0', 10),
      evidenceAccess24h: parseInt(stats.evidence_access_count || '0', 10),
      stepUpCount24h: parseInt(stats.step_up_count || '0', 10),
      suspiciousCount24h: parseInt(stats.suspicious_count || '0', 10),
    },
  };
}
