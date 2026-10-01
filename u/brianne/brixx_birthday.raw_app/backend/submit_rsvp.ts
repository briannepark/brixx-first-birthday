import * as wmill from 'windmill-client';
import nodemailer from 'nodemailer';

// Everything lives in your Windmill workspace (not in this repo):
//   - SMTP resource (type "smtp"): host, port, user, password
//   - Variable: the address that should receive RSVP notifications
//   - The RSVP list itself, kept as a Windmill resource that's created
//     automatically on the first RSVP (Resources → u/brianne/brixx_rsvps)
const SMTP_RESOURCE = 'u/brianne/rsvp_smtp';
const NOTIFY_EMAIL_VARIABLE = 'u/brianne/rsvp_notify_email';
const RSVP_STORE = 'u/brianne/brixx_rsvps';

type Rsvp = {
  id: string;
  at: string;
  name: string;
  attending: boolean;
  adults: number;
  keiki: number;
  dietary: string;
  note: string;
};
type Result = { ok: true } | { ok: false; error: string };

const clean = (s: unknown, max: number) => String(s ?? '').trim().slice(0, max);
const count = (n: unknown) => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) ? Math.min(20, Math.max(0, v)) : 0;
};
const key = (name: string) => name.toLowerCase().replace(/\s+/g, ' ');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hawaiiTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { timeZone: 'Pacific/Honolulu', dateStyle: 'medium', timeStyle: 'short' });

async function readAll(): Promise<Rsvp[]> {
  const stored = await wmill.getState(RSVP_STORE);
  const list: any[] = Array.isArray(stored?.rsvps) ? stored.rsvps : [];
  // Older entries (before ids existed) get a stable id from their contents.
  return list.map((r, i) => ({ ...r, id: r.id ?? `legacy-${i}-${r.at}`, keiki: r.keiki ?? r.kids ?? 0 }));
}

/**
 * Append safely. Two guests submitting at the same moment could otherwise
 * overwrite each other's write. After writing, we re-read and confirm our entry
 * is there; if another write replaced it, we merge again and retry.
 * Nothing is ever removed: every submission (including changed answers) is kept.
 */
async function appendSafely(entry: Rsvp): Promise<Rsvp[]> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const current = await readAll();
    if (!current.some((r) => r.id === entry.id)) current.push(entry);
    current.sort((a, b) => a.at.localeCompare(b.at));
    await wmill.setState({ rsvps: current }, RSVP_STORE);
    await sleep(150 + Math.random() * 350);
    const check = await readAll();
    if (check.some((r) => r.id === entry.id)) return check;
  }
  throw new Error('Could not save RSVP after several attempts');
}

// ── Summaries ────────────────────────────────────────────────────────────
function summarize(all: Rsvp[]) {
  const history = new Map<string, Rsvp[]>();
  for (const r of all) {
    const k = key(r.name);
    history.set(k, [...(history.get(k) ?? []), r]);
  }
  const latest = [...history.values()].map((h) => h[h.length - 1]);
  const yes = latest.filter((r) => r.attending);
  return {
    history,
    latest: latest.sort((a, b) => Number(b.attending) - Number(a.attending) || a.name.localeCompare(b.name)),
    responded: latest.length,
    yesCount: yes.length,
    noCount: latest.length - yes.length,
    adults: yes.reduce((s, r) => s + r.adults, 0),
    keiki: yes.reduce((s, r) => s + r.keiki, 0),
  };
}

// ── CSV (opens in Excel / Google Sheets) ─────────────────────────────────
const cell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s; // stop Excel treating text as a formula
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function toCsv(all: Rsvp[], sum: ReturnType<typeof summarize>) {
  const row = (r: Rsvp, extra: unknown[] = []) => [
    r.name, r.attending ? 'Yes' : 'No', r.attending ? r.adults : 0, r.attending ? r.keiki : 0, r.dietary, r.note, hawaiiTime(r.at), ...extra,
  ];
  const header = ['Name', 'Coming', 'Adults', 'Keiki', 'Dietary notes', 'Note for Brixx', 'Time (Hawaii)'];
  const lines: unknown[][] = [
    ['SUMMARY'],
    ['Responded', sum.responded],
    ['Yes', sum.yesCount],
    ['No', sum.noCount],
    ['Adults coming', sum.adults],
    ['Keiki coming', sum.keiki],
    ['Total people', sum.adults + sum.keiki],
    [],
    ['CURRENT RESPONSES (latest answer per guest)'],
    [...header, 'Times responded'],
    ...sum.latest.map((r) => row(r, [sum.history.get(key(r.name))!.length])),
    [],
    ['ALL SUBMISSIONS (full history, oldest first)'],
    header,
    ...all.map((r) => row(r)),
  ];
  return '﻿' + lines.map((l) => l.map(cell).join(',')).join('\r\n') + '\r\n';
}

