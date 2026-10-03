import React, { useEffect, useRef, useState } from 'react';
import { backend } from './wmill';
import { LEAF, INNER, MID, PRIM, FINE, JUNCTION } from './leaf';
import { PHOTO_BIRTH, PHOTO_MONTH_1, PHOTO_MONTH_2, PHOTO_MONTH_3, PHOTO_MONTH_4, PHOTO_MONTH_5, PHOTO_DAYCARE, PHOTO_CHICAGO, PHOTO_WATER_PARK } from './photos';

// ── Brixx's first year ───────────────────────────────────────────────────
// Add, remove or reorder entries freely.
//   heading: the big line on the card (e.g. "Month 4")
//   title:   optional headline under it
//   weight:  shows as a small tag with a scale icon
//   events:  everything that happened that month, drawn as a dotted timeline
//            (use { text, trip: 'car' | 'plane' } to animate a road trip or flight)
//   photo:   '' for a leaf-shaped placeholder, or an image URL cut into a leaf
// A moment is plain text, or { text, trip } to draw a little road trip (car) or flight (plane) under it.
type Moment = string | { text: string; trip: 'car' | 'plane' };
type Milestone = { when?: string; heading: string; title?: string; note?: string; weight?: string; events?: Moment[]; photo?: string };
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
  {
    heading: 'Month 6',
    weight: '21 lbs 14 oz',
    events: [{ text: 'Road trip to Texas and Louisiana', trip: 'car' }, 'Met his cousins (and his first time playing with other babies)', 'First day of daycare!'],
    photo: PHOTO_DAYCARE,
  },
  { heading: 'Month 7', events: ['Learned to hold his own bottle', { text: 'Road trip to Chicago', trip: 'car' }], photo: PHOTO_CHICAGO },
  {
    heading: 'Month 8',
    weight: '25 lbs 12 oz',
    events: ['Sat up and rolled over', { text: 'Mini road trip to Ohio', trip: 'car' }, 'Went to a water park', { text: 'First flight to Las Vegas. Got his wings!', trip: 'plane' }],
    photo: PHOTO_WATER_PARK,
  },
  {
    heading: 'Month 9',
    weight: '25 lbs 14 oz',
    events: [{ text: 'Road trip to Boston, with stops in Ontario (Canada), New York, Portland (Maine) and New Hampshire', trip: 'car' }],
    photo: '',
  },
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

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// A dotted route that draws itself while a little car (or plane) travels along it.
// Rendered only once its card scrolls into view, so the animation starts then.
function Trip({ kind, id }: { kind: 'car' | 'plane'; id: string }) {
  const still = prefersReducedMotion();
  const d =
    kind === 'plane'
      ? 'M10,38 C60,38 80,8 130,8 S206,22 226,22'
      : 'M10,24 C40,10 62,34 92,22 S146,8 172,24 S206,20 226,20';
  const dur = kind === 'plane' ? '2.6s' : '3s';
  return (
    <svg className={`trip trip-${kind}`} viewBox="0 0 240 46" aria-hidden="true">
      <defs>
        <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="46">
          <path d={d} pathLength={1} fill="none" stroke="#fff" strokeWidth={10} strokeDasharray="1 1" strokeDashoffset={still ? 0 : 1}>
            {!still && <animate attributeName="stroke-dashoffset" from="1" to="0" dur={dur} begin="0.3s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.3 1" />}
          </path>
        </mask>
      </defs>
      <path d={d} className="trip-route" mask={`url(#${id}-mask)`} />
      <circle cx="10" cy={kind === 'plane' ? 38 : 24} r="3.5" className="trip-start" />
      <circle cx="226" cy={kind === 'plane' ? 22 : 20} r="4.5" className="trip-end" />
      <g className="trip-vehicle" transform={still ? `translate(226 ${kind === 'plane' ? 22 : 20})` : undefined}>
        {!still && <animateMotion dur={dur} begin="0.3s" fill="freeze" path={d} rotate="auto" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.45 0 0.3 1" />}
        {kind === 'car' ? (
          <g transform="scale(1.3) translate(-12 -13)">
            <path d="M3 13 L5 8 Q6 6 8 6 L14 6 Q16 6 17 8 L19 11 L21 12 Q22 12.5 22 14 L22 16 L2 16 L2 14 Q2 13 3 13 Z" className="veh-body" />
            <path d="M7 8.2 L9 8.2 L9 11 L5.6 11 Z M10.6 8.2 L14 8.2 L16.2 11 L10.6 11 Z" className="veh-window" />
            <circle cx="6.5" cy="16.5" r="2.6" className="veh-wheel" />
            <circle cx="17.5" cy="16.5" r="2.6" className="veh-wheel" />
          </g>
        ) : (
          <g transform="scale(1.3) translate(-12 -10)">
            <path d="M2 10 Q2 8.6 4 8.6 L19 8.6 Q23 8.6 23.5 10 Q23 11.4 19 11.4 L4 11.4 Q2 11.4 2 10 Z" className="veh-body" />
            <path d="M10 8.8 L14 1.5 L16.5 1.5 L14.5 8.8 Z M10 11.2 L14 18.5 L16.5 18.5 L14.5 11.2 Z M3 8.8 L2.5 5 L4.5 5 L6.5 8.8 Z" className="veh-body" />
          </g>
        )}
      </g>
    </svg>
  );
}

function MilestoneItem({ m, i }: { m: Milestone; i: number }) {
  const [ref, inView] = useReveal<HTMLLIElement>();
  return (
    <li
      ref={ref}
      className={`milestone ${inView ? 'is-in' : ''}`}
      // Each month's leaf on the vine is a little bigger than the last, like the kalo growing.
      style={{ transitionDelay: `${Math.min(i, 2) * 60}ms`, '--grow': 0.75 + (0.85 * i) / Math.max(1, MILESTONES.length - 1) } as React.CSSProperties}
    >
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
            {m.events.map((e, j) => {
              const text = typeof e === 'string' ? e : e.text;
              const trip = typeof e === 'string' ? null : e.trip;
              return (
                <li key={j} className="event" style={{ transitionDelay: `${250 + j * 160}ms` }}>
                  <span className="event-dot" aria-hidden="true" />
                  <span className="event-text">
                    {text}
                    {trip && inView && <Trip kind={trip} id={`trip-${i}-${j}`} />}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </li>
  );
}

// Faint kalo leaves drifting behind the milestones (computer screens only, see CSS).
const BG_LEAVES = [
  { x: 6, y: 8, s: 120, r: -24, speed: 0.18, sway: 11 },
  { x: 84, y: 18, s: 90, r: 30, speed: 0.32, sway: 14 },
  { x: 12, y: 46, s: 70, r: 12, speed: 0.42, sway: 9 },
  { x: 88, y: 58, s: 140, r: -40, speed: 0.14, sway: 16 },
  { x: 4, y: 82, s: 100, r: 48, speed: 0.26, sway: 12 },
  { x: 80, y: 92, s: 80, r: -8, speed: 0.38, sway: 10 },
];

function BackgroundLeaves({ visible }: { visible: boolean }) {
  return (
    <div className={`bg-leaves ${visible ? 'is-visible' : ''}`} aria-hidden="true">
      {BG_LEAVES.map((l, i) => (
        <span
          key={i}
          className="bg-leaf"
          style={
            {
              left: `${l.x}%`,
              top: `${l.y}%`,
              width: `${l.s}px`,
              '--speed': l.speed,
              '--rot': `${l.r}deg`,
              '--sway': `${l.sway}s`,
            } as React.CSSProperties
          }
        >
          <svg viewBox="0 0 600 660">
            <path d={LEAF} />
            <path d={MID} className="bg-leaf-vein" />
          </svg>
        </span>
      ))}
    </div>
  );
}

function Milestones() {
  const [ref, inView] = useReveal<HTMLDivElement>();
  const sectionRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLOListElement | null>(null);
  const fillRef = useRef<HTMLLIElement | null>(null);
  const [inSection, setInSection] = useState(false);

  // The vine fills in green down to the middle of the screen as you scroll,
  // and each month's leaf unfurls once the vine reaches it. The same scroll
  // position drives the drifting background leaves.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const list = listRef.current;
      const section = sectionRef.current;
      if (!list || !section) return;
      const rect = list.getBoundingClientRect();
      const reach = window.innerHeight * 0.62 - rect.top;
      const grown = Math.max(0, Math.min(rect.height, reach));
      if (fillRef.current) fillRef.current.style.height = `${grown}px`;
      list.querySelectorAll<HTMLLIElement>(':scope > .milestone').forEach((li) => {
        li.classList.toggle('is-reached', li.offsetTop + 18 <= grown);
      });
      const srect = section.getBoundingClientRect();
      setInSection(srect.top < window.innerHeight && srect.bottom > 0);
      document.documentElement.style.setProperty('--about-scroll', `${Math.round(-srect.top)}`);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={sectionRef} className="about" aria-labelledby="about-title">
      <BackgroundLeaves visible={inSection} />
      <div ref={ref} className={`section-head ${inView ? 'is-in' : ''}`}>
        <p className="eyebrow">A year of</p>
        <h2 id="about-title">BRIXX</h2>
        <p className="lede">Twelve months of firsts, and the kalo keeps growing.</p>
      </div>
      <ol ref={listRef} className="timeline">
        <li className="vine-fill" ref={fillRef} aria-hidden="true" />
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

/**
 * Smoothly scroll the page to an element, slow enough to glide through the
 * milestones on the way. Any touch, wheel or key press hands control back.
 */
function glideTo(el: Element | null, onArrive?: () => void) {
  if (!el) return;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const target = Math.min(maxScroll, Math.max(0, el.getBoundingClientRect().top + window.scrollY - 24));
  const start = window.scrollY;
  const distance = target - start;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || Math.abs(distance) < 4) {
    window.scrollTo(0, target);
    onArrive?.();
    return;
  }
  const duration = Math.min(3200, Math.max(800, Math.abs(distance) * 0.9));
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let cancelled = false;
  const cancel = () => (cancelled = true);
  const events = ['wheel', 'touchstart', 'keydown'];
  events.forEach((ev) => window.addEventListener(ev, cancel, { once: true, passive: true }));
  const t0 = performance.now();
  const step = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - t0) / duration);
    window.scrollTo(0, start + distance * ease(t));
    if (t < 1) requestAnimationFrame(step);
    else {
      events.forEach((ev) => window.removeEventListener(ev, cancel));
      onArrive?.();
    }
  };
  requestAnimationFrame(step);
}

function RsvpInvite({ onOpen }: { onOpen: () => void }) {
  const [ref, inView] = useReveal<HTMLDivElement>();
  return (
    <section ref={ref} className={`cta ${inView ? 'is-in' : ''}`} aria-labelledby="cta-title">
      <h2 id="cta-title">Will you celebrate with us?</h2>
      <p>
        <span className="nowrap">Saturday, 21 November</span> · <span className="nowrap">4:00 PM</span> · <span className="nowrap">Kāneʻohe</span>
      </p>
      <button type="button" className="submit cta-button" id="cta-rsvp" onClick={onOpen}>
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

  // The floating RSVP pill appears at the bottom of the screen (just under the
  // down arrow) as soon as the guest starts scrolling, and hides again while the
  // big RSVP section is on screen so the two never overlap.
  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const cta = document.querySelector('.cta');
    let io: IntersectionObserver | undefined;
    if (cta && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting), { threshold: 0 });
      io.observe(cta);
    }
    return () => {
      window.removeEventListener('scroll', onScroll);
      io?.disconnect();
    };
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
          <button type="button" className="scroll-cue" aria-label="Scroll down to Brixx’s first year" onClick={() => glideTo(document.querySelector('.about'))}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
        <Milestones />
        <RsvpInvite onOpen={() => setOpen(true)} />
      </main>
      <button
        type="button"
        className={`float-rsvp ${showFloat ? 'is-shown' : ''}`}
        onClick={() => glideTo(document.querySelector('.cta'), () => setOpen(true))}
        tabIndex={showFloat ? 0 : -1}
        aria-hidden={!showFloat}
      >
        RSVP
      </button>
      <RsvpSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
