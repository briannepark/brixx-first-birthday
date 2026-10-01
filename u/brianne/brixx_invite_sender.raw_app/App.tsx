import React, { useEffect, useMemo, useRef, useState } from 'react';
import { backend } from './wmill';

type Guest = { id: string; name: string; phone: string; sentAt?: string | null; rsvpName?: string | null };
type Settings = { link: string; message: string };
type Rsvp = { name: string; attending: boolean; adults: number; keiki: number; at: string };
type Filter = 'all' | 'todo' | 'waiting' | 'responded';

const DEFAULT_MESSAGE =
  'Aloha {first}! You’re invited to Brixx’s 1st birthday on Saturday, November 21 at 4:00 PM in Kāneʻohe. ' +
  'Tap to see the invitation and RSVP: {link}';

// ── Helpers ──────────────────────────────────────────────────────────────
const key = (name: string) => String(name ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const isApple = () => /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);

/** Turn "(808) 555-1234", "808.555.1234", "+1 808 555 1234" into "+18085551234". */
function normalizePhone(raw: string): string | null {
  const plus = raw.trim().startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (plus && digits.length >= 8 && digits.length <= 15) return '+' + digits;
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return null;
}

function prettyPhone(p: string) {
  const m = p.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : p;
}

/** One guest per line: a name plus a phone number, in any order, separated by commas, tabs or spaces. */
function parseGuestLines(text: string) {
  const added: { name: string; phone: string }[] = [];
  const skipped: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw) continue;
    const match = raw.match(/\+?\(?\d[\d\s().-]{8,}\d/);
    const phone = match ? normalizePhone(match[0]) : null;
    const name = (match ? raw.replace(match[0], ' ') : raw).replace(/[,;\t|]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!phone || !name) skipped.push(raw);
    else added.push({ name, phone });
  }
  return { added, skipped };
}

function fillMessage(template: string, guest: Guest, link: string) {
  // "The Nakamura ohana" reads better in full than as "The".
  const first = /^the\s/i.test(guest.name) ? guest.name : guest.name.split(/\s+/)[0];
  return template.replaceAll('{first}', first).replaceAll('{name}', guest.name).replaceAll('{link}', link || '[link]');
}

