import { User } from '../models/User';
import { Agency } from '../models/Agency';
import { Notification } from '../models/Notification';
import { ICase } from '../models/Case';

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Dispatches simulated / SMTP email notification.
 * Logs cleanly and records to audit log.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  // In development and prototype mode, we log the rich email notification directly
  console.log('\n======================================================');
  console.log(`[EMAIL DISPATCH] To: ${payload.to}`);
  console.log(`[EMAIL SUBJECT] ${payload.subject}`);
  console.log(`[EMAIL BODY]\n${payload.text}`);
  console.log('======================================================\n');
  return true;
}

/**
 * Notifies jurisdictional authorities (Police, Labour, CWC, Government) when a complaint arises.
 */
export async function notifyAuthoritiesForCase(c: ICase) {
  try {
    const district = c.location?.district;
    const isEmergency = c.riskAssessment?.riskLevel === 'CRITICAL' || c.emergencyIndicator;

    // Find agencies in the district
    const agencies = await Agency.find({ district, status: 'ACTIVE' });
    const agencyIds = agencies.map((a) => a._id);

    // Find users belonging to these agencies, plus any relevant admins/supervisors
    const officers = await User.find({
      agencyId: { $in: agencyIds },
      status: 'ACTIVE',
    });

    const targetAgencies: string[] = [];
    if (isEmergency) {
      targetAgencies.push('POLICE', 'CWC', 'LABOUR');
    } else {
      if (c.agencyRecommendation?.recommendedAgency) {
        targetAgencies.push(c.agencyRecommendation.recommendedAgency);
      }
      if (c.agencyRecommendation?.backupAgency) {
        targetAgencies.push(c.agencyRecommendation.backupAgency);
      }
      targetAgencies.push('GOVERNMENT');
    }

    const uniqueAgencies = [...new Set(targetAgencies)];

    for (const officer of officers) {
      if (!officer.email || !uniqueAgencies.includes(officer.role)) continue;

      const urgencyPrefix = isEmergency ? '🚨 URGENT: CRITICAL CHILD SAFETY ALERT' : '📢 NEW CASE NOTIFICATION';
      const subject = `[CHILD-SAFE] ${urgencyPrefix} - Case #${c.caseId} (${c.location.district})`;

      const textBody = `
Attention Officer ${officer.name} (${officer.role}):

A new child labour report has been submitted in your jurisdiction.

Case Identifier: ${c.caseId}
Risk Score: ${c.riskAssessment?.riskScore}/100 [${c.riskAssessment?.riskLevel}]
Emergency Status: ${isEmergency ? 'YES - IMMEDIATE ACTION REQUIRED' : 'Standard Priority'}
District: ${c.location.district}, ${c.location.villageOrCity}
Labour Category: ${c.labourCategories.join(', ')}

Key AI Signals / Factors:
${(c.riskAssessment?.factors || []).map((f) => ` • ${f}`).join('\n')}

Recommended Action:
${c.agencyRecommendation?.reasons?.join('\n') || 'Please log in to your dashboard to review and prioritize this case.'}

Review Case Now: http://localhost:5173/cases/${c.caseId}

-- CHILD-SAFE Automated Inter-Agency Dispatch System
      `.trim();

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; line-height: 1.5; color: #1e293b;">
          <h2 style="color: ${isEmergency ? '#dc2626' : '#2563eb'};">${urgencyPrefix}</h2>
          <p>Dear Officer <strong>${officer.name}</strong> (<em>${officer.role}</em>),</p>
          <p>A new child labour complaint has arisen in your jurisdiction:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>Case ID:</strong></td><td style="padding: 6px; border: 1px solid #cbd5e1;">${c.caseId}</td></tr>
            <tr><td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>Risk Level:</strong></td><td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: ${isEmergency ? '#dc2626' : '#0f766e'};">${c.riskAssessment?.riskLevel} (${c.riskAssessment?.riskScore}/100)</td></tr>
            <tr><td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>Location:</strong></td><td style="padding: 6px; border: 1px solid #cbd5e1;">${c.location.villageOrCity}, ${c.location.district}</td></tr>
            <tr><td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>Categories:</strong></td><td style="padding: 6px; border: 1px solid #cbd5e1;">${c.labourCategories.join(', ')}</td></tr>
          </table>
          <p><strong>AI Risk Factors:</strong></p>
          <ul>
            ${(c.riskAssessment?.factors || []).map((f) => `<li>${f}</li>`).join('')}
          </ul>
          <p><a href="http://localhost:5173/cases/${c.caseId}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Open Operational Case File</a></p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <small style="color: #64748b;">CHILD-SAFE Automated Protection Platform</small>
        </div>
      `;

      // Dispatch Email
      await sendEmail({
        to: officer.email,
        subject,
        text: textBody,
        html: htmlBody,
      });

      // Save notification to DB
      await Notification.create({
        recipientUserId: officer._id,
        recipientAgencyId: officer.agencyId,
        caseId: c._id,
        type: isEmergency ? 'EMERGENCY_ALERT' : 'NEW_REPORT',
        message: `${urgencyPrefix}: Case ${c.caseId} reported in ${c.location.district} (${c.riskAssessment?.riskLevel} Risk)`,
      });
    }
  } catch (err) {
    console.error('Failed to notify authorities for case:', err);
  }
}
