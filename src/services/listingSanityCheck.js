import config from '../config.js';
import logger from '../lib/logger.js';
import { sendMail } from '../lib/mailer.js';
import { query } from '../db/pool.js';

/**
 * Claude-powered sanity check for newly submitted listings.
 *
 * Called fire-and-forget from createListing() the moment a listing is saved
 * (while it is still "Pending review"). It asks Claude to review the listing
 * like a mining-asset analyst - looking for internal contradictions, geography
 * /commodity mismatches, implausible pricing, data-quality problems - and then
 * emails the verdict to the operator. It NEVER throws and NEVER blocks
 * submission: any failure is logged and swallowed.
 *
 * Requirements:
 *   - process.env.ANTHROPIC_API_KEY set in the Render environment.
 *   - Node 18+ (global fetch). Render's runtime provides this.
 */

// Where the sanity-check result is sent. Change this one line if you ever want a
// different recipient (or point it at config.mail.opsNotify to reuse the ops address).
const NOTIFY_TO = 'mark@panafricanmines.com';

// Sonnet gives analyst-grade reasoning (contradictions, geology, price sense).
// Drop to 'claude-haiku-4-5-20251001' for a cheaper, lighter check; raise to
// 'claude-opus-4-8' for the deepest review at higher cost.
const MODEL = 'claude-sonnet-4-6';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// A plain, readable description of the listing for Claude to review.
function describe(l, duplicateCount) {
  const lines = [
    `ID: ${l.id}`,
    `Name (auto-generated from location + commodity code + asset type): ${l.name}`,
    `Asset type: ${l.asset_type}`,
    `Commodity: ${l.commodity}  (family: ${l.family})`,
    `Country: ${l.country}  (region: ${l.region})`,
    `Location / district: ${l.district}`,
    `Licence type: ${l.licence}`,
    `Area: ${l.area_ha == null ? '(none given)' : l.area_ha + ' ha'}`,
    `Project stage: ${l.stage || '(none given)'}`,
    `Price band: ${l.price_label || '(none given)'}  (parsed numeric value: ${l.price_val == null ? 'n/a' : l.price_val})`,
    `Independently verified: ${l.verified === true ? 'Yes' : 'No'}`,
    `Open to joint venture: ${l.joint_venture === true ? 'Yes' : l.joint_venture === false ? 'No' : 'not answered'}`,
    `Contact email: ${l.contact_email || '(none provided)'}`,
  ];
  if (duplicateCount > 0) {
    lines.push(`NOTE: ${duplicateCount} existing listing(s) already share this exact auto-generated name - possible duplicate.`);
  }
  return lines.join('\n');
}

const PROMPT_INTRO =
`You are an experienced mining-asset analyst doing a sanity check on a newly submitted listing for PanAfricanMines, a marketplace for mining licences and mineral assets across Africa. A human operator will still review it; your job is to think it through like an analyst and surface anything that doesn't add up, so they know exactly where to look.

Work through the following, and EXPLAIN your reasoning briefly for anything you raise - don't just label it:

1. Internal contradictions across fields. Cross-check asset type vs project stage vs licence type vs area vs price band. For example, an "Operating mine" cannot also be "Closed / post-closure"; a large-scale mining licence on a grassroots exploration target, or a tiny area carrying a nine-figure price, deserve a flag. When two fields conflict, say which one is most likely wrong and why.
2. Commodity vs geography and geology. Does the commodity fit the country and region? Is the stated district a known province or belt for that commodity? Does any commodity code or hint embedded in the auto-generated name match the commodity field?
3. Price plausibility. Is the price band sensible for this asset type, stage and size? Say if it looks high or low and what that implies.
4. Completeness and data quality. Missing or empty key fields; placeholder, test or junk text (e.g. "test", "asdf", "xxx", "TBD", lorem ipsum); a contact email that is missing or malformed; a country that is not actually African.
5. Verification status. Note how "Independently verified" pairs with the asking price and what a buyer would make of it.

Also briefly confirm the things that DO hang together (commodity matches the title, geography fits, licence/area/asset type are consistent, etc.), the way a good reviewer does - so the operator can see what you checked.

Finish with a single line beginning "Net:" giving your bottom-line recommendation - what to fix, or that the listing is clean.

Format your reply EXACTLY like this:
- The FIRST line must be either "VERDICT: ok" or "VERDICT: attention". Use "attention" if anything at all needs a human's eyes; use "ok" only if it is clean.
- Then one blank line, then your analysis as short paragraphs and/or bullet points.

Here is the listing:
`;

