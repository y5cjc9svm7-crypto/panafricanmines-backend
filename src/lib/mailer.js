import config from '../config.js';
import logger from '../lib/logger.js';

// Resend sends over HTTPS (port 443), which cloud platforms like Render do not
// block — unlike SMTP ports 25/465/587. The API key comes from the
// RESEND_API_KEY environment variable; the "from" address comes from MAIL_FROM
// (config.mail.from) and must be on a domain you have verified in Resend.
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export async function sendMail({ to, subject, text, html }) {
  if (!to) return { skipped: true };

  if (!RESEND_API_KEY) {
    logger.warn({ to, subject }, 'RESEND_API_KEY not set — email not sent.');
    return { skipped: true };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.mail.from,
        to: [to],
        subject,
        text,
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      logger.error({ status: res.status, data, to, subject }, 'Email send failed');
      return { error: true };
    }

    logger.info({ to, subject, id: data.id }, 'Email sent');
    return data;
  } catch (err) {
    logger.error({ err, to, subject }, 'Email send failed');
    return { error: true };
  }
}
