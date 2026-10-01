import * as wmill from 'windmill-client';

const GUEST_LIST = 'u/brianne/brixx_guest_list';

type Guest = { id: string; name: string; phone: string; sentAt?: string | null; rsvpName?: string | null };
type Settings = { link: string; message: string };

// Saves the whole guest list and message settings. This page is private and used
// by one person, so a simple overwrite is all that's needed.
export async function main(guests: Guest[], settings: Settings) {
  const clean = (Array.isArray(guests) ? guests : [])
    .slice(0, 500)
    .map((g) => ({
      id: String(g.id).slice(0, 40),
      name: String(g.name ?? '').trim().slice(0, 100),
      phone: String(g.phone ?? '').trim().slice(0, 20),
      sentAt: g.sentAt ? String(g.sentAt) : null,
      rsvpName: g.rsvpName ? String(g.rsvpName).slice(0, 100) : null,
    }))
    .filter((g) => g.name && g.phone);
  await wmill.setState(
    {
      guests: clean,
      settings: { link: String(settings?.link ?? '').trim().slice(0, 500), message: String(settings?.message ?? '').slice(0, 1000) },
      savedAt: new Date().toISOString(),
    },
    GUEST_LIST,
  );
  return { ok: true, count: clean.length };
}
