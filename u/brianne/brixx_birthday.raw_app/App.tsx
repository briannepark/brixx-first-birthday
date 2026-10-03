import React, { useEffect, useRef, useState } from 'react';
import { backend } from './wmill';
import { LEAF, INNER, MID, PRIM, FINE, JUNCTION } from './leaf';
import { PHOTO_BIRTH, PHOTO_MONTH_1, PHOTO_MONTH_2, PHOTO_MONTH_3, PHOTO_MONTH_4, PHOTO_MONTH_5, PHOTO_MONTH_7 } from './photos';

// ── Brixx's first year ───────────────────────────────────────────────────
// Add, remove or reorder entries freely.
//   heading: the big line on the card (e.g. "Month 4")
//   title:   optional headline under it
//   weight:  shows as a small tag with a scale icon
//   events:  everything that happened that month, drawn as a dotted timeline
//   photo:   '' for a leaf-shaped placeholder, or an image URL cut into a leaf
type Milestone = { when?: string; heading: string; title?: string; note?: string; weight?: string; events?: string[]; photo?: string };
const MILESTONES: Milestone[] = [
  { when: 'November 20, 2025', heading: '[Hello, world!]', weight: '10 lbs 2 oz', events: ['Brixx Hāloa Auguillard was born in Michigan'], photo: PHOTO_BIRTH },
  { heading: 'Month 1', weight: '12 lbs 15 oz', events: ['First Thanksgiving'], photo: PHOTO_MONTH_1 },
  { heading: 'Month 2', weight: '15 lbs 4 oz', events: ['First Christmas', 'First bath', 'First time in a high chair'], photo: PHOTO_MONTH_2 },
  { heading: 'Month 3', events: ['Slept in his crib for the first time'], photo: PHOTO_MONTH_3 },
  {
    heading: 'Month 4',
    weight: '18 lbs 6 oz',
    events: ['Held his head steady during tummy time', 'Watched Trolls for the first time (his favorite movie)', 'Slept through the night!', 'First snow angel', 'First Valentine’s Day'],
    photo: PHOTO_MONTH_4,
  },
  { heading: 'Month 5', events: ['First taste of poi', 'First laugh', 'First Easter'], photo: PHOTO_MONTH_5 },
  { heading: 'Month 6', weight: '21 lbs 14 oz', events: ['Road trip to Texas and Louisiana', 'Met his cousins (and his first time playing with other babies)'], photo: '' },
  { heading: 'Month 7', events: ['Road trip to Chicago', 'Learned to hold his own bottle', 'First day of daycare!'], photo: PHOTO_MONTH_7 },
  { heading: 'Month 8', weight: '25 lbs 12 oz', events: ['Sat up and rolled over'], photo: '' },
  { heading: 'Month 9', weight: '25 lbs', events: ['Mini road trip to Ohio', 'Went to a water park'], photo: '' },
  { heading: 'Month 10', weight: '27 lbs 4 oz', events: ['Crawled and started pulling himself up'], photo: '' },
];

// ── Palette: identical to the printed card ───────────────────────────────
const LEAF_GREEN = '#5B7642';
const mix = (hex: string, t: number, to: number) =>
  '#' +
  [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16))
    .map((c) => Math.round(c + (to - c) * t).toString(16).padStart(2, '0'))
    .join('');
// Each main vein as its own path so every vein can grow from its base at the same pace.
const PRIM_PARTS = PRIM.split(/(?=M)/).map((d) => d.trim()).filter(Boolean);
const SHADOW = mix(LEAF_GREEN, 0.38, 0);
const HIGHLIGHT = mix(LEAF_GREEN, 0.32, 255);
const RIDGE = mix(LEAF_GREEN, 0.12, 255);

const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent('45-064 Ka Hanahou Pl, Kaneohe, HI 96744');

// Adds `is-in` once an element scrolls into view (for gentle reveal animations).
function useReveal<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (!('IntersectionObserver' in window)) return setInView(true);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);
  return [ref, inView] as const;
}

// ── The leaf: front is embossed (veins grow in on load), back has details ─
function EmbossLayers() {
  const layers: Array<[number, number, string, number, number]> = [
    [1.3, 1.7, SHADOW, 0.85, 0.55],
    [-1.0, -1.2, HIGHLIGHT, 0.95, 0.6],
    [0, 0, RIDGE, 1, 1],
  ];
  return (
    <>
      {layers.map(([dx, dy, col, op, fineOp], i) => (
        <g key={i} transform={`translate(${dx},${dy})`} stroke={col} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path className="edge-line" d={INNER} strokeOpacity={op} strokeWidth={1.2} />
          <path className="fine" d={FINE} strokeOpacity={fineOp} strokeWidth={0.9} />
          {PRIM_PARTS.map((d, j) => (
            <path key={j} className="vein" pathLength={1} d={d} strokeOpacity={op} strokeWidth={3.2} />
          ))}
          <path className="vein vein-mid" pathLength={1} d={MID} strokeOpacity={op} strokeWidth={5.5} />
          <circle className="junction" cx={JUNCTION.x} cy={JUNCTION.y} r={6.5} strokeOpacity={op} strokeWidth={2} fill={col} />
        </g>
      ))}
    </>
  );
}

