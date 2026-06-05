import { query } from '../db/pool.js';
import { HttpError } from '../middleware/error.js';
import { uuid } from '../lib/ids.js';
import config from '../config.js';
import { sendMail } from '../lib/mailer.js';
import { contactRequestOpsEmail } from './emailTemplates.js';

const CONTACTABLE = ['Live', 'Under offer'];

export async function createContactRequest(listingId, input, meta = {}) {
  const { rows } = await query(`SELECT * FROM listings WHERE id = $1`, [listingId]);
  if (!rows.length) throw new HttpError(404, 'Listing not found');
  const listing = rows[0];
  if (!CONTACTABLE.includes(listing.status)) {
    throw new HttpError(409, 'This listing is not currently open for contact requests.');
  }

  const id = uuid();
  const ins = await query(
    `INSERT INTO contact_requests (id, listing_id, buyer_email, buyer_name, message, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [id, listingId, input.email || null, input.name || null, input.message || null, meta.ip || null, meta.userAgent || null]
  );
  const contact = ins.rows[0];

  if (config.mail.opsNotify) {
    const m = contactRequestOpsEmail(listing, contact);
    sendMail({ to: config.mail.opsNotify, ...m });
  }

  return { id: contact.id, listingId, status: contact.status, createdAt: contact.created_at };
}

export async function listContactRequests({ status, page = 1, limit = 50 } = {}) {
  const where = [];
  const params = [];
  let i = 1;
  if (status) { where.push(`cr.status = $${i++}`); params.push(status); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (page - 1) * limit;
  const { rows } = await query(
    `SELECT cr.*, l.name AS listing_name, l.country AS listing_country
       FROM contact_requests cr JOIN listings l ON l.id = cr.listing_id
       ${whereSql} ORDER BY cr.created_at DESC LIMIT $${i++} OFFSET $${i++}`,
    [...params, limit, offset]
  );
  return rows.map((r) => ({
    id: r.id,
    listingId: r.listing_id,
    listingName: r.listing_name,
    listingCountry: r.listing_country,
    buyerEmail: r.buyer_email,
    buyerName: r.buyer_name,
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
  }));
}
