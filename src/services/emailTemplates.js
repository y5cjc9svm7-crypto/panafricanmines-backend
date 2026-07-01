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
  const url = `${site}/?listing=${encodeURIComponent(listing.id)}`;
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
// ============================================================================
//  ADD THESE TWO FUNCTIONS TO THE END of src/services/emailTemplates.js
//  (paste everything below this line after the last existing function).
//  They reuse the `layout` helper and `site` constant already defined at the
//  top of that file, so they must live in the same file.
// ============================================================================

export function referrerWelcomeEmail(referrer) {
  const name = referrer.full_name || referrer.name || '';
  const code = referrer.code;
  const shareUrl = `${site}/?ref=${code}`;
  const subject = `Your PanAfricanMines referral code: ${code}`;

  const text =
    `Hello${name ? ' ' + name : ''},\n\n` +
    `You're in. Your referral code is:\n\n  ${code}\n\n` +
    `Your personal share link:\n\n  ${shareUrl}\n\n` +
    `Anyone who starts a listing from this link will have your code applied automatically — they don't need to type anything.\n\n` +
    `Share the code or the link with anyone listing an asset on PanAfricanMines. When an asset listed with your code is sold through the platform, you earn 20% of the commission StraMin receives on that sale, paid once the money has cleared.\n\n` +
    `Key points:\n` +
    `- A listing can carry only one code, captured once at the time of listing.\n` +
    `- You cannot refer an asset you are listing yourself.\n` +
    `- Before any payout we verify identity and age, and you provide payout and tax details.\n\n` +
    `Please keep this email as a record of your code. The full referral programme terms apply and are governed by the laws of Zambia.\n\n` +
    `Kind regards,\nPanAfricanMines\nby StraMin Africa Zambia Limited\n\n` +
    `------------------------------------------------------------\n\n` +
    `Bonjour${name ? ' ' + name : ''},\n\n` +
    `C'est fait. Votre code de parrainage est :\n\n  ${code}\n\n` +
    `Votre lien de parrainage personnel :\n\n  ${shareUrl}\n\n` +
    `Toute personne qui commence une annonce a partir de ce lien verra votre code applique automatiquement — elle n'a rien a saisir.\n\n` +
    `Partagez le code ou le lien avec toute personne deposant un actif sur PanAfricanMines. Lorsqu'un actif depose avec votre code est vendu via la plateforme, vous gagnez 20% de la commission percue par StraMin sur cette vente, payee une fois les fonds recus.\n\n` +
    `Points cles :\n` +
    `- Une annonce ne peut porter qu'un seul code, enregistre une seule fois au moment du depot.\n` +
    `- Vous ne pouvez pas parrainer un actif que vous deposez vous-meme.\n` +
    `- Avant tout paiement, nous verifions l'identite et l'age, et vous fournissez vos coordonnees de paiement et fiscales.\n\n` +
    `Veuillez conserver cet e-mail comme preuve de votre code. Les conditions completes du programme de parrainage s'appliquent et sont regies par le droit de la Zambie.\n\n` +
    `Cordialement,\nPanAfricanMines\npar StraMin Africa Zambia Limited`;

  const codeBox = `<div style="font-size:26px;font-weight:700;letter-spacing:3px;background:#F2EEE7;border:1px solid #D8CFC0;padding:16px;text-align:center;margin:12px 0;color:#221C18">${code}</div>`;

  const shareBoxEn = `<p style="font-size:13px;line-height:1.6;color:#2E2620;margin-top:14px">Or share your personal link — anyone who starts a listing from it has your code applied automatically, with nothing to type:</p>
     <div style="background:#FBF4EE;border:1px solid #D8CFC0;padding:13px;text-align:center;margin:8px 0;word-break:break-all"><a href="${shareUrl}" style="color:#A8663C;font-weight:700;font-size:14px;text-decoration:none">${shareUrl}</a></div>`;

  const shareBoxFr = `<p style="font-size:13px;line-height:1.6;color:#2E2620;margin-top:14px">Ou partagez votre lien personnel — toute personne qui commence une annonce a partir de ce lien verra votre code applique automatiquement, sans rien a saisir :</p>
     <div style="background:#FBF4EE;border:1px solid #D8CFC0;padding:13px;text-align:center;margin:8px 0;word-break:break-all"><a href="${shareUrl}" style="color:#A8663C;font-weight:700;font-size:14px;text-decoration:none">${shareUrl}</a></div>`;

  const en = `<p style="font-size:14px;line-height:1.6">You're in${name ? ', ' + name : ''}. Here is your referral code:</p>
     ${codeBox}
     ${shareBoxEn}
     <p style="font-size:13px;line-height:1.6;color:#2E2620">Share this code with anyone listing an asset on PanAfricanMines. When an asset listed with your code is sold through the platform, you earn <strong>20%</strong> of the commission StraMin receives on that sale, paid once the money has cleared.</p>
     <ul style="font-size:13px;color:#7A7064;line-height:1.7;padding-left:18px">
       <li>A listing can carry only one code, captured once at the time of listing.</li>
       <li>You cannot refer an asset you are listing yourself.</li>
       <li>Before any payout we verify identity and age; you provide payout and tax details.</li>
     </ul>
     <p style="font-size:13px;color:#7A7064">Please keep this email as a record of your code. The full referral programme terms apply (governed by the laws of Zambia).</p>
     <p style="font-size:13px;color:#2E2620;margin-top:16px">Kind regards,<br>PanAfricanMines<br>by StraMin Africa Zambia Limited</p>`;

  const fr = `<p style="font-size:14px;line-height:1.6">C'est fait${name ? ', ' + name : ''}. Voici votre code de parrainage :</p>
     ${codeBox}
     ${shareBoxFr}
     <p style="font-size:13px;line-height:1.6;color:#2E2620">Partagez ce code avec toute personne deposant un actif sur PanAfricanMines. Lorsqu'un actif depose avec votre code est vendu via la plateforme, vous gagnez <strong>20%</strong> de la commission percue par StraMin sur cette vente, payee une fois les fonds recus.</p>
     <ul style="font-size:13px;color:#7A7064;line-height:1.7;padding-left:18px">
       <li>Une annonce ne peut porter qu'un seul code, enregistre une seule fois au moment du depot.</li>
       <li>Vous ne pouvez pas parrainer un actif que vous deposez vous-meme.</li>
       <li>Avant tout paiement, nous verifions l'identite et l'age ; vous fournissez vos coordonnees de paiement et fiscales.</li>
     </ul>
     <p style="font-size:13px;color:#7A7064">Veuillez conserver cet e-mail comme preuve de votre code. Les conditions completes du programme de parrainage s'appliquent (regies par le droit de la Zambie).</p>
     <p style="font-size:13px;color:#2E2620;margin-top:16px">Cordialement,<br>PanAfricanMines<br>par StraMin Africa Zambia Limited</p>`;

  const html = layout(
    'Your referral code · Votre code de parrainage',
    `${en}<hr style="border:none;border-top:1px solid #D8CFC0;margin:24px 0">${fr}`
  );

  return { subject, text, html };
}