function LeafCard() {
  const [flipped, setFlipped] = useState(false);
  const [touched, setTouched] = useState(false);
  return (
    <div className="leaf-wrap">
      <div className="leaf-grow">
        <div className="leaf-sway">
          <button
            type="button"
            className={`leaf ${flipped ? 'is-flipped' : ''}`}
            onClick={() => {
              setFlipped((f) => !f);
              setTouched(true);
            }}
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
                </span>
              </span>
            </span>
          </button>
        </div>
      </div>
      <p className={`hint ${touched ? '' : 'is-pulsing'}`}>{flipped ? 'Tap the leaf to turn it back' : 'Tap the leaf to turn it over'}</p>
    </div>
  );
}

// ── About Brixx: first-year timeline ─────────────────────────────────────
function LeafPhoto({ src, alt, id }: { src?: string; alt: string; id: string }) {
  return (
    <svg className="leaf-photo" viewBox="0 0 600 660" role={src ? 'img' : 'presentation'} aria-label={src ? alt : undefined}>
      <defs>
        <clipPath id={id}>
          <path d={LEAF} />
          {/* fill the thin notch slit so it doesn't cut across a face */}
          <rect x="303" y="100" width="16" height="104" />
        </clipPath>
      </defs>
      {src ? (
        <image href={src} x="0" y="0" width="600" height="660" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} />
      ) : (
        <>
          <path d={LEAF} className="leaf-photo-empty" />
          <text x="300" y="360" textAnchor="middle" className="leaf-photo-label">[Photo]</text>
        </>
      )}
    </svg>
  );
}

