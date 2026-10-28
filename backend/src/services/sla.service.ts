import { Case, ICase, ISlaRecord } from '../models/Case';
import { RiskLevel, SLA_RULES } from '../config/constants';
import { eventBus } from './eventBus.service';

const ESCALATION_HIERARCHY = [
  { level: 1, role: 'SUPERVISOR', trigger: 'WARNING_OR_INITIAL_BREACH' },
  { level: 2, role: 'DISTRICT_OFFICER', trigger: 'EXTENDED_BREACH' },
  { level: 3, role: 'DEPARTMENT_AUTHORITY', trigger: 'CRITICAL_UNRESOLVED_BREACH' },
];

export function createSlaRecord(riskLevel: RiskLevel, baseTime: Date = new Date()): ISlaRecord {
  const rule = SLA_RULES[riskLevel] || SLA_RULES.MEDIUM;
  const deadline = new Date(baseTime.getTime() + rule.targetHours * 3600 * 1000);

  return {
    ruleName: `${riskLevel}_RESPONSE_SLA`,
    targetHours: rule.targetHours,
    deadline,
    status: 'ON_TIME',
    warningThresholdMinutes: rule.warningMinutes,
    escalationLevel: 0,
    escalations: [],
  };
}

export function evaluateSlaStatus(sla: ISlaRecord, now: Date = new Date()): {
  status: 'ON_TIME' | 'WARNING' | 'BREACHED';
  remainingMs: number;
  remainingHours: number;
} {
  const remainingMs = sla.deadline.getTime() - now.getTime();
  const warningWindowMs = (sla.warningThresholdMinutes || 30) * 60 * 1000;

  let status: 'ON_TIME' | 'WARNING' | 'BREACHED' = 'ON_TIME';
  if (remainingMs <= 0) {
    status = 'BREACHED';
  } else if (remainingMs <= warningWindowMs) {
    status = 'WARNING';
  }

  return {
    status,
    remainingMs,
    remainingHours: +(remainingMs / (3600 * 1000)).toFixed(2),
  };
}

/**
 * Scan active cases, evaluate SLAs, and trigger automated escalations.
 */
export async function processSlaEscalations(): Promise<{
  warningsTriggered: number;
  breachesTriggered: number;
  escalationsRecorded: number;
}> {
  const activeCases = await Case.find({
    status: { $nin: ['CLOSED', 'RESCUED_PROTECTED'] },
    sla: { $exists: true, $ne: null },
  });

  const now = new Date();
  let warningsTriggered = 0;
  let breachesTriggered = 0;
  let escalationsRecorded = 0;

  for (const c of activeCases) {
    if (!c.sla) continue;

    const evalResult = evaluateSlaStatus(c.sla, now);
    const oldStatus = c.sla.status;
    let modified = false;

    // 1. Status transition check
    if (evalResult.status !== oldStatus) {
      c.sla.status = evalResult.status;
      modified = true;

      if (evalResult.status === 'WARNING') {
        warningsTriggered++;
        eventBus.emit('SLA_WARNING', {
          caseId: c.caseId,
          riskLevel: c.riskAssessment?.riskLevel,
          remainingMs: evalResult.remainingMs,
          deadline: c.sla.deadline,
        });
      } else if (evalResult.status === 'BREACHED') {
        breachesTriggered++;
        c.sla.breachedAt = now;
        eventBus.emit('SLA_BREACH', {
          caseId: c.caseId,
          riskLevel: c.riskAssessment?.riskLevel,
          deadline: c.sla.deadline,
          breachedAt: now,
        });
      }
    }

    // 2. Escalation Ladder
    // Level 1: Warning threshold reached
    if (evalResult.status === 'WARNING' && c.sla.escalationLevel < 1) {
      c.sla.escalationLevel = 1;
      c.sla.escalations.push({
        level: 1,
        escalatedToRole: 'SUPERVISOR',
        escalatedAt: now,
        reason: 'SLA response deadline is approaching warning threshold.',
      });
      c.timeline.push({
        stage: 'SLA_WARNING_ESCALATED',
        timestamp: now,
        details: 'Case escalated to Supervisor due to nearing response deadline SLA.',
      });
      escalationsRecorded++;
      modified = true;
      eventBus.emit('RISK_ESCALATED', { caseId: c.caseId, level: 1, role: 'SUPERVISOR' });
    }
    // Level 2: Breached
    else if (evalResult.status === 'BREACHED' && c.sla.escalationLevel < 2) {
      c.sla.escalationLevel = 2;
      c.sla.escalations.push({
        level: 2,
        escalatedToRole: 'DISTRICT_OFFICER',
        escalatedAt: now,
        reason: 'SLA response deadline has been BREACHED. Immediate district intervention required.',
      });
      c.timeline.push({
        stage: 'SLA_BREACH_ESCALATED',
        timestamp: now,
        details: 'Case escalated to District Officer following SLA breach.',
      });
      escalationsRecorded++;
      modified = true;
      eventBus.emit('RISK_ESCALATED', { caseId: c.caseId, level: 2, role: 'DISTRICT_OFFICER' });
    }

    if (modified) {
      await c.save();
    }
  }

  return { warningsTriggered, breachesTriggered, escalationsRecorded };
}
