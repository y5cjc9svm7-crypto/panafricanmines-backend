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

export function listingPublishedEmail(listing) {
  const url = `${site}/#/listings/${listing.id}`;
  const subject = `Your listing is now live on PanAfricanMines — ${listing.name} (${listing.id})`;

  const text =
    `Hello,\n\n` +
    `Good news — your listing has been reviewed by our team and is now live on PanAfricanMines:\n\n` +
    `${listing.name} (${listing.id})\n` +
    `${listing.commodity} · ${listing.country} · ${listing.licence}\n\n` +
    `Buyers can now find it and request an introduction. We'll let you know whenever a buyer expresses interest.\n\n` +
    `Optional: independent verification by StraMin\n` +
    `If you can provide some basic supporting information that makes the key facts of your listing plausible to check (for example licence details, location and ownership), StraMin can carry out a separate, independent verification of your listing. A verified listing then carries the "Independently verified" badge — it stands out visually and tends to attract more attention from buyers, since it signals credibility through StraMin's independent verification of core information.\n\n` +
    `Independent verification costs just US$25 (one-off).\n\n` +
    `Standard listing: no badge, shown as normal.\n` +
    `Independently verified (US$25): "Independently verified" badge, visually highlighted and stands out, greater credibility.\n\n` +
    `To request verification, simply send an email to mark@panafricanmines.com and we'll tell you which supporting details we need.\n\n` +
    `Kind regards,\nPanAfricanMines\nby StraMin Africa Zambia Limited\n\n` +
    `———————————————————————\n\n` +
    `Bonjour,\n\n` +
    `Bonne nouvelle : votre annonce a été examinée par notre équipe et est désormais en ligne sur PanAfricanMines :\n\n` +
    `${listing.name} (${listing.id})\n` +
    `${listing.commodity} · ${listing.country} · ${listing.licence}\n\n` +
    `Les acheteurs peuvent désormais la trouver et demander une mise en relation. Nous vous informerons dès qu'un acheteur manifestera son intérêt.\n\n` +
    `Option : vérification indépendante par StraMin\n` +
    `Si vous pouvez fournir quelques informations de base rendant les éléments clés de votre annonce raisonnablement vérifiables (par exemple les détails de la licence, la localisation et la titularité), StraMin peut effectuer une vérification indépendante distincte de votre annonce. L'annonce vérifiée porte alors le badge « Independently verified » (vérifiée de manière indépendante) : elle se distingue visuellement et tend à attirer davantage l'attention des acheteurs, car elle signale sa crédibilité grâce à la vérification indépendante des informations essentielles par StraMin.\n\n` +
    `La vérification indépendante ne coûte que 25 US$ (paiement unique).\n\n` +
    `Annonce standard : pas de badge, affichage normal.\n` +
    `Vérifiée indépendamment (25 US$) : badge « Independently verified », mise en évidence visuelle, crédibilité accrue.\n\n` +
    `Pour demander la vérification, envoyez simplement un e-mail à mark@panafricanmines.com et nous vous indiquerons les justificatifs nécessaires.\n\n` +
    `Cordialement,\nPanAfricanMines\npar StraMin Africa Zambia Limited`;

  // Side-by-side comparison (email-safe table). std/ver = arrays of bullet lines.
  const cmp = (stdTitle, stdLines, verTitle, badgeText, verLines) => {
    const li = (t, c) => `<div style="font-size:12px;color:${c};margin-top:6px">${t}</div>`;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;border-collapse:separate;border-spacing:8px 0">
      <tr>
        <td width="50%" valign="top" style="border:1px solid #D8CFC0;padding:14px;background:#fff">
          <div style="font-size:13px;font-weight:700;color:#221C18">${stdTitle}</div>
          ${stdLines.map((t) => li(t, '#7A7064')).join('')}
        </td>
        <td width="50%" valign="top" style="border:2px solid #A8663C;padding:14px;background:#FBF4EE">
          <div style="font-size:13px;font-weight:700;color:#A8663C">${verTitle}</div>
          <div style="margin-top:8px"><span style="background:#A8663C;color:#fff;font-size:10px;font-weight:700;letter-spacing:.04em;padding:3px 9px;border-radius:11px;text-transform:uppercase">${badgeText}</span></div>
          ${verLines.map((t) => li(t, '#2E2620')).join('')}
        </td>
      </tr>
    </table>`;
  };

  const listingBox = `<div style="border:1px solid #D8CFC0;padding:16px;margin:12px 0">
       <div style="font-size:11px;letter-spacing:.1em;color:#7C6A52">${listing.id}</div>
       <div style="font-size:17px;font-weight:700;color:#221C18;margin:4px 0">${listing.name}</div>
       <div style="font-size:13px;color:#7A7064">${listing.commodity} · ${listing.country} · ${listing.licence}</div>
     </div>
     <p><a href="${url}" style="background:#A8663C;color:#fff;text-decoration:none;padding:11px 20px;display:inline-block">View listing · Voir l'annonce</a></p>`;

  const en = `<p style="font-size:14px;line-height:1.6">Good news — your listing has been reviewed by our team and is now live on PanAfricanMines. Buyers can now find it and request an introduction; we'll let you know whenever a buyer expresses interest.</p>
     <h2 style="font-size:15px;color:#221C18;margin:18px 0 6px">Optional: independent verification by StraMin</h2>
     <p style="font-size:13px;line-height:1.6;color:#2E2620">If you can provide some basic supporting information that makes the key facts of your listing plausible to check (for example licence details, location and ownership), StraMin can carry out a separate, independent verification of your listing. A verified listing then carries the "Independently verified" badge — it stands out visually and tends to attract more attention from buyers, since it signals credibility through StraMin's independent verification of core information. Independent verification costs just <strong>US$25</strong> (one-off).</p>
     ${cmp('Standard listing', ['No badge', 'Shown as normal', 'Standard buyer perception'], 'Independently verified · US$25', 'Independently verified', ['Visually highlighted — stands out', 'Greater credibility, taken more seriously'])}
     <p style="font-size:13px;color:#7A7064">To request verification, simply send an email to <a href="mailto:mark@panafricanmines.com" style="color:#A8663C">mark@panafricanmines.com</a> and we'll tell you which supporting details we need.</p>
     <p style="font-size:13px;color:#2E2620;margin-top:16px">Kind regards,<br>PanAfricanMines<br>by StraMin Africa Zambia Limited</p>`;

  const fr = `<p style="font-size:14px;line-height:1.6">Bonne nouvelle : votre annonce a été examinée par notre équipe et est désormais en ligne sur PanAfricanMines. Les acheteurs peuvent désormais la trouver et demander une mise en relation ; nous vous informerons dès qu'un acheteur manifestera son intérêt.</p>
     <h2 style="font-size:15px;color:#221C18;margin:18px 0 6px">Option : vérification indépendante par StraMin</h2>
     <p style="font-size:13px;line-height:1.6;color:#2E2620">Si vous pouvez fournir quelques informations de base rendant les éléments clés de votre annonce raisonnablement vérifiables (par exemple les détails de la licence, la localisation et la titularité), StraMin peut effectuer une vérification indépendante distincte de votre annonce. L'annonce vérifiée porte alors le badge « Independently verified » (vérifiée de manière indépendante) : elle se distingue visuellement et tend à attirer davantage l'attention des acheteurs, car elle signale sa crédibilité grâce à la vérification indépendante des informations essentielles par StraMin. La vérification indépendante ne coûte que <strong>25 US$</strong> (paiement unique).</p>
     ${cmp('Annonce standard', ['Pas de badge', 'Affichage normal', 'Perception standard des acheteurs'], 'Vérifiée indépendamment · 25 US$', 'Independently verified', ['Mise en évidence visuelle — se démarque', 'Crédibilité accrue, prise plus au sérieux'])}
     <p style="font-size:13px;color:#7A7064">Pour demander la vérification, envoyez simplement un e-mail à <a href="mailto:mark@panafricanmines.com" style="color:#A8663C">mark@panafricanmines.com</a> et nous vous indiquerons les justificatifs nécessaires.</p>
     <p style="font-size:13px;color:#2E2620;margin-top:16px">Cordialement,<br>PanAfricanMines<br>par StraMin Africa Zambia Limited</p>`;

  const html = layout(
    'Your listing is now live · Votre annonce est en ligne',
    `${listingBox}${en}<hr style="border:none;border-top:1px solid #D8CFC0;margin:24px 0">${fr}`
  );

  return { subject, text, html };
}
