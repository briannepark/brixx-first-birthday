import React, { useState } from 'react';
import { backend } from './wmill';
import { LEAF, INNER, MID, PRIM, FINE, JUNCTION } from './leaf';

// ── Palette: identical to the printed card ───────────────────────────────
const LEAF_GREEN = '#5B7642';
const mix = (hex: string, t: number, to: number) =>
  '#' +
  [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16))
    .map((c) => Math.round(c + (to - c) * t).toString(16).padStart(2, '0'))
    .join('');
const SHADOW = mix(LEAF_GREEN, 0.38, 0);
const HIGHLIGHT = mix(LEAF_GREEN, 0.32, 255);
const RIDGE = mix(LEAF_GREEN, 0.12, 255);

const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent('45-064 Ka Hanahou Pl, Kaneohe, HI 96744');

// ── The leaf: front is embossed, back carries the details ────────────────
function EmbossLayers() {
  const layers: Array<[number, number, string, number, number]> = [
    [1.3, 1.7, SHADOW, 0.85, 0.55],
    [-1.0, -1.2, HIGHLIGHT, 0.95, 0.6],
    [0, 0, RIDGE, 1, 1],
  ];
  return (
    <>
      {layers.map(([dx, dy, col, op, fineOp], i) => (
        <g
          key={i}
          transform={`translate(${dx},${dy})`}
          stroke={col}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={INNER} strokeOpacity={op} strokeWidth={1.2} />
          <path d={FINE} strokeOpacity={fineOp} strokeWidth={0.9} />
          <path d={PRIM} strokeOpacity={op} strokeWidth={3.2} />
          <path d={MID} strokeOpacity={op} strokeWidth={5.5} />
          <circle cx={JUNCTION.x} cy={JUNCTION.y} r={6.5} strokeOpacity={op} strokeWidth={2} fill={col} />
        </g>
      ))}
    </>
  );
}

function LeafCard() {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="leaf-wrap">
      <button
        type="button"
        className={`leaf ${flipped ? 'is-flipped' : ''}`}
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        aria-label={flipped ? 'Turn the invitation back to the front' : 'Turn the invitation over to see the details'}
      >
        <span className="leaf-inner">
          <span className="leaf-face leaf-front" aria-hidden="true">
            <svg viewBox="0 0 600 660" role="presentation">
              <path d={LEAF} fill={LEAF_GREEN} />
              <EmbossLayers />
            </svg>
          </span>
          <span className="leaf-face leaf-back">
            <svg viewBox="0 0 600 660" aria-hidden="true">
              <path d={LEAF} fill={LEAF_GREEN} transform="translate(600,0) scale(-1,1)" />
            </svg>
            <span className="back-text">
              <span className="name">BRIXX</span>
              <span className="turning">is turning one!</span>
              <span className="small">Please join us to celebrate</span>
              <span className="small">
                Saturday, 21 November 2026
                <br />
                4:00 PM
              </span>
              <span className="small">
                45-064 Ka Hanahou Pl.
                <br />
                Kāneʻohe, HI 96744
              </span>
            </span>
          </span>
        </span>
      </button>
      <p className="hint">{flipped ? 'Tap the leaf to turn it back' : 'Tap the leaf to turn it over'}</p>
    </div>
  );
}