// ── HTML email ───────────────────────────────────────────────────────────
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const C = { green: '#5B7642', dark: '#3F5330', cream: '#F5F0E2', paper: '#ECE6D8', panel: '#F7F3EA', line: '#D6CDB9', ink: '#2B3522', muted: '#5D6552', no: '#8A6A4F' };
const FONT = `font-family:'Jost','Helvetica Neue',Arial,sans-serif;`;

function statCell(label: string, value: number, strong = false) {
  return `<td align="center" width="33%" style="width:33%;padding:14px 6px;${FONT}background:${strong ? C.green : '#ffffff'};border:1px solid ${C.line};">
    <div style="font-size:26px;font-weight:700;color:${strong ? C.cream : C.dark};line-height:1;">${value}</div>
    <div style="margin-top:6px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${strong ? C.cream : C.muted};">${label}</div>
  </td>`;
}

function answerPill(r: Rsvp) {
  return r.attending
    ? `<span style="display:inline-block;padding:2px 10px;border-radius:99px;background:${C.green};color:${C.cream};font-size:12px;font-weight:600;">Yes</span>`
    : `<span style="display:inline-block;padding:2px 10px;border-radius:99px;background:#EADFD3;color:${C.no};font-size:12px;font-weight:600;">No</span>`;
}

