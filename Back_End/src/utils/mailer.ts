import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter using environment variables. If not configured, transporter will be null and sendMail will resolve false.
let transporter: nodemailer.Transporter | null = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendOrderConfirmation(to: string, subject: string, htmlBody: string, textBody?: string) {
  if (!transporter) {
    console.warn('[mailer] SMTP not configured, skipping email to', to);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log('[mailer] sent', info.messageId);
    return true;
  } catch (err) {
    console.error('[mailer] send error', err);
    return false;
  }
}
