import config from '../config.js';
import { formatUSD } from '../lib/money.js';

const site = config.publicSiteUrl;

function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#2E2620;background:#F2EEE7;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #D8CFC0;padding:28px">
    <div style="font-size:18px;font-weight:700;color:#221C18">PanAfricanMines</div>
    <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#A8663C;margin-bottom:18px">The matching platform</div>
    <h1 style="font-size:20px;color:#221C18;margin:0 0 14px">${title}</h1>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #D8CFC0;margin:24px 0">
    <div style="font-size:12px;color:#7A7064">Operated by StraMin Africa Zambia Limited.</div>
  </div></body></html>`;
}

export function alertMatchEmail(alert, listing) {
  const url = `${site}/#/listings/${listing.id}`;
  const unsub = `${site}/api/v1/alerts/unsubscribe?token=${alert.unsubscribe_token}`;
  const subject = `New listing matches your alert: ${listing.name}`;
  const text =
    `A new listing matching your saved criteria has just been published.\n\n` +
    `${listing.name} (${listing.id})\n` +
    `Commodity: ${listing.commodity}\nCountry: ${listing.country}\n` +
    `Licence: ${listing.licence}\nGuide price: ${listing.price_label || 'Open to offers'}\n\n` +
    `View it: ${url}\n\nUnsubscribe from this alert: ${unsub}`;
  const html = layout(
    'A new listing matches your alert',
    `<p style="font-size:14px;line-height:1.6">A new listing matching your saved criteria has just been published:</p>
     <div style="border:1px solid #D8CFC0;padding:16px;margin:12px 0">
       <div style="font-size:11px;letter-spacing:.1em;color:#7C6A52">${listing.id}</div>
       <div style="font-size:17px;font-weight:700;color:#221C18;margin:4px 0">${listing.name}</div>
       <div style="font-size:13px;color:#7A7064">${listing.commodity} · ${listing.country} · ${listing.licence}</div>
       <div style="font-size:14px;color:#A8663C;font-weight:700;margin-top:8px">${listing.price_label || 'Open to offers'}</div>
     </div>
     <p><a href="${url}" style="background:#A8663C;color:#fff;text-decoration:none;padding:11px 20px;display:inline-block">View listing</a></p>
     <p style="font-size:12px;color:#7A7064;margin-top:18px"><a href="${unsub}" style="color:#7A7064">Unsubscribe from this alert</a></p>`
  );
  return { subject, text, html };
}

export function listingSubmittedEmail(listing) {
  const subject = `Listing received: ${listing.name} (${listing.id})`;
  const text =
    `Thank you — your listing has been received and is now in the operator review queue.\n\n` +
    `Reference: ${listing.id}\n${listing.name}\n${listing.commodity} · ${listing.country}\n\n` +
    `Once verified it will appear in the public listings. No fee is charged to list; ` +
    `a 10% matching fee applies to the seller only on a completed transaction.`;
  const html = layout(
    'Your listing has been received',
    `<p style="font-size:14px;line-height:1.6">Thank you — your listing is now in the operator review queue.</p>
     <div style="border:1px solid #D8CFC0;padding:16px;margin:12px 0">
       <div style="font-size:11px;letter-spacing:.1em;color:#7C6A52">${listing.id}</div>
       <div style="font-size:17px;font-weight:700;color:#221C18;margin:4px 0">${listing.name}</div>
       <div style="font-size:13px;color:#7A7064">${listing.commodity} · ${listing.country}</div>
     </div>
     <p style="font-size:13px;color:#7A7064">Once verified it will appear in the public listings. No fee is charged to list; a 10% matching fee applies to the seller only on a completed transaction.</p>`
  );
  return { subject, text, html };
}

export function newSubmissionOpsEmail(listing) {
  const url = `${site}/#/operator`;
  const subject = `[Review queue] New submission: ${listing.name} (${listing.id})`;
  const text =
    `A new listing has been submitted and is awaiting review.\n\n` +
    `${listing.id} — ${listing.name}\n${listing.commodity} · ${listing.country} · ${listing.licence}\n` +
    `Guide: ${listing.price_label || 'Open to offers'}\nSeller contact: ${listing.contact_email || '—'}\n\n` +
    `Open the back-office: ${url}`;
  const html = layout(
    'New submission awaiting review',
    `<p style="font-size:14px">A new listing is awaiting verification.</p>
     <div style="border:1px solid #D8CFC0;padding:16px;margin:12px 0">
       <div style="font-size:11px;color:#7C6A52">${listing.id}</div>
       <div style="font-size:16px;font-weight:700;margin:4px 0">${listing.name}</div>
       <div style="font-size:13px;color:#7A7064">${listing.commodity} · ${listing.country} · ${listing.licence}</div>
       <div style="font-size:13px;color:#7A7064">Seller: ${listing.contact_email || '—'}</div>
     </div>
     <p><a href="${url}" style="background:#221C18;color:#fff;text-decoration:none;padding:11px 20px;display:inline-block">Open back-office</a></p>`
  );
  return { subject, text, html };
}

export function contactRequestOpsEmail(listing, contact) {
  const subject = `[Buyer interest] ${listing.name} (${listing.id})`;
  const text =
    `A buyer has requested an introduction.\n\n` +
    `Listing: ${listing.id} — ${listing.name}\n` +
    `Buyer email: ${contact.buyer_email || '(not provided)'}\n` +
    `Buyer name: ${contact.buyer_name || '(not provided)'}\n` +
    `Message: ${contact.message || '(none)'}\n`;
  const html = layout(
    'A buyer requested an introduction',
    `<p style="font-size:14px">A buyer has expressed interest in a listing.</p>
     <div style="border:1px solid #D8CFC0;padding:16px;margin:12px 0">
       <div style="font-size:16px;font-weight:700">${listing.name}</div>
       <div style="font-size:13px;color:#7A7064">${listing.id}</div>
       <p style="font-size:13px;margin:10px 0 0">Buyer: ${contact.buyer_email || '(not provided)'}<br>
       ${contact.buyer_name ? 'Name: ' + contact.buyer_name + '<br>' : ''}
       ${contact.message ? 'Message: ' + contact.message : ''}</p>
     </div>`
  );
  return { subject, text, html };
}

export function feeInvoiceNote(listing) {
  return `Closed: ${listing.id} — fee invoiced ${formatUSD(listing.fee_invoiced)} (10% of ${formatUSD(listing.price_val)}).`;
}