function smsHref(phone: string, body: string) {
  // iPhone/Mac use "&body=", Android uses "?body=".
  return `sms:${phone}${isApple() ? '&' : '?'}body=${encodeURIComponent(body)}`;
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// ── App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [settings, setSettings] = useState<Settings>({ link: '', message: DEFAULT_MESSAGE });
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [filter, setFilter] = useState<Filter>('all');
  const [paste, setPaste] = useState('');
  const [importNote, setImportNote] = useState<{ added: number; dupes: number; skipped: string[] } | null>(null);
  const dirty = useRef(false);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const res: any = await backend.load({});
        setGuests(res.guests ?? []);
        if (res.settings) setSettings({ link: res.settings.link ?? '', message: res.settings.message || DEFAULT_MESSAGE });
        setRsvps(res.rsvps ?? []);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Auto-save shortly after any change
  useEffect(() => {
    if (!loaded || !dirty.current) return;
    setSaveState('saving');
    const t = window.setTimeout(async () => {
      try {
        await backend.save({ guests, settings });
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [guests, settings, loaded]);

  const change = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) => (v: React.SetStateAction<T>) => {
    dirty.current = true;
    setter(v);
  };
  const updateGuests = change(setGuests);
  const updateSettings = change(setSettings);

  // RSVP matching: a manual match wins, otherwise exact name match.
  const rsvpByKey = useMemo(() => new Map(rsvps.map((r) => [key(r.name), r])), [rsvps]);
  const rsvpFor = (g: Guest) => rsvpByKey.get(key(g.rsvpName || g.name)) ?? null;
  const matchedKeys = new Set(guests.map((g) => rsvpFor(g)).filter(Boolean).map((r) => key(r!.name)));
  const unmatchedRsvps = rsvps.filter((r) => !matchedKeys.has(key(r.name)));

  const stats = {
    total: guests.length,
    texted: guests.filter((g) => g.sentAt).length,
    responded: guests.filter((g) => rsvpFor(g)).length,
  };

  const visible = guests.filter((g) => {
    if (filter === 'todo') return !g.sentAt;
    if (filter === 'waiting') return g.sentAt && !rsvpFor(g);
    if (filter === 'responded') return !!rsvpFor(g);
    return true;
  });

  function importGuests() {
    const { added, skipped } = parseGuestLines(paste);
    const known = new Set(guests.map((g) => g.phone));
    let dupes = 0;
    const fresh: Guest[] = [];
    for (const a of added) {
      if (known.has(a.phone)) {
        dupes++;
        continue;
      }
      known.add(a.phone);
      fresh.push({ id: newId(), name: a.name, phone: a.phone, sentAt: null, rsvpName: null });
    }
    updateGuests((gs) => [...gs, ...fresh]);
    setImportNote({ added: fresh.length, dupes, skipped });
    setPaste(skipped.join('\n'));
  }

  const preview = guests[0] ?? { id: 'x', name: 'Auntie Lei', phone: '' };
  const linkMissing = !settings.link.trim();

  if (!loaded) return <main className="page"><p className="muted">Loading your guest list…</p></main>;

  return (
    <main className="page">
      <header className="head">
        <p className="eyebrow">Brixx turns one</p>
        <h1>Send invitations</h1>
        <p className="muted">
          Tap <b>Text</b> next to a guest and your Messages app opens with their personal invite ready. Hit send there, then come back for the next one.
        </p>
      </header>

      {loadError && (
        <p className="alert" role="alert">
          Couldn’t load the saved list: {loadError}
        </p>
      )}

      <section className="stats" aria-label="Progress">
        <div><b>{stats.total}</b><span>Guests</span></div>
        <div><b>{stats.texted}</b><span>Texted</span></div>
        <div><b>{stats.responded}</b><span>RSVP’d</span></div>
      </section>
      {stats.total > 0 && (
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${(stats.texted / stats.total) * 100}%` }} />
        </div>
      )}

      {/* ── Message ── */}
      <section className="card">
        <h2>1. Your message</h2>
        <label className="field">
          <span>Invitation link</span>
          <input
            type="url"
            inputMode="url"
            placeholder="Paste the public link to the invitation page"
            value={settings.link}
            onChange={(e) => updateSettings((s) => ({ ...s, link: e.target.value }))}
          />
        </label>
        <label className="field">
          <span>Text message</span>
          <textarea rows={4} value={settings.message} onChange={(e) => updateSettings((s) => ({ ...s, message: e.target.value }))} />
          <small className="muted">
            <code>{'{first}'}</code> becomes the guest’s first name, <code>{'{name}'}</code> their full name, <code>{'{link}'}</code> the invitation link.{' '}
            <button type="button" className="linkish" onClick={() => updateSettings((s) => ({ ...s, message: DEFAULT_MESSAGE }))}>
              Reset to default
            </button>
          </small>
        </label>
        <div className="bubble-wrap" aria-label="Preview">
          <p className="bubble-label">Preview for {preview.name}</p>
          <p className="bubble">{fillMessage(settings.message, preview, settings.link)}</p>
        </div>
      </section>

      {/* ── Import ── */}
      <section className="card">
        <h2>2. Add guests</h2>
        <label className="field">
          <span>Paste names and phone numbers, one guest per line</span>
          <textarea
            rows={5}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={'Auntie Lei, (808) 555-0101\nUncle Kai 808-555-0102\nThe Nakamuras\t+1 808 555 0103'}
          />
          <small className="muted">Copy straight from a spreadsheet or your notes. Numbers without a country code are treated as US.</small>
        </label>
        <button type="button" className="btn" onClick={importGuests} disabled={!paste.trim()}>
          Add to guest list
        </button>
        {importNote && (
          <p className="note" role="status">
            Added {importNote.added} guest{importNote.added === 1 ? '' : 's'}
            {importNote.dupes ? `, skipped ${importNote.dupes} already on the list` : ''}.
            {importNote.skipped.length > 0 && (
              <> {importNote.skipped.length} line{importNote.skipped.length === 1 ? '' : 's'} need a name and a full phone number, left in the box above to fix.</>
            )}
          </p>
        )}
      </section>

      {/* ── Guests ── */}
      <section className="card">
        <div className="list-head">
          <h2>3. Text your guests</h2>
          <span className={`save ${saveState}`} aria-live="polite">
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Couldn’t save, will retry on next change' : ''}
          </span>
        </div>

        {linkMissing && guests.length > 0 && <p className="alert">Add the invitation link in step 1 before texting.</p>}

        <div className="filters" role="group" aria-label="Show">
          {(
            [
              ['all', `All (${stats.total})`],
              ['todo', `Not texted (${stats.total - stats.texted})`],
              ['waiting', 'Waiting on RSVP'],
              ['responded', `RSVP’d (${stats.responded})`],
            ] as [Filter, string][]
          ).map(([f, label]) => (
            <button key={f} type="button" className={`chip ${filter === f ? 'is-on' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {label}
            </button>
          ))}
        </div>

        {guests.length === 0 ? (
          <p className="muted empty">No guests yet. Paste your list in step 2.</p>
        ) : visible.length === 0 ? (
          <p className="muted empty">Nobody here.</p>
        ) : (
          <ul className="guests">
            {visible.map((g) => {
              const r = rsvpFor(g);
              const body = fillMessage(settings.message, g, settings.link.trim());
              return (
                <li key={g.id} className="guest">
                  <div className="guest-main">
                    <p className="guest-name">{g.name}</p>
                    <p className="guest-phone">{prettyPhone(g.phone)}</p>
                    <div className="tags">
                      {g.sentAt ? <span className="tag sent">Texted {shortDate(g.sentAt)}</span> : <span className="tag">Not texted</span>}
                      {r ? (
                        <span className={`tag ${r.attending ? 'yes' : 'no'}`}>
                          RSVP {r.attending ? `yes · ${r.adults} adult${r.adults === 1 ? '' : 's'}, ${r.keiki} keiki` : 'no'}
                        </span>
                      ) : null}
                    </div>
                    {!r && unmatchedRsvps.length > 0 && (
                      <label className="match">
                        <span>RSVP’d under another name?</span>
                        <select
                          value=""
                          onChange={(e) => {
                            const v = e.target.value;
                            updateGuests((gs) => gs.map((x) => (x.id === g.id ? { ...x, rsvpName: v } : x)));
                          }}
                        >
                          <option value="">Match an RSVP…</option>
                          {unmatchedRsvps.map((u) => (
                            <option key={u.name} value={u.name}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <div className="guest-actions">
                    <a
                      className={`btn text ${g.sentAt ? 'is-sent' : ''} ${linkMissing ? 'is-disabled' : ''}`}
                      href={linkMissing ? undefined : smsHref(g.phone, body)}
                      aria-disabled={linkMissing}
                      onClick={(e) => {
                        if (linkMissing) return e.preventDefault();
                        updateGuests((gs) => gs.map((x) => (x.id === g.id ? { ...x, sentAt: new Date().toISOString() } : x)));
                      }}
                    >
                      {g.sentAt ? 'Text again' : 'Text'}
                    </a>
                    <details className="more">
                      <summary aria-label={`More options for ${g.name}`}>More</summary>
                      <div className="more-menu">
                        {g.sentAt && (
                          <button type="button" onClick={() => updateGuests((gs) => gs.map((x) => (x.id === g.id ? { ...x, sentAt: null } : x)))}>
                            Mark as not texted
                          </button>
                        )}
                        {g.rsvpName && (
                          <button type="button" onClick={() => updateGuests((gs) => gs.map((x) => (x.id === g.id ? { ...x, rsvpName: null } : x)))}>
                            Unmatch RSVP
                          </button>
                        )}
                        <button
                          type="button"
                          className="danger"
                          onClick={() => window.confirm(`Remove ${g.name} from the list?`) && updateGuests((gs) => gs.filter((x) => x.id !== g.id))}
                        >
                          Remove guest
                        </button>
                      </div>
                    </details>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="muted foot">
        Texts send from your own phone number, one at a time. On a computer, the Text button opens Messages if your phone is linked to it; otherwise
        open this page on your phone.
      </p>
    </main>
  );
}
