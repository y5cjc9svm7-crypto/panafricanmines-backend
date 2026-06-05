import nodemailer from 'nodemailer';
import config from '../config.js';
import logger from '../lib/logger.js';

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (config.mail.host) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    });
  } else {
    // Dev/test fallback: don't send, just log a JSON envelope.
    transporter = nodemailer.createTransport({ jsonTransport: true });
    logger.warn('SMTP not configured — emails will be logged, not delivered.');
  }
  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  if (!to) return { skipped: true };
  try {
    const info = await getTransporter().sendMail({
      from: config.mail.from,
      to,
      subject,
      text,
      html,
    });
    if (info.message) logger.info({ to, subject, body: info.message.toString() }, 'Email (dev transport)');
    else logger.info({ to, subject, messageId: info.messageId }, 'Email sent');
    return info;
  } catch (err) {
    logger.error({ err, to, subject }, 'Email send failed');
    return { error: true };
  }
}