export function newReferrerOpsEmail(referrer) {
  const url = `${site}/#/operator`;
  const name = referrer.full_name || referrer.name || '';
  const subject = `[Referral programme] New referrer: ${name || referrer.email} (${referrer.code})`;
  const text =
    `A new referrer has registered for the referral programme.\n\n` +
    `Code: ${referrer.code}\nName: ${name || '-'}\nEmail: ${referrer.email || '-'}\nCountry: ${referrer.country || '-'}\n\n` +
    `See all referrers in the back-office: ${url}`;
  const html = layout(
    'New referrer registered',
    `<p style="font-size:14px">A new referrer has joined the referral programme.</p>
     <div style="border:1px solid #D8CFC0;padding:16px;margin:12px 0">
       <div style="font-size:16px;font-weight:700;color:#221C18">${name || referrer.email}</div>
       <div style="font-size:13px;color:#7A7064">Code: ${referrer.code}</div>
       <div style="font-size:13px;color:#7A7064">${referrer.email || '-'}${referrer.country ? ' · ' + referrer.country : ''}</div>
     </div>
     <p><a href="${url}" style="background:#221C18;color:#fff;text-decoration:none;padding:11px 20px;display:inline-block">Open back-office</a></p>`
  );
  return { subject, text, html };
}

export function referralUsedEmail(referrer, listing) {
  const name = referrer.full_name || [referrer.first_name, referrer.last_name].filter(Boolean).join(' ') || '';
  const code = referrer.code;
  const subject = `Your referral code has been used on a new listing (${listing.id})`;

  const text =
    `Hello${name ? ' ' + name : ''},\n\n` +
    `Good news — your unique referral code ${code} has just been used on a new listing on PanAfricanMines:\n\n` +
    `${listing.name} (${listing.id})\n${listing.commodity} \u00b7 ${listing.country}\n\n` +
    `What this means: the listing has been recorded with your code. If and when this asset is sold through the platform, you earn 20% of the commission StraMin receives on that sale, paid once the money has cleared. No payout is due simply for the listing — your code is now captured against it, ready for when a sale completes.\n\n` +
    `We'll keep you posted. Please keep this email as a record. The full referral programme terms apply (governed by the laws of Zambia).\n\n` +
    `Kind regards,\nPanAfricanMines\nby StraMin Africa Zambia Limited\n\n` +
    `------------------------------------------------------------\n\n` +
    `Bonjour${name ? ' ' + name : ''},\n\n` +
    `Bonne nouvelle — votre code de parrainage unique ${code} vient d'\u00eatre utilis\u00e9 pour une nouvelle annonce sur PanAfricanMines :\n\n` +
    `${listing.name} (${listing.id})\n${listing.commodity} \u00b7 ${listing.country}\n\n` +
    `Ce que cela signifie : l'annonce a \u00e9t\u00e9 enregistr\u00e9e avec votre code. Si et quand cet actif est vendu via la plateforme, vous gagnez 20% de la commission per\u00e7ue par StraMin sur cette vente, pay\u00e9e une fois les fonds re\u00e7us. Aucun paiement n'est d\u00fb du simple fait de l'annonce — votre code y est d\u00e9sormais associ\u00e9, pr\u00eat pour le moment o\u00f9 une vente se conclura.\n\n` +
    `Nous vous tiendrons inform\u00e9. Veuillez conserver cet e-mail comme preuve. Les conditions compl\u00e8tes du programme de parrainage s'appliquent (r\u00e9gies par le droit de la Zambie).\n\n` +
    `Cordialement,\nPanAfricanMines\npar StraMin Africa Zambia Limited`;

  const codeBox = `<div style="font-size:22px;font-weight:700;letter-spacing:3px;background:#F2EEE7;border:1px solid #D8CFC0;padding:13px;text-align:center;margin:10px 0;color:#221C18">${code}</div>`;
  const listingBox = `<div style="border:1px solid #D8CFC0;padding:16px;margin:12px 0">
       <div style="font-size:11px;letter-spacing:.1em;color:#7C6A52">${listing.id}</div>
       <div style="font-size:17px;font-weight:700;color:#221C18;margin:4px 0">${listing.name}</div>
       <div style="font-size:13px;color:#7A7064">${listing.commodity} \u00b7 ${listing.country}</div>
     </div>`;

  const en = `<p style="font-size:14px;line-height:1.6">Good news${name ? ', ' + name : ''} — your unique referral code has just been used on a new listing on PanAfricanMines:</p>
     ${codeBox}
     ${listingBox}
     <p style="font-size:13px;line-height:1.6;color:#2E2620"><strong>What this means:</strong> the listing has been recorded with your code. If and when this asset is sold through the platform, you earn <strong>20%</strong> of the commission StraMin receives on that sale, paid once the money has cleared. No payout is due simply for the listing — your code is now captured against it, ready for when a sale completes.</p>
     <p style="font-size:13px;color:#7A7064">We'll keep you posted. Please keep this email as a record. The full referral programme terms apply (governed by the laws of Zambia).</p>
     <p style="font-size:13px;color:#2E2620;margin-top:16px">Kind regards,<br>PanAfricanMines<br>by StraMin Africa Zambia Limited</p>`;

  const fr = `<p style="font-size:14px;line-height:1.6">Bonne nouvelle${name ? ', ' + name : ''} — votre code de parrainage unique vient d'\u00eatre utilis\u00e9 pour une nouvelle annonce sur PanAfricanMines :</p>
     ${codeBox}
     ${listingBox}
     <p style="font-size:13px;line-height:1.6;color:#2E2620"><strong>Ce que cela signifie :</strong> l'annonce a \u00e9t\u00e9 enregistr\u00e9e avec votre code. Si et quand cet actif est vendu via la plateforme, vous gagnez <strong>20%</strong> de la commission per\u00e7ue par StraMin sur cette vente, pay\u00e9e une fois les fonds re\u00e7us. Aucun paiement n'est d\u00fb du simple fait de l'annonce — votre code y est d\u00e9sormais associ\u00e9, pr\u00eat pour le moment o\u00f9 une vente se conclura.</p>
     <p style="font-size:13px;color:#7A7064">Nous vous tiendrons inform\u00e9. Veuillez conserver cet e-mail comme preuve. Les conditions compl\u00e8tes du programme de parrainage s'appliquent (r\u00e9gies par le droit de la Zambie).</p>
     <p style="font-size:13px;color:#2E2620;margin-top:16px">Cordialement,<br>PanAfricanMines<br>par StraMin Africa Zambia Limited</p>`;

  const html = layout(
    'Your referral code was used \u00b7 Votre code de parrainage a \u00e9t\u00e9 utilis\u00e9',
    `${en}<hr style="border:none;border-top:1px solid #D8CFC0;margin:24px 0">${fr}`
  );

  return { subject, text, html };
}