// ── RSVP form ────────────────────────────────────────────────────────────
function Stepper(props: { label: string; value: number; min: number; onChange: (v: number) => void }) {
  const { label, value, min, onChange } = props;
  const id = `stepper-${label.toLowerCase()}`;
  return (
    <div className="stepper">
      <span className="stepper-label" id={id}>
        {label}
      </span>
      <div className="stepper-controls" role="group" aria-labelledby={id}>
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" /></svg>
        </button>
        <output aria-live="polite">{value}</output>
        <button type="button" onClick={() => onChange(Math.min(20, value + 1))} disabled={value >= 20} aria-label={`More ${label.toLowerCase()}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M12 6v12" /></svg>
        </button>
      </div>
    </div>
  );
}

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; attending: boolean; name: string } | { kind: 'error'; message: string };

function RsvpForm() {
  const [name, setName] = useState('');
  const [attending, setAttending] = useState<boolean | null>(null);
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);
  const [dietary, setDietary] = useState('');
  const [note, setNote] = useState('');
  const [website, setWebsite] = useState(''); // hidden from people; bots fill it in
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setStatus({ kind: 'error', message: 'Please add your name.' });
    if (attending === null) return setStatus({ kind: 'error', message: 'Please let us know if you can make it.' });
    if (attending && adults + kids === 0) return setStatus({ kind: 'error', message: 'Please add at least one guest.' });
    setStatus({ kind: 'sending' });
    try {
      const res: any = await backend.submit_rsvp({
        name: name.trim(),
        attending,
        adults: attending ? adults : 0,
        kids: attending ? kids : 0,
        dietary: attending ? dietary.trim() : '',
        note: note.trim(),
        website,
      });
      if (res && res.ok === false) {
        setStatus({ kind: 'error', message: res.error || 'Something went wrong. Please try again.' });
      } else {
        setStatus({ kind: 'done', attending, name: name.trim().split(/\s+/)[0] });
      }
    } catch {
      setStatus({ kind: 'error', message: 'Something went wrong sending your RSVP. Please try again.' });
    }
  }

  if (status.kind === 'done') {
    return (
      <section className="panel thanks" aria-live="polite">
        <h2>Mahalo, {status.name}!</h2>
        <p>
          {status.attending
            ? 'Your RSVP is in. We can’t wait to celebrate Brixx with you.'
            : 'Thank you for letting us know. We’ll miss you and send lots of love your way.'}
        </p>
        <p className="fine">Need to change something? Send it again with the same name and we’ll use your latest answer.</p>
        <button type="button" className="link-button" onClick={() => setStatus({ kind: 'idle' })}>
          Send another RSVP
        </button>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="rsvp-title">
      <h2 id="rsvp-title">RSVP</h2>
      <form onSubmit={submit} noValidate>
        <label className="field">
          <span>Your name</span>
          <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
        </label>

        <fieldset className="field">
          <legend>Will you be there?</legend>
          <div className="choices">
            <label className={`choice ${attending === true ? 'is-on' : ''}`}>
              <input type="radio" name="attending" checked={attending === true} onChange={() => setAttending(true)} />
              <span>Joyfully yes</span>
            </label>
            <label className={`choice ${attending === false ? 'is-on' : ''}`}>
              <input type="radio" name="attending" checked={attending === false} onChange={() => setAttending(false)} />
              <span>Sadly, no</span>
            </label>
          </div>
        </fieldset>

        {attending && (
          <>
            <div className="field steppers">
              <Stepper label="Adults" value={adults} min={0} onChange={setAdults} />
              <Stepper label="Kids" value={kids} min={0} onChange={setKids} />
            </div>
            <label className="field">
              <span>
                Dietary notes <em>optional</em>
              </span>
              <textarea rows={2} value={dietary} onChange={(e) => setDietary(e.target.value)} maxLength={1000} placeholder="Allergies or anything we should know" />
            </label>
          </>
        )}

        <label className="field">
          <span>
            A note for Brixx <em>optional</em>
          </span>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
        </label>

        <label className="hp" aria-hidden="true">
          Leave this empty
          <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>

        {status.kind === 'error' && (
          <p className="error" role="alert">
            {status.message}
          </p>
        )}

        <button type="submit" className="submit" disabled={status.kind === 'sending'}>
          {status.kind === 'sending' ? 'Sending…' : 'Send RSVP'}
        </button>
      </form>
    </section>
  );
}

export default function App() {
  return (
    <main className="page">
      <LeafCard />
      <p className="directions">
        <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
          Get directions
        </a>
      </p>
      <RsvpForm />
    </main>
  );
}