function MilestoneItem({ m, i }: { m: Milestone; i: number }) {
  const [ref, inView] = useReveal<HTMLLIElement>();
  return (
    <li ref={ref} className={`milestone ${inView ? 'is-in' : ''}`} style={{ transitionDelay: `${Math.min(i, 2) * 60}ms` }}>
      <span className="milestone-node" aria-hidden="true">
        <svg viewBox="0 0 600 660">
          <path d={LEAF} />
        </svg>
      </span>
      <div className="milestone-card">
        <div className="milestone-top">
        {m.photo !== undefined && <LeafPhoto src={m.photo || undefined} alt={m.heading} id={`ms-photo-${i}`} />}
        <div className="milestone-text">
          {m.when && <p className="milestone-when">{m.when}</p>}
          <h3>{m.heading}</h3>
          {m.title && <p className="milestone-title">{m.title}</p>}
          {m.note && <p>{m.note}</p>}
          {m.weight && (
            <p className="milestone-fact">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3.5" y="4" width="17" height="16" rx="4" />
                <path d="M8 10.5a4 4 0 0 1 8 0" />
                <path d="M12 10.5l1.8-2.2" />
              </svg>
              <span className="sr-only">Weight: </span>
              {m.weight}
            </p>
          )}
        </div>
        </div>
        {m.events && m.events.length > 0 && (
          <ul className="events" aria-label={`${m.heading} moments`}>
            {m.events.map((e, j) => (
              <li key={j} className="event" style={{ transitionDelay: `${250 + j * 160}ms` }}>
                <span className="event-dot" aria-hidden="true" />
                <span className="event-text">{e}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function Milestones() {
  const [ref, inView] = useReveal<HTMLDivElement>();
  return (
    <section className="about" aria-labelledby="about-title">
      <div ref={ref} className={`section-head ${inView ? 'is-in' : ''}`}>
        <p className="eyebrow">A year of</p>
        <h2 id="about-title">BRIXX</h2>
        <p className="lede">Twelve months of firsts, and the kalo keeps growing.</p>
      </div>
      <ol className="timeline">
        {MILESTONES.map((m, i) => (
          <MilestoneItem key={i} m={m} i={i} />
        ))}
      </ol>
    </section>
  );
}

// ── RSVP (opens in a sheet) ──────────────────────────────────────────────
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

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; attending: boolean; name: string } | { kind: 'error'; message: string; detail?: string };

function FallingLeaves() {
  return (
    <div className="falling" aria-hidden="true">
      {Array.from({ length: 9 }).map((_, i) => (
        <svg key={i} viewBox="0 0 600 660" style={{ left: `${6 + i * 11}%`, animationDelay: `${(i % 5) * 0.35}s`, animationDuration: `${3.2 + (i % 3) * 0.6}s` }}>
          <path d={LEAF} />
        </svg>
      ))}
    </div>
  );
}

function RsvpForm({ onClose }: { onClose: () => void }) {
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
    } catch (err) {
      // Keep the friendly message for guests, but surface the real reason
      // (small print + browser console) so problems can be diagnosed.
      const detail = err instanceof Error ? err.message : String(err);
      console.error('submit_rsvp failed:', err);
      setStatus({ kind: 'error', message: 'Something went wrong sending your RSVP. Please try again.', detail: detail.split('\n')[0].slice(0, 240) });
    }
  }

  if (status.kind === 'done') {
    return (
      <div className="thanks" aria-live="polite">
        {status.attending && <FallingLeaves />}
        <h2>Mahalo, {status.name}!</h2>
        <p>
          {status.attending
            ? 'Your RSVP is in. We can’t wait to celebrate Brixx with you.'
            : 'Thank you for letting us know. We’ll miss you and send lots of love your way.'}
        </p>
        <p className="fine">Need to change something? Send it again with the same name and we’ll use your latest answer.</p>
        <button type="button" className="submit" onClick={onClose}>
          Back to the invitation
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <label className="field">
        <span>Your name</span>
        <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required data-autofocus />
      </label>

      <fieldset className="field">
        <legend>Will you be there?</legend>
        <div className="choices">
          <label className={`choice ${attending === true ? 'is-on' : ''}`}>
            <input type="radio" name="attending" checked={attending === true} onChange={() => setAttending(true)} />
            <span>Yes</span>
          </label>
          <label className={`choice ${attending === false ? 'is-on' : ''}`}>
            <input type="radio" name="attending" checked={attending === false} onChange={() => setAttending(false)} />
            <span>No</span>
          </label>
        </div>
      </fieldset>

      {attending && (
        <div className="reveal-in">
          <fieldset className="field">
            <legend>How many are coming?</legend>
            <div className="steppers">
              <Stepper label="Adults" value={adults} min={0} onChange={setAdults} />
              <Stepper label="Keiki" value={kids} min={0} onChange={setKids} />
            </div>
          </fieldset>
          <label className="field">
            <span>
              Dietary notes <em>optional</em>
            </span>
            <textarea rows={2} value={dietary} onChange={(e) => setDietary(e.target.value)} maxLength={1000} placeholder="Allergies or anything we should know" />
          </label>
        </div>
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
          {status.detail && <small className="error-detail">Details: {status.detail}</small>}
        </p>
      )}

      <button type="submit" className="submit" disabled={status.kind === 'sending'}>
        {status.kind === 'sending' ? 'Sending…' : 'Send RSVP'}
      </button>
    </form>
  );
}

function RsvpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>('[data-autofocus], button')?.focus(), 350);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [open, onClose]);

  return (
    <div className={`sheet ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div
        ref={panelRef}
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rsvp-title"
        onTransitionEnd={() => !open && setFormKey((k) => k + 1)}
      >
        <div className="sheet-head">
          <h2 id="rsvp-title">RSVP</h2>
          <button type="button" className="close" onClick={onClose} aria-label="Close RSVP">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <RsvpForm key={formKey} onClose={onClose} />
      </div>
    </div>
  );
}

function RsvpInvite({ onOpen }: { onOpen: () => void }) {
  const [ref, inView] = useReveal<HTMLDivElement>();
  return (
    <section ref={ref} className={`cta ${inView ? 'is-in' : ''}`} aria-labelledby="cta-title">
      <h2 id="cta-title">Will you celebrate with us?</h2>
      <p>Saturday, 21 November · 4:00 PM · Kāneʻohe</p>
      <button type="button" className="submit cta-button" onClick={onOpen}>
        RSVP
      </button>
    </section>
  );
}

export default function App() {
  const [open, setOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);

  // The floating RSVP pill shows once the leaf scrolls away, and hides again
  // when the big RSVP section is on screen so the two never overlap.
  useEffect(() => {
    const hero = heroRef.current;
    const cta = document.querySelector('.cta');
    if (!hero || !cta || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => (e.target === hero ? setPastHero(!e.isIntersecting) : setCtaVisible(e.isIntersecting))),
      { threshold: 0.15 },
    );
    io.observe(hero);
    io.observe(cta);
    return () => io.disconnect();
  }, []);
  const showFloat = pastHero && !ctaVisible && !open;

  return (
    <>
      <main className="page">
        <div ref={heroRef} className="hero">
          <LeafCard />
          <p className="facts">
            <span className="nowrap">Saturday, 21 November 2026</span> · <span className="nowrap">4:00 PM</span>
            <span className="facts-place">45-064 Ka Hanahou Pl., Kāneʻohe, HI 96744</span>
          </p>
          <p className="directions">
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
              Get directions
            </a>
          </p>
        </div>
        <Milestones />
        <RsvpInvite onOpen={() => setOpen(true)} />
      </main>
      <button type="button" className={`float-rsvp ${showFloat ? 'is-shown' : ''}`} onClick={() => setOpen(true)} tabIndex={showFloat ? 0 : -1} aria-hidden={!showFloat}>
        RSVP
      </button>
      <RsvpSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
