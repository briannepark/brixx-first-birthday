import * as wmill from 'windmill-client';

// The guest list and message settings live in your workspace as a state resource
// (Resources → filter by type "state" → u/brianne/brixx_guest_list).
const GUEST_LIST = 'u/brianne/brixx_guest_list';
// Read-only: the RSVPs saved by the invitation page, to show who has responded.
const RSVP_STORE = 'u/brianne/brixx_rsvps';

const key = (name: string) => String(name ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

export async function main() {
  const saved = (await wmill.getState(GUEST_LIST)) ?? {};
  const rsvpState = (await wmill.getState(RSVP_STORE)) ?? {};
  const all: any[] = Array.isArray(rsvpState.rsvps) ? rsvpState.rsvps : [];

  // Latest answer per name, so the sender can show who has responded.
  const latest: Record<string, { name: string; attending: boolean; adults: number; keiki: number; at: string }> = {};
  for (const r of all) {
    latest[key(r.name)] = { name: r.name, attending: !!r.attending, adults: r.adults ?? 0, keiki: r.keiki ?? r.kids ?? 0, at: r.at };
  }

  return {
    guests: Array.isArray(saved.guests) ? saved.guests : [],
    settings: saved.settings ?? null,
    rsvps: Object.values(latest),
  };
}
