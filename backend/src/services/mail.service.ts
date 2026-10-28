import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;
let isEthereal = false;

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter;

  const service = process.env.SMTP_SERVICE;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    if (service?.toLowerCase() === 'gmail' || user.toLowerCase().endsWith('@gmail.com') || host?.toLowerCase().includes('gmail')) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
      console.log(`[MAIL SERVICE] Configured Gmail SMTP transport for ${user}.`);
    } else if (host) {
      const port = Number(process.env.SMTP_PORT) || 587;
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;
      transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      console.log(`[MAIL SERVICE] Configured SMTP transport (${host}:${port}, secure=${secure}).`);
    } else if (service) {
      transporter = nodemailer.createTransport({
        service,
        auth: { user, pass },
      });
      console.log(`[MAIL SERVICE] Configured SMTP service (${service}) for ${user}.`);
    }
  }

  if (!transporter) {
    // Fast local transport for dev mode: never hangs on external network calls
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    console.log('[MAIL SERVICE] No production SMTP configured in .env. Using Local transport.');
    console.log('[MAIL SERVICE] To deliver real OTP emails to inboxes, set SMTP_USER and SMTP_PASS in backend/.env');
  }

  return transporter;
}

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail(opts: MailOptions): Promise<{ success: boolean; previewUrl?: string | false; messageId?: string; error?: string }> {
  try {
    const tx = await getTransporter();
    const from = process.env.MAIL_FROM || (process.env.SMTP_USER ? `"ChildSafe Portal" <${process.env.SMTP_USER}>` : '"ChildSafe Portal" <no-reply@childsafe.gov.in>');
    const info = await tx.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });

    const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) : undefined;
    console.log(`[MAIL DISPATCHED] To: ${opts.to} | Subject: "${opts.subject}" | ID: ${info.messageId}`);
    if (previewUrl) {
      console.log(`[MAIL PREVIEW LINK] ${previewUrl}`);
    }

    return { success: true, previewUrl, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[MAIL ERROR] Failed to send email to ${opts.to}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function sendOtpEmail(email: string, otp: string, userName: string = 'User') {
  const subject = `Your ChildSafe Verification OTP: ${otp}`;
  const text = `Hello ${userName},\n\nYour one-time verification code for ChildSafe is: ${otp}\n\nThis OTP is valid for 10 minutes.\nIf you did not request this, please ignore this email.\n\nChildSafe Operations Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0d9488; margin-top: 0;">ChildSafe Account Verification</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>Use the one-time code below to verify your email address and complete registration:</p>
      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a; border-radius: 6px; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #64748b; font-size: 13px;">This OTP is valid for 10 minutes. If you did not make this request, you can safely ignore this message.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <small style="color: #94a3b8;">ChildSafe Automated Security Service</small>
    </div>
  `;
  return await sendMail({ to: email, subject, text, html });
}
