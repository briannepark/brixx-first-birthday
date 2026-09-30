import * as wmill from 'windmill-client';
import nodemailer from 'nodemailer';

// Where the notification email comes from and goes to. Both live in Windmill
// (not in this repo), so no address or password is ever committed:
//   - SMTP resource (type "smtp"): host, port, user, password
//   - Variable: the address that should receive RSVP notifications
const SMTP_RESOURCE = 'u/brianne/rsvp_smtp';
const NOTIFY_EMAIL_VARIABLE = 'u/brianne/rsvp_notify_email';

type Result = { ok: true } | { ok: false; error: string };

const clean = (s: unknown, max: number) => String(s ?? '').trim().slice(0, max);
const count = (n: unknown) => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) ? Math.min(20, Math.max(0, v)) : 0;
};

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
  const diet = yes ? clean(dietary, 1000) : '';
  const msg = clean(note, 1000);

  const sql = wmill.datatable('main');

  const before = await sql`
    SELECT count(*) AS n FROM brixx_birthday.rsvps WHERE lower(name) = lower(${guest})
  `.fetchOneScalar();

  await sql`
    INSERT INTO brixx_birthday.rsvps (name, attending, adults, kids, dietary, note)
    VALUES (${guest}, ${yes}, ${a}, ${k}, ${diet || null}, ${msg || null})
  `.execute();

  // Totals use each guest's latest answer, so a changed RSVP isn't double-counted.
  const totals: any = await sql`
    SELECT
      count(*) FILTER (WHERE attending)                    AS yes_parties,
      count(*) FILTER (WHERE NOT attending)                AS no_parties,
      coalesce(sum(adults) FILTER (WHERE attending), 0)    AS adults,
      coalesce(sum(kids)   FILTER (WHERE attending), 0)    AS kids
    FROM (
      SELECT DISTINCT ON (lower(name)) *
      FROM brixx_birthday.rsvps
      ORDER BY lower(name), created_at DESC
    ) latest
  `.fetchOne();

  // The RSVP is saved at this point; a mail problem shouldn't show the guest an error.
  try {
    const smtp: any = await wmill.getResource(SMTP_RESOURCE);
    const to = await wmill.getVariable(NOTIFY_EMAIL_VARIABLE);
    const port = Number(smtp.port ?? 587);
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port,
      secure: port === 465,
      auth: { user: smtp.user, pass: smtp.password },
    });

    const updated = Number(before) > 0;
    const answer = yes ? `Yes: ${a} adult${a === 1 ? '' : 's'}, ${k} kid${k === 1 ? '' : 's'}` : "Can't make it";
    const lines = [
      `${guest}${updated ? ' updated their RSVP' : ' sent an RSVP'} for Brixx's 1st birthday.`,
      '',
      `Answer: ${answer}`,
      diet ? `Dietary notes: ${diet}` : '',
      msg ? `Note for Brixx: ${msg}` : '',
      '',
      'Running totals (latest answer per guest)',
      `Coming: ${totals.yes_parties} RSVPs, ${totals.adults} adults, ${totals.kids} kids (${Number(totals.adults) + Number(totals.kids)} people)`,
      `Not coming: ${totals.no_parties}`,
    ].filter((l, i, arr) => l !== '' || (arr[i - 1] ?? '') !== '');

    await transporter.sendMail({
      from: `"Brixx's RSVPs" <${smtp.user}>`,
      to,
      subject: `RSVP ${updated ? '(updated) ' : ''}from ${guest}: ${yes ? `yes, ${a + k} coming` : "can't make it"}`,
      text: lines.join('\n'),
    });
  } catch (err) {
    console.log('RSVP saved, but the notification email failed:', err);
  }

  return { ok: true };
}