async function askClaude(listingText) {
  if (typeof fetch !== 'function') {
    throw new Error('global fetch unavailable (needs Node 18+)');
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      messages: [{ role: 'user', content: PROMPT_INTRO + listingText }],
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Anthropic API ${resp.status}: ${body.slice(0, 300)}`);
  }
  const data = await resp.json();
  const text = (data.content || [])
    .filter((b) => b && b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  return text;
}

// Split Claude's reply into a machine-readable verdict + the human analysis body.
function parseReply(text) {
  const raw = String(text || '').trim();
  const lines = raw.split('\n');
  let verdict = 'attention';            // default to "look at it" if unclear
  let bodyStart = 0;

  // Find the first non-empty line and read the verdict from it.
  for (let k = 0; k < lines.length; k++) {
    const line = lines[k].trim();
    if (!line) continue;
    const low = line.toLowerCase();
    if (low.includes('verdict')) {
      if (low.includes('ok') && !low.includes('attention')) verdict = 'ok';
      else if (low.includes('attention')) verdict = 'attention';
      bodyStart = k + 1;                 // drop the verdict line from the body
    } else {
      // No explicit verdict line; infer loosely, keep the line in the body.
      if (low.includes('clean') || low.startsWith('ok')) verdict = 'ok';
      bodyStart = k;
    }
    break;
  }

  const body = lines.slice(bodyStart).join('\n').trim();
  return { verdict, body: body || raw };
}

function buildEmail(listing, verdict, body) {
  const flag = verdict === 'attention' ? 'NEEDS A LOOK' : 'looks fine';
  const subject = `[PAM check] ${listing.id} - ${flag}`;

  const text =
`Automated sanity check on a new listing (still "Pending review").

Listing:   ${listing.id}
Name:      ${listing.name}
Commodity: ${listing.commodity}
Country:   ${listing.country}  (${listing.region})
District:  ${listing.district}
Asset:     ${listing.asset_type}
Stage:     ${listing.stage || '(none)'}
Licence:   ${listing.licence}
Area:      ${listing.area_ha == null ? '(none)' : listing.area_ha + ' ha'}
Price:     ${listing.price_label || '(none)'}
Verified:  ${listing.verified === true ? 'Yes' : 'No'}
Contact:   ${listing.contact_email || '(none)'}

Verdict: ${verdict.toUpperCase()}

${body}

----
Automated review, not a substitute for your own check.`;

  const color = verdict === 'attention' ? '#7A2A2A' : '#1F5232';
  const row = (k, v) => `<tr><td style="padding:2px 12px 2px 0;color:#5a4e44;vertical-align:top">${esc(k)}</td><td>${esc(v)}</td></tr>`;

  const html =
`<div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#221C18;max-width:680px">
  <p style="margin:0 0 6px;color:#5a4e44">Automated sanity check on a new listing (still &ldquo;Pending review&rdquo;).</p>
  <h2 style="margin:8px 0 4px;font-size:18px">${esc(listing.name)} <span style="color:#5a4e44;font-weight:400">(${esc(listing.id)})</span></h2>
  <p style="margin:0 0 14px;font-weight:700;color:${color}">Verdict: ${esc(verdict.toUpperCase())}</p>
  <table style="border-collapse:collapse;margin:0 0 16px;font-size:14px">
    ${row('Commodity', listing.commodity)}
    ${row('Country', listing.country + ' (' + listing.region + ')')}
    ${row('District', listing.district)}
    ${row('Asset type', listing.asset_type)}
    ${row('Stage', listing.stage || '(none)')}
    ${row('Licence', listing.licence)}
    ${row('Area', listing.area_ha == null ? '(none)' : listing.area_ha + ' ha')}
    ${row('Price', listing.price_label || '(none)')}
    ${row('Verified', listing.verified === true ? 'Yes' : 'No')}
    ${row('Contact', listing.contact_email || '(none)')}
  </table>
  <div style="white-space:pre-wrap;line-height:1.55;font-size:14px;border-top:1px solid #e7e0d6;padding-top:14px">${esc(body)}</div>
  <p style="margin:16px 0 0;font-size:12px;color:#8a7f73">Automated review, not a substitute for your own check.</p>
</div>`;

  return { subject, text, html };
}

// Cheap possible-duplicate signal: count other listings sharing the exact
// auto-generated name. Never throws (returns 0 on any error).
async function countPossibleDuplicates(listing) {
  try {
    const { rows } = await query(
      `SELECT count(*)::int AS c FROM listings WHERE name = $1 AND id <> $2`,
      [listing.name, listing.id]
    );
    return rows[0] ? rows[0].c : 0;
  } catch (_) {
    return 0;
  }
}

/**
 * Run the check and email the result. Fire-and-forget; never throws.
 * @param {object} listing - the raw DB row returned by the INSERT in createListing.
 */
export async function runListingSanityCheck(listing) {
  try {
    if (!listing || !listing.id) return;
    const dupes = await countPossibleDuplicates(listing);
    const listingText = describe(listing, dupes);
    const raw = await askClaude(listingText);
    const { verdict, body } = parseReply(raw);
    const mail = buildEmail(listing, verdict, body);
    await sendMail({ to: NOTIFY_TO, ...mail });
    logger.info({ id: listing.id, verdict }, 'Listing sanity check sent');
  } catch (err) {
    // Swallow: a failed check must never affect listing submission. The existing
    // ops-notification email still tells the operator a listing came in.
    logger.error({ err, id: listing && listing.id }, 'Listing sanity check failed');
  }
}