// Seller-facing explanation for each decline reason code. Kept here so the
// wording that reaches the seller lives with the other email copy.
const DECLINE_REASON_TEXT = {
  duplicate:    { en: "This asset appears to have already been listed, so this entry was treated as a duplicate.", fr: "Cet actif semble avoir d\u00e9j\u00e0 \u00e9t\u00e9 d\u00e9pos\u00e9 ; cette entr\u00e9e a donc \u00e9t\u00e9 consid\u00e9r\u00e9e comme un doublon." },
  inconsistent: { en: "Some of the details provided were inconsistent or could not be reconciled.", fr: "Certaines informations fournies \u00e9taient incoh\u00e9rentes ou n'ont pas pu \u00eatre v\u00e9rifi\u00e9es." },
  incomplete:   { en: "The listing did not include enough information for us to publish it.", fr: "L'annonce ne comportait pas assez d'informations pour \u00eatre publi\u00e9e." },
  licence:      { en: "We were unable to verify the licence details provided.", fr: "Nous n'avons pas pu v\u00e9rifier les informations de licence fournies." },
  scope:        { en: "This submission falls outside the type of assets PanAfricanMines currently lists.", fr: "Cette soumission ne correspond pas au type d'actifs actuellement r\u00e9f\u00e9renc\u00e9s par PanAfricanMines." },
  quality:      { en: "The submission did not meet our current listing standards.", fr: "La soumission ne r\u00e9pondait pas \u00e0 nos crit\u00e8res de publication actuels." },
  other:        { en: "The submission could not be published in its current form.", fr: "La soumission n'a pas pu \u00eatre publi\u00e9e en l'\u00e9tat." },
};

