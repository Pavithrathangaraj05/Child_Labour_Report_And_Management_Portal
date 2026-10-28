import { EventEmitter } from 'events';
import { queueManager } from './queue.service';
import { Notification } from '../models/Notification';
import { sendMail } from './mail.service';
import { User } from '../models/User';
import { Agency } from '../models/Agency';

export const eventBus = new EventEmitter();

// Setup Queue Workers
queueManager.registerWorker('notifications', async (job) => {
  const { eventType, payload } = job.data;
  console.log(`[WORKER] Processing notification job for event: ${eventType}`);

  // 1. Create In-App Notification if user/agency specified
  if (payload.recipientUserId || payload.recipientAgencyId) {
    await Notification.create({
      recipientUserId: payload.recipientUserId,
      recipientAgencyId: payload.recipientAgencyId,
      caseId: payload.caseDocId,
      type: eventType,
      message: payload.message || `Event ${eventType} occurred on case ${payload.caseId || ''}`,
    });
  }

  // 2. Dispatch Email if email provided or if recipient is a user with email
  if (payload.email && payload.emailSubject) {
    await sendMail({
      to: payload.email,
      subject: payload.emailSubject,
      text: payload.emailText || payload.message,
      html: payload.emailHtml || `<p>${payload.message}</p>`,
    });
  } else if (payload.recipientUserId) {
    const user = await User.findById(payload.recipientUserId);
    if (user && user.email) {
      await sendMail({
        to: user.email,
        subject: `[CHILD-SAFE] ${eventType}: Case ${payload.caseId || ''}`,
        text: payload.message,
        html: `<p>Dear ${user.name},</p><p>${payload.message}</p>`,
      });
    }
  }
});

queueManager.registerWorker('escalation-jobs', async (job) => {
  const { caseId, level, role } = job.data;
  console.log(`[WORKER] SLA Escalation Job: Case ${caseId} escalated to ${role} (Level ${level})`);
});

queueManager.registerWorker('scheduled-followups', async (job) => {
  const { caseId, interventionId, followUpDate } = job.data;
  console.log(`[WORKER] Scheduled Follow-up Job: Case ${caseId}, Date ${followUpDate}`);
});

// Event listener mappings
const MODULE3_EVENTS = [
  'CASE_CREATED',
  'CASE_VERIFIED',
  'CASE_ASSIGNED',
  'RISK_ESCALATED',
  'SLA_WARNING',
  'SLA_BREACH',
  'EMERGENCY_DETECTED',
  'RESCUE_COMPLETED',
  'REHABILITATION_UPDATE',
  'FOLLOW_UP_DUE',
  'REPEAT_OFFENCE_DETECTED',
  'CASE_CLOSED',
];

for (const eventName of MODULE3_EVENTS) {
  eventBus.on(eventName, (eventData: any) => {
    // Enqueue asynchronously to avoid blocking callers
    queueManager.add('notifications', {
      eventType: eventName,
      payload: eventData,
    });

    if (eventName === 'RISK_ESCALATED') {
      queueManager.add('escalation-jobs', eventData);
    }
    if (eventName === 'FOLLOW_UP_DUE') {
      queueManager.add('scheduled-followups', eventData);
    }
  });
}