function toHtml(entry: Rsvp, updated: boolean, sum: ReturnType<typeof summarize>) {
  const th = (t: string, align = 'left') =>
    `<th align="${align}" style="padding:10px 8px;${FONT}font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${C.cream};background:${C.dark};">${t}</th>`;
  const rows = sum.latest
    .map((r, i) => {
      const h = sum.history.get(key(r.name))!;
      const prev = h.length > 1 ? h[h.length - 2] : null;
      const isNew = r.id === entry.id;
      const bg = isNew ? '#FFF6D9' : i % 2 ? C.panel : '#ffffff';
      const changed = prev
        ? `<div style="margin-top:4px;font-size:11px;color:${C.muted};">Updated · was ${prev.attending ? `Yes (${prev.adults} adult${prev.adults === 1 ? '' : 's'}, ${prev.keiki} keiki)` : 'No'}</div>`
        : '';
      const extras = [r.dietary && `<b>Dietary:</b> ${esc(r.dietary)}`, r.note && `<b>Note:</b> ${esc(r.note)}`].filter(Boolean).join('<br>');
      const td = `padding:10px 8px;${FONT}font-size:14px;color:${C.ink};border-bottom:1px solid ${C.line};vertical-align:top;`;
      return `<tr style="background:${bg};">
        <td style="${td}"><b>${esc(r.name)}</b>${isNew ? ` <span style="font-size:11px;color:${C.green};font-weight:700;">NEW</span>` : ''}${changed}
          ${extras ? `<div style="margin-top:6px;font-size:12px;color:${C.muted};line-height:1.45;">${extras}</div>` : ''}</td>
        <td align="center" style="${td}">${answerPill(r)}</td>
        <td align="center" style="${td}">${r.attending ? r.adults : '–'}</td>
        <td align="center" style="${td}">${r.attending ? r.keiki : '–'}</td>
      </tr>`;
    })
    .join('');

  const headline = `${esc(entry.name)} ${updated ? 'updated their RSVP' : 'just RSVP’d'}: ${
    entry.attending ? `<b>Yes</b> · ${entry.adults} adult${entry.adults === 1 ? '' : 's'}, ${entry.keiki} keiki` : `<b>No</b>`
  }`;

  return `<!doctype html><html><body style="margin:0;padding:0;background:${C.paper};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${C.line};">
  <tr><td style="background:${C.green};padding:22px 24px;${FONT}">
    <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.cream};opacity:.85;">Brixx turns one · RSVPs</div>
    <div style="margin-top:6px;font-size:18px;color:${C.cream};line-height:1.4;">${headline}</div>
  </td></tr>

  <tr><td style="padding:22px 24px 6px;${FONT}">
    <div style="font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};margin-bottom:10px;">Summary</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed;">
      <tr>${statCell('Responded', sum.responded)}${statCell('Yes', sum.yesCount)}${statCell('No', sum.noCount)}</tr>
    </table>
    <div style="height:8px;"></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed;">
      <tr>${statCell('Adults (yes)', sum.adults)}${statCell('Keiki (yes)', sum.keiki, true)}${statCell('Total people', sum.adults + sum.keiki)}</tr>
    </table>
    <div style="margin-top:6px;font-size:12px;color:${C.muted};">Keiki count = goodie bags. Counts use each guest’s latest answer.</div>
  </td></tr>

  <tr><td style="padding:22px 24px 8px;${FONT}">
    <div style="font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};margin-bottom:10px;">Responses</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${C.line};">
      <tr>${th('Guest')}${th('Coming', 'center')}${th('Adults', 'center')}${th('Keiki', 'center')}</tr>
      ${rows}
    </table>
  </td></tr>

  <tr><td style="padding:14px 24px 24px;${FONT}font-size:12px;color:${C.muted};line-height:1.5;">
    The full spreadsheet is attached as <b>brixx-rsvps.csv</b> (opens in Excel or Google Sheets), including every change a guest made.
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function toText(entry: Rsvp, updated: boolean, sum: ReturnType<typeof summarize>) {
  const lines = [
    `${entry.name} ${updated ? 'updated their RSVP' : 'sent an RSVP'}: ${entry.attending ? `Yes, ${entry.adults} adults, ${entry.keiki} keiki` : 'No'}`,
    '',
    `Responded: ${sum.responded}   Yes: ${sum.yesCount}   No: ${sum.noCount}`,
    `Adults (yes): ${sum.adults}   Keiki (yes): ${sum.keiki}   Total people: ${sum.adults + sum.keiki}`,
    '',
    'Responses:',
    ...sum.latest.map((r) => `- ${r.name}: ${r.attending ? `Yes (${r.adults} adults, ${r.keiki} keiki)` : 'No'}`),
    '',
    'Full spreadsheet attached: brixx-rsvps.csv',
  ];
  return lines.join('\n');
}

// ── Entry point ──────────────────────────────────────────────────────────
export async function main(
  name: string,
  attending: boolean,
  adults: number = 0,
  kids: number = 0,
  dietary: string = '',
  note: string = '',
  website: string = '', // honeypot: people never see this field, bots fill it
): Promise<Result> {
  if (clean(website, 200)) return { ok: true };

  const guest = clean(name, 100);
  if (!guest) return { ok: false, error: 'Please add your name.' };
  const yes = attending === true;
  const a = yes ? count(adults) : 0;
  const k = yes ? count(kids) : 0;
  if (yes && a + k === 0) return { ok: false, error: 'Please add at least one guest.' };

  const entry: Rsvp = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    at: new Date().toISOString(),
    name: guest,
    attending: yes,
    adults: a,
    keiki: k,
    dietary: yes ? clean(dietary, 1000) : '',
    note: clean(note, 1000),
  };

  const all = await appendSafely(entry);
  const sum = summarize(all);
  const updated = sum.history.get(key(guest))!.length > 1;

  // The RSVP is saved at this point; a mail problem shouldn't show the guest an error.
  try {
    const smtp: any = await wmill.getResource(SMTP_RESOURCE);
    const to = await wmill.getVariable(NOTIFY_EMAIL_VARIABLE);
    const port = Number(smtp.port ?? 465);
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port,
      secure: port === 465,
      auth: { user: smtp.user, pass: smtp.password },
    });
    await transporter.sendMail({
      from: `"Brixx's RSVPs" <${smtp.user}>`,
      to,
      subject: `RSVP ${updated ? '(updated) ' : ''}from ${guest}: ${yes ? `yes, ${a} adult${a === 1 ? '' : 's'} + ${k} keiki` : 'no'} · ${sum.yesCount} yes so far`,
      text: toText(entry, updated, sum),
      html: toHtml(entry, updated, sum),
      attachments: [{ filename: 'brixx-rsvps.csv', content: toCsv(all, sum), contentType: 'text/csv; charset=utf-8' }],
    });
  } catch (err) {
    console.log('RSVP saved, but the notification email failed:', err);
  }

  return { ok: true };
}
