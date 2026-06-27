import config from '../config.js';
import logger from '../lib/logger.js';
import { sendMail } from '../lib/mailer.js';
import { query } from '../db/pool.js';

/**
 * Claude-powered "rough sanity check" for newly submitted listings.
 *
 * Called fire-and-forget from createListing() the moment a listing is saved
 * (while it is still "Pending review"). It asks Claude to eyeball the listing
 * for obvious problems, then emails the verdict to the operator. It NEVER
 * throws and NEVER blocks submission: any failure is logged and swallowed.
 *
 * Requirements:
 *   - process.env.ANTHROPIC_API_KEY set in the Render environment.
 *   - Node 18+ (global fetch). Render's runtime provides this.
 */

// Where the sanity-check result is sent. Change this one line if you ever want a
// different recipient (or point it at config.mail.opsNotify to reuse the ops address).
const NOTIFY_TO = 'mark@panafricanmines.com';

// Cheapest/fastest model - plenty for a rough check. Swap to 'claude-sonnet-4-6'
// if you ever want sharper review at a slightly higher per-listing cost.
const MODEL = 'claude-haiku-4-5-20251001';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Build a plain, readable description of the listing for Claude to review.
function describe(l, duplicateCount) {
  const lines = [
    `ID: ${l.id}`,
    `Name (auto-generated): ${l.name}`,
    `Asset type: ${l.asset_type}`,
    `Commodity: ${l.commodity}  (family: ${l.family})`,
    `Country: ${l.country}  (region: ${l.region})`,
    `Location / district: ${l.district}`,
    `Licence type: ${l.licence}`,
    `Area: ${l.area_ha == null ? '(none)' : l.area_ha + ' ha'}`,
    `Stage: ${l.stage || '(none)'}`,
    `Price band: ${l.price_label || '(none)'}  (parsed value: ${l.price_val == null ? 'n/a' : l.price_val})`,
    `Open to joint venture: ${l.joint_venture === true ? 'Yes' : l.joint_venture === false ? 'No' : 'not answered'}`,
    `Contact email: ${l.contact_email || '(none provided)'}`,
  ];
  if (duplicateCount > 0) {
    lines.push(`NOTE: ${duplicateCount} existing listing(s) already share this exact auto-generated name - possible duplicate.`);
  }
  return lines.join('\n');
}

const PROMPT_INTRO =
`You are a reviewer doing a quick sanity check on a newly submitted listing for PanAfricanMines, a marketplace for mining licences and mineral assets across Africa. A human operator will still review it; your job is only to flag anything that looks off so they know where to look.

Check for:
- missing or empty key fields;
- country that is not a real African country;
- commodity that is not a plausible mineral/mining commodity;
- area or price that looks implausible (zero, absurd, or nonsensical);
- placeholder, test, or junk text (e.g. "test", "asdf", "xxx", "TBD", lorem ipsum);
- a contact email that is missing or malformed;
- internal inconsistency (e.g. district/region that doesn't match the country);
- anything else a human reviewer should double-check.

Respond with ONLY a JSON object, no prose, no code fences:
{"verdict":"ok" | "attention","summary":"<one short sentence>","issues":["<concise concern>", "..."]}
Use "ok" when nothing notable stands out (issues may be an empty list). Use "attention" if a human should take a closer look. Keep each issue short.

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
      max_tokens: 600,
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

// Tolerant parse: strip any stray code fences, pull the first {...} block.
function parseVerdict(text) {
  let t = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1);
  const obj = JSON.parse(t);
  return {
    verdict: obj.verdict === 'attention' ? 'attention' : 'ok',
    summary: typeof obj.summary === 'string' ? obj.summary : '',
    issues: Array.isArray(obj.issues) ? obj.issues.filter((x) => typeof x === 'string') : [],
  };
}

function buildEmail(listing, v) {
  const flag = v.verdict === 'attention' ? 'NEEDS A LOOK' : 'looks fine';
  const subject = `[PAM check] ${listing.id} - ${flag}`;

  const issuesText = v.issues.length
    ? v.issues.map((x) => ` - ${x}`).join('\n')
    : ' - none';

  const text =
`Automated sanity check on a new listing (still "Pending review").

Listing:   ${listing.id}
Name:      ${listing.name}
Commodity: ${listing.commodity}
Country:   ${listing.country}
District:  ${listing.district}
Licence:   ${listing.licence}
Price:     ${listing.price_label || '(none)'}
Contact:   ${listing.contact_email || '(none)'}

Claude's verdict: ${v.verdict.toUpperCase()}${v.summary ? ' - ' + v.summary : ''}

Points to check:
${issuesText}

This is an automated rough check, not a substitute for your own review.`;

  const issuesHtml = v.issues.length
    ? '<ul>' + v.issues.map((x) => `<li>${esc(x)}</li>`).join('') + '</ul>'
    : '<p style="color:#5a4e44">No specific concerns flagged.</p>';

  const color = v.verdict === 'attention' ? '#7A2A2A' : '#1F5232';

  const html =
`<div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#221C18;max-width:640px">
  <p style="margin:0 0 6px;color:#5a4e44">Automated sanity check on a new listing (still &ldquo;Pending review&rdquo;).</p>
  <h2 style="margin:8px 0 4px;font-size:18px">${esc(listing.name)} <span style="color:#5a4e44;font-weight:400">(${esc(listing.id)})</span></h2>
  <p style="margin:0 0 14px;font-weight:600;color:${color}">Claude's verdict: ${esc(v.verdict.toUpperCase())}${v.summary ? ' &ndash; ' + esc(v.summary) : ''}</p>
  <table style="border-collapse:collapse;margin:0 0 14px;font-size:14px">
    <tr><td style="padding:2px 12px 2px 0;color:#5a4e44">Commodity</td><td>${esc(listing.commodity)}</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#5a4e44">Country</td><td>${esc(listing.country)}</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#5a4e44">District</td><td>${esc(listing.district)}</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#5a4e44">Licence</td><td>${esc(listing.licence)}</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#5a4e44">Price</td><td>${esc(listing.price_label || '(none)')}</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#5a4e44">Contact</td><td>${esc(listing.contact_email || '(none)')}</td></tr>
  </table>
  <p style="margin:0 0 4px;font-weight:600">Points to check:</p>
  ${issuesHtml}
  <p style="margin:16px 0 0;font-size:12px;color:#8a7f73">This is an automated rough check, not a substitute for your own review.</p>
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

    let verdict;
    try {
      verdict = parseVerdict(raw);
    } catch (_) {
      // If Claude didn't return clean JSON, still send something useful.
      verdict = { verdict: 'attention', summary: 'Automated check returned an unexpected format - please review manually.', issues: [raw.slice(0, 500)] };
    }

    const mail = buildEmail(listing, verdict);
    await sendMail({ to: NOTIFY_TO, ...mail });
    logger.info({ id: listing.id, verdict: verdict.verdict }, 'Listing sanity check sent');
  } catch (err) {
    // Swallow: a failed check must never affect listing submission. The existing
    // ops-notification email still tells the operator a listing came in.
    logger.error({ err, id: listing && listing.id }, 'Listing sanity check failed');
  }
}
