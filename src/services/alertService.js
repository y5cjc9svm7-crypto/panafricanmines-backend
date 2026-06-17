import { query, withTransaction } from '../db/pool.js';
import { HttpError } from '../middleware/error.js';
import { uuid, token } from '../lib/ids.js';
import config from '../config.js';
import logger from '../lib/logger.js';
import { sendMail } from '../lib/mailer.js';
import { alertMatchEmail } from './emailTemplates.js';

function norm(v) {
  return v && v !== 'All' ? v : null;
}

export async function createAlert(input) {
  const id = uuid();
  const unsub = token(18);
  const { rows } = await query(
    `INSERT INTO alerts (id, email, commodity, country, licence, unsubscribe_token)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id, input.email.toLowerCase(), norm(input.commodity), norm(input.country), norm(input.licence), unsub]
  );
  const a = rows[0];
  return {
    id: a.id,
    email: a.email,
    commodity: a.commodity,
    country: a.country,
    licence: a.licence,
    createdAt: a.created_at,
    unsubscribeUrl: `${config.publicSiteUrl}/api/v1/alerts/unsubscribe?token=${unsub}`,
  };
}

// List a subscriber's own alerts (requires their email; no secrets exposed).
export async function listAlertsByEmail(email) {
  const { rows } = await query(
    `SELECT id, commodity, country, licence, created_at
       FROM alerts WHERE active AND lower(email) = lower($1) ORDER BY created_at DESC`,
    [email]
  );
  return rows.map((a) => ({
    id: a.id,
    commodity: a.commodity,
    country: a.country,
    licence: a.licence,
    createdAt: a.created_at,
  }));
}

export async function unsubscribe(tok) {
  const { rowCount } = await query(`UPDATE alerts SET active = FALSE WHERE unsubscribe_token = $1`, [tok]);
  if (!rowCount) throw new HttpError(404, 'Alert not found or already unsubscribed');
  return { unsubscribed: true };
}

export async function deleteAlertByToken(tok) {
  const { rowCount } = await query(`DELETE FROM alerts WHERE unsubscribe_token = $1`, [tok]);
  if (!rowCount) throw new HttpError(404, 'Alert not found');
  return { deleted: true };
}

// When a listing goes Live, email every matching active subscriber once.
export async function notifyAlertsForListing(listing) {
  const { rows: alerts } = await query(
    `SELECT a.* FROM alerts a
      WHERE a.active
        AND (a.commodity IS NULL OR a.commodity = $1)
        AND (a.country   IS NULL OR a.country   = $2)
        AND (a.licence   IS NULL OR a.licence   = $3)
        AND NOT EXISTS (
          SELECT 1 FROM alert_notifications n
           WHERE n.alert_id = a.id AND n.listing_id = $4)`,
    [listing.commodity, listing.country, listing.licence, listing.id]
  );

  let sent = 0;
  for (const alert of alerts) {
    try {
      await withTransaction(async (client) => {
        // Claim the (alert, listing) pair first to guarantee single delivery.
        const claim = await client.query(
          `INSERT INTO alert_notifications (alert_id, listing_id) VALUES ($1,$2)
           ON CONFLICT DO NOTHING RETURNING alert_id`,
          [alert.id, listing.id]
        );
        if (!claim.rowCount) return;
        const mail = alertMatchEmail(alert, listing);
        const result = await sendMail({ to: alert.email, ...mail });
        // Only KEEP the "notified" claim if the email was actually delivered.
        // If sending failed (or was skipped), throw so the transaction rolls
        // back and the claim is removed — this alert can then be retried later
        // instead of being silently marked as already notified.
        if (!result || result.error || result.skipped) {
          throw new Error('Alert email was not delivered');
        }
        sent++;
      });
    } catch (err) {
      logger.error({ err, alertId: alert.id, listing: listing.id }, 'Alert send failed');
    }
  }
  if (sent) logger.info({ listing: listing.id, sent }, 'Alert emails dispatched');
  return { matched: alerts.length, sent };
}
