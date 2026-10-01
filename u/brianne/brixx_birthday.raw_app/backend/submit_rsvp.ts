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

// Spreadsheet-safe CSV cell (also stops Excel from treating text as a formula).
const cell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function toCsv(latest: Rsvp[]) {
  const header = ['Name', 'Coming', 'Adults', 'Keiki', 'Dietary notes', 'Note for Brixx', 'Last updated (Hawaii time)'];
  const time = (iso: string) =>
    new Date(iso).toLocaleString('en-US', { timeZone: 'Pacific/Honolulu', dateStyle: 'medium', timeStyle: 'short' });
  const rows = latest
    .slice()
    .sort((a, b) => Number(b.attending) - Number(a.attending) || a.name.localeCompare(b.name))
    .map((r) => [r.name, r.attending ? 'Yes' : 'No', r.attending ? r.adults : 0, r.attending ? r.keiki : 0, r.dietary, r.note, time(r.at)]);
  const yes = latest.filter((r) => r.attending);
  const totals = ['TOTAL COMING', `${yes.length} RSVPs`, yes.reduce((s, r) => s + r.adults, 0), yes.reduce((s, r) => s + r.keiki, 0), '', '', ''];
  // Leading BOM so Excel reads names like Kāneʻohe correctly.
  return '﻿' + [header, ...rows, [], totals].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

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
    at: new Date().toISOString(),
    name: guest,
    attending: yes,
    adults: a,
    keiki: k,
    dietary: yes ? clean(dietary, 1000) : '',
    note: clean(note, 1000),
  };

  // Keep every submission (full history), newest last.
  const stored = await wmill.getState(RSVP_STORE);
  const all: Rsvp[] = Array.isArray(stored?.rsvps) ? stored.rsvps : [];
  const updated = all.some((r) => key(r.name) === key(guest));
  all.push(entry);
  await wmill.setState({ rsvps: all }, RSVP_STORE);

  // Totals and the spreadsheet use each guest's latest answer only.
  const latestByName = new Map<string, Rsvp>();
  for (const r of all) latestByName.set(key(r.name), r);
  const latest = [...latestByName.values()];
  const coming = latest.filter((r) => r.attending);
  const totalAdults = coming.reduce((s, r) => s + r.adults, 0);
  const totalKeiki = coming.reduce((s, r) => s + r.keiki, 0);

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

    const answer = yes ? `Yes: ${a} adult${a === 1 ? '' : 's'}, ${k} keiki` : "Can't make it";
    const lines = [
      `${guest}${updated ? ' updated their RSVP' : ' sent an RSVP'} for Brixx's 1st birthday.`,
      '',
      `Answer: ${answer}`,
      entry.dietary ? `Dietary notes: ${entry.dietary}` : '',
      entry.note ? `Note for Brixx: ${entry.note}` : '',
      '',
      'Running totals (latest answer per guest)',
      `Coming: ${coming.length} RSVPs, ${totalAdults + totalKeiki} people`,
      `  Adults: ${totalAdults}`,
      `  Keiki: ${totalKeiki}  (goodie bags)`,
      `Not coming: ${latest.length - coming.length}`,
      '',
      'The full guest list is attached (brixx-rsvps.csv, opens in Excel or Google Sheets).',
    ].filter((l, i, arr) => l !== '' || (arr[i - 1] ?? '') !== '');

    await transporter.sendMail({
      from: `"Brixx's RSVPs" <${smtp.user}>`,
      to,
      subject: `RSVP ${updated ? '(updated) ' : ''}from ${guest}: ${yes ? `yes, ${a} adult${a === 1 ? '' : 's'} + ${k} keiki` : "can't make it"}`,
      text: lines.join('\n'),
      attachments: [{ filename: 'brixx-rsvps.csv', content: toCsv(latest), contentType: 'text/csv; charset=utf-8' }],
    });
  } catch (err) {
    console.log('RSVP saved, but the notification email failed:', err);
  }

  return { ok: true };
}