export function listingDeclinedEmail(listing, reasonCode, note) {
  const r = DECLINE_REASON_TEXT[reasonCode] || DECLINE_REASON_TEXT.other;
  const noteClean = (note && String(note).trim()) ? String(note).trim() : '';
  const subject = `Update on your listing submission (${listing.id})`;

  const noteEnText = noteClean ? `\nNote from our team: ${noteClean}\n` : '';
  const noteFrText = noteClean ? `\nNote de notre \u00e9quipe : ${noteClean}\n` : '';

  const text =
    `Hello,\n\n` +
    `Thank you for submitting your asset to PanAfricanMines. After review, we were not able to publish this listing:\n\n` +
    `${listing.name} (${listing.id})\n${listing.commodity} \u00b7 ${listing.country}\n\n` +
    `Reason: ${r.en}\n` + noteEnText + `\n` +
    `You are welcome to submit again with corrected or additional information, or reply to this email if you believe this was a mistake or you would like guidance.\n\n` +
    `Kind regards,\nPanAfricanMines\nby StraMin Africa Zambia Limited\n\n` +
    `------------------------------------------------------------\n\n` +
    `Bonjour,\n\n` +
    `Merci d'avoir soumis votre actif \u00e0 PanAfricanMines. Apr\u00e8s examen, nous n'avons pas pu publier cette annonce :\n\n` +
    `${listing.name} (${listing.id})\n${listing.commodity} \u00b7 ${listing.country}\n\n` +
    `Motif : ${r.fr}\n` + noteFrText + `\n` +
    `Vous pouvez soumettre \u00e0 nouveau avec des informations corrig\u00e9es ou compl\u00e9mentaires, ou r\u00e9pondre \u00e0 cet e-mail si vous pensez qu'il s'agit d'une erreur ou souhaitez \u00eatre accompagn\u00e9.\n\n` +
    `Cordialement,\nPanAfricanMines\npar StraMin Africa Zambia Limited`;

  const listingBox = `<div style="border:1px solid #D8CFC0;padding:16px;margin:12px 0">
       <div style="font-size:11px;letter-spacing:.1em;color:#7C6A52">${listing.id}</div>
       <div style="font-size:17px;font-weight:700;color:#221C18;margin:4px 0">${listing.name}</div>
       <div style="font-size:13px;color:#7A7064">${listing.commodity} \u00b7 ${listing.country}</div>
     </div>`;

  const reasonBox = (label, reasonText, noteLabel) =>
    `<div style="border-left:4px solid #A8663C;background:#FBF4EE;padding:12px 16px;margin:12px 0">
       <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#A8663C;font-weight:700">${label}</div>
       <div style="font-size:14px;color:#2E2620;margin-top:4px">${reasonText}</div>
       ${noteClean ? `<div style="font-size:13px;color:#7A7064;margin-top:8px"><strong>${noteLabel}</strong> ${noteClean}</div>` : ''}
     </div>`;

  const en = `<p style="font-size:14px;line-height:1.6">Thank you for submitting your asset to PanAfricanMines. After review, we were not able to publish this listing:</p>
     ${listingBox}
     ${reasonBox('Reason', r.en, 'Note from our team:')}
     <p style="font-size:13px;line-height:1.6;color:#2E2620">You are welcome to submit again with corrected or additional information, or simply reply to this email if you believe this was a mistake or would like guidance.</p>
     <p style="font-size:13px;color:#2E2620;margin-top:16px">Kind regards,<br>PanAfricanMines<br>by StraMin Africa Zambia Limited</p>`;

  const fr = `<p style="font-size:14px;line-height:1.6">Merci d'avoir soumis votre actif \u00e0 PanAfricanMines. Apr\u00e8s examen, nous n'avons pas pu publier cette annonce :</p>
     ${listingBox}
     ${reasonBox('Motif', r.fr, 'Note de notre \u00e9quipe :')}
     <p style="font-size:13px;line-height:1.6;color:#2E2620">Vous pouvez soumettre \u00e0 nouveau avec des informations corrig\u00e9es ou compl\u00e9mentaires, ou r\u00e9pondre \u00e0 cet e-mail si vous pensez qu'il s'agit d'une erreur ou souhaitez \u00eatre accompagn\u00e9.</p>
     <p style="font-size:13px;color:#2E2620;margin-top:16px">Cordialement,<br>PanAfricanMines<br>par StraMin Africa Zambia Limited</p>`;

  const html = layout(
    'Update on your listing \u00b7 Mise \u00e0 jour concernant votre annonce',
    `${en}<hr style="border:none;border-top:1px solid #D8CFC0;margin:24px 0">${fr}`
  );

  return { subject, text, html };
}
