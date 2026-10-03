import React, { useEffect, useRef, useState } from 'react';
import { backend } from './wmill';
import { LEAF, INNER, MID, PRIM, FINE, JUNCTION } from './leaf';
import { PHOTO_BIRTH, PHOTO_MONTH_1, PHOTO_MONTH_2, PHOTO_MONTH_3, PHOTO_MONTH_4, PHOTO_MONTH_5, PHOTO_DAYCARE, PHOTO_CHICAGO, PHOTO_WATER_PARK, PHOTO_MONTH_9, PHOTO_MONTH_10 } from './photos';

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
// photo: '' shows a "[Photo]" placeholder. big: the large one-year card at the end.
// album: key into ALBUMS (albums.ts) for the "More photos" gallery; leave it off until there are photos.
type Milestone = { when?: string; heading: string; title?: string; note?: string; weight?: string; events?: Moment[]; photo?: string; big?: boolean; album?: string };
const MILESTONES: Milestone[] = [
  { when: 'November 20, 2025', heading: 'Hello, world!', weight: '10 lbs 2 oz', events: ['Brixx Hāloa Auguillard was born in Troy, Michigan', 'After 4 hours of active labor'], photo: PHOTO_BIRTH },
  { heading: 'Month 1', weight: '12 lbs 15 oz', events: ['First Thanksgiving'], photo: PHOTO_MONTH_1 },
  { heading: 'Month 2', weight: '15 lbs 4 oz', events: ['First bath', 'First time in a high chair', 'First Christmas'], photo: PHOTO_MONTH_2 },
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
    events: [{ text: 'First flight to Las Vegas. Got his wings!', trip: 'plane' }, 'Sat up and rolled over', { text: 'Mini road trip to Ohio', trip: 'car' }, 'Went to a water park'],
    photo: PHOTO_WATER_PARK,
  },
  {
    heading: 'Month 9',
    weight: '25 lbs 14 oz',
    events: [{ text: 'Road trip to Boston, with stops in Ontario (Canada), New York, Portland (Maine) and New Hampshire', trip: 'car' }, 'Ate lobster in Portland, Maine!', 'Rode the swings'],
    photo: PHOTO_MONTH_9,
  },
  { heading: 'Month 10', weight: '27 lbs 4 oz', events: ['Crawling and pulling himself up'], photo: PHOTO_MONTH_10 },
  { heading: 'Month 11', weight: 'TBD', events: ['Stay tuned…'], photo: '' },
  { when: 'November 20, 2026', heading: 'One year old!', photo: '', big: true },
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

// Road trip / flight route animations under moments. Turned off for now; set to true to bring them back.
const SHOW_TRIPS = false;

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

function MilestoneItem({ m, i, onAlbum }: { m: Milestone; i: number; onAlbum: (m: Milestone) => void }) {
  const [ref, inView] = useReveal<HTMLLIElement>();
  return (
    <li
      ref={ref}
      className={`milestone ${inView ? 'is-in' : ''} ${m.big ? 'is-big' : ''}`}
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
        {m.photo !== undefined &&
          (m.album ? (
            // Easter egg: tapping the month's photo opens more photos from that month.
            <button type="button" className="leaf-photo-button" onClick={() => onAlbum(m)} aria-label={`See more photos from ${m.heading}`}>
              <LeafPhoto src={m.photo || undefined} alt={m.heading} id={`ms-photo-${i}`} />
            </button>
          ) : (
            <LeafPhoto src={m.photo || undefined} alt={m.heading} id={`ms-photo-${i}`} />
          ))}
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
                    {SHOW_TRIPS && trip && inView && <Trip kind={trip} id={`trip-${i}-${j}`} />}
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

// ── Photo album ("More photos" on a milestone) ───────────────────────────
// Hidden like an easter egg: there's no button, tapping a month's leaf photo
// opens it (only for months that have an album). Extra photos live in albums.ts and are only loaded when someone opens an
// album, so they don't slow down the page. They open full screen, one at a
// time: swipe (or use the arrows / arrow keys) to move between them.
function AlbumViewer({ milestone, onClose }: { milestone: Milestone | null; onClose: () => void }) {
  const [photos, setPhotos] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const open = !!milestone;

  useEffect(() => {
    if (!milestone?.album) return;
    let alive = true;
    setPhotos(null);
    setIndex(0);
    import('./albums')
      .then((mod) => alive && setPhotos(mod.ALBUMS[milestone.album!] ?? []))
      .catch(() => alive && setPhotos([]));
    return () => {
      alive = false;
    };
  }, [milestone]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => document.querySelector<HTMLElement>('.album .close')?.focus(), 50);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [open]);

  const go = (step: number) => {
    const track = trackRef.current;
    if (!track) return;
    const n = track.children.length;
    const next = Math.max(0, Math.min(n - 1, Math.round(track.scrollLeft / track.clientWidth) + step));
    track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
  };
  const onScroll = () => {
    const track = trackRef.current;
    if (track) setIndex(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
  };

  if (!milestone) return null;
  const count = photos?.length ?? 0;
  return (
    <div className="album" role="dialog" aria-modal="true" aria-label={`${milestone.heading} photos`}>
      <div className="album-head">
        <p>
          <b>{milestone.heading}</b>
          {count > 1 && <span>{index + 1} of {count}</span>}
        </p>
        <button type="button" className="close" onClick={onClose} aria-label="Close photos">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      {photos === null ? (
        <p className="album-status">Loading photos…</p>
      ) : count === 0 ? (
        <p className="album-status">No photos here yet.</p>
      ) : (
        <div className="album-stage">
          <div className="album-track" ref={trackRef} onScroll={onScroll}>
            {photos.map((src, k) => (
              <figure key={k} className="album-slide">
                <img src={src} alt={`${milestone.heading}, photo ${k + 1} of ${count}`} />
              </figure>
            ))}
          </div>
          {count > 1 && (
            <>
              <button type="button" className="album-nav prev" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous photo">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <button type="button" className="album-nav next" onClick={() => go(1)} disabled={index >= count - 1} aria-label="Next photo">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
              </button>
              <div className="album-dots" aria-hidden="true">
                {photos.map((_, k) => (
                  <span key={k} className={k === index ? 'is-on' : ''} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
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
  const [album, setAlbum] = useState<Milestone | null>(null);
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
          <MilestoneItem key={i} m={m} i={i} onAlbum={setAlbum} />
        ))}
      </ol>
      <AlbumViewer milestone={album} onClose={() => setAlbum(null)} />
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

function RsvpSheet({ open, onClose, band }: { open: boolean; onClose: () => void; band: Band | null }) {
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
    <div
      className={`sheet ${open ? 'is-open' : ''} ${band ? 'is-framed' : ''}`}
      aria-hidden={!open}
      style={band ? { position: 'absolute', top: band.top, height: band.bottom - band.top, bottom: 'auto', left: 0, right: 0 } : undefined}
    >
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
  // If this frame can't scroll itself (some phones scroll the outer page
  // instead), let the browser do the smooth scroll across frames.
  if (maxScroll < 4) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (onArrive) window.setTimeout(onArrive, 1100);
    return;
  }
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

// ── Where is the screen? ─────────────────────────────────────────────────
// On iPhones (Safari and Chrome both use WebKit) Windmill's frame is stretched to
// the full height of the invitation and the outer page does the scrolling. Inside
// a frame like that, "fixed to the bottom of the screen" means the bottom of the
// whole invitation, so the pill never shows up. When that happens we work out
// which slice of the invitation is on screen and place the pill (and the RSVP
// sheet) there ourselves. Returns null when normal fixed positioning works.
type Band = { top: number; bottom: number };

function frameIsStretched() {
  let inFrame = true;
  try { inFrame = window.self !== window.top; } catch { inFrame = true; }
  return inFrame && document.documentElement.scrollHeight - window.innerHeight < 4;
}

function useVisibleBand(): Band | null {
  const [band, setBand] = useState<Band | null>(null);
  useEffect(() => {
    let stopped = false;
    let cleanup: (() => void) | undefined;
    let mode: 'none' | 'parent' | 'observer' = 'none';

    const set = (top: number, bottom: number) => {
      if (stopped) return;
      top = Math.round(top);
      bottom = Math.round(bottom);
      setBand((b) => (b && b.top === top && b.bottom === bottom ? b : { top, bottom }));
    };

    // Same-origin parents: read their scroll position directly.
    const viaParents = (): boolean => {
      const chain: Window[] = [];
      try {
        let w: Window = window;
        while (w !== w.parent) {
          if (!w.frameElement) return false;
          chain.push(w);
          w = w.parent;
        }
        chain.push(w);
      } catch {
        return false;
      }
      const top = chain[chain.length - 1];
      const measure = () => {
        let offset = 0;
        for (let i = 0; i < chain.length - 1; i++) {
          const fe = chain[i].frameElement as HTMLElement;
          const r = fe.getBoundingClientRect();
          offset += r.top + (fe.clientTop || 0);
        }
        const vv = top.visualViewport;
        const vTop = vv ? vv.offsetTop : 0;
        const vH = vv ? vv.height : top.innerHeight;
        const docTop = window.scrollY + vTop - offset;
        set(docTop, docTop + vH);
      };
      const subs: Array<() => void> = [];
      for (const w of chain) {
        const fn = () => measure();
        w.document.addEventListener('scroll', fn, { passive: true, capture: true });
        w.addEventListener('resize', fn);
        w.visualViewport?.addEventListener('resize', fn);
        w.visualViewport?.addEventListener('scroll', fn);
        subs.push(() => {
          w.document.removeEventListener('scroll', fn, { capture: true } as any);
          w.removeEventListener('resize', fn);
          w.visualViewport?.removeEventListener('resize', fn);
          w.visualViewport?.removeEventListener('scroll', fn);
        });
      }
      measure();
      cleanup = () => subs.forEach((f) => f());
      return true;
    };

    // Cross-origin parents: the browser still tells us which part of the page is
    // on screen through IntersectionObserver. The page is covered by invisible
    // 200px strips; the strips that are partly on screen give the visible slice.
    const viaObserver = () => {
      if (!('IntersectionObserver' in window)) return;
      const STRIP = 200;
      const layer = document.createElement('div');
      layer.setAttribute('aria-hidden', 'true');
      layer.style.cssText = 'position:absolute;left:0;top:0;width:1px;pointer-events:none;visibility:hidden;';
      document.body.appendChild(layer);
      const visible = new Map<Element, Band>();
      const thresholds = Array.from({ length: 51 }, (_, i) => i / 50);
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const base = Number((e.target as HTMLElement).dataset.top);
          if (e.isIntersecting && e.intersectionRect.height > 0) {
            const top = base + (e.intersectionRect.top - e.boundingClientRect.top);
            visible.set(e.target, { top, bottom: top + e.intersectionRect.height });
          } else visible.delete(e.target);
        }
        if (!visible.size) return;
        let top = Infinity;
        let bottom = -Infinity;
        visible.forEach((v) => { top = Math.min(top, v.top); bottom = Math.max(bottom, v.bottom); });
        set(top, bottom);
      }, { threshold: thresholds });
      let built = 0;
      const build = () => {
        const h = document.documentElement.scrollHeight;
        if (Math.abs(h - built) < 20) return;
        built = h;
        io.disconnect();
        visible.clear();
        layer.textContent = '';
        for (let y = 0; y < h; y += STRIP) {
          const strip = document.createElement('div');
          strip.dataset.top = String(y);
          strip.style.cssText = `position:absolute;left:0;width:1px;top:${y}px;height:${Math.min(STRIP, h - y)}px;`;
          layer.appendChild(strip);
          io.observe(strip);
        }
      };
      build();
      const ro = 'ResizeObserver' in window ? new ResizeObserver(build) : undefined;
      ro?.observe(document.body);
      cleanup = () => { io.disconnect(); ro?.disconnect(); layer.remove(); };
    };

    const check = () => {
      const want = frameIsStretched();
      if (want && mode === 'none') {
        mode = viaParents() ? 'parent' : 'observer';
        if (mode === 'observer') viaObserver();
      } else if (!want && mode !== 'none') {
        cleanup?.();
        cleanup = undefined;
        mode = 'none';
        setBand(null);
      }
    };
    check();
    const t = window.setInterval(check, 1000);
    window.addEventListener('resize', check);
    return () => {
      stopped = true;
      window.clearInterval(t);
      window.removeEventListener('resize', check);
      cleanup?.();
    };
  }, []);
  return band;
}

// ── Keep clear of the browser's toolbars ──────────────────────────────────
// Windmill sizes its frame to the phone's full screen height, but on iPhone
// Chrome (and Safari) the browser's own bottom toolbar covers the lower part of
// that frame. Anything pinned to the bottom (the RSVP pill, the RSVP sheet)
// would sit underneath the toolbar. We measure how much of the frame is actually
// visible and expose it as CSS variables:
//   --hidden-bottom  how much of the frame is covered at the bottom
//   --visible-h      how tall the visible part is (used once, for the hero)
function useToolbarClearance() {
  useEffect(() => {
    const root = document.documentElement;
    const chain: Window[] = [];
    try {
      let w: Window = window;
      while (w !== w.parent) {
        if (!w.frameElement) break;
        chain.push(w);
        w = w.parent;
      }
      chain.push(w);
    } catch {
      /* cross-origin parent: nothing to measure, CSS defaults apply */
    }
    const top = chain[chain.length - 1];
    const ownViewport = () => {
      const vv = window.visualViewport;
      return { top: vv ? vv.offsetTop : 0, bottom: vv ? vv.offsetTop + vv.height : window.innerHeight };
    };
    let lastWidth = -1;
    const measure = () => {
      let visTop = 0;
      let visBottom = window.innerHeight;
      if (chain.length > 1 && top) {
        try {
          let offset = 0;
          for (let i = 0; i < chain.length - 1; i++) {
            const fe = chain[i].frameElement as HTMLElement;
            offset += fe.getBoundingClientRect().top + (fe.clientTop || 0);
          }
          const vv = top.visualViewport;
          const tTop = vv ? vv.offsetTop : 0;
          const tBottom = vv ? vv.offsetTop + vv.height : top.innerHeight;
          visTop = Math.max(0, tTop - offset);
          visBottom = Math.min(window.innerHeight, tBottom - offset);
        } catch {
          const o = ownViewport();
          visTop = o.top;
          visBottom = o.bottom;
        }
      } else {
        const o = ownViewport();
        visTop = o.top;
        visBottom = Math.min(window.innerHeight, o.bottom);
      }
      const hidden = Math.max(0, Math.round(window.innerHeight - visBottom));
      root.style.setProperty('--hidden-bottom', hidden + 'px');
      // The hero height is set once (and again on rotation) so the page doesn't
      // jump around when the browser's toolbars slide in and out.
      if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
        const visH = Math.max(320, Math.round(visBottom - visTop));
        root.style.setProperty('--visible-h', visH + 'px');
      }
    };
    measure();
    const subs: Array<() => void> = [];
    const wins = chain.length ? chain : [window];
    for (const w of wins) {
      try {
        const fn = () => measure();
        w.addEventListener('resize', fn);
        w.visualViewport?.addEventListener('resize', fn);
        w.visualViewport?.addEventListener('scroll', fn);
        w.document.addEventListener('scroll', fn, { passive: true, capture: true });
        subs.push(() => {
          w.removeEventListener('resize', fn);
          w.visualViewport?.removeEventListener('resize', fn);
          w.visualViewport?.removeEventListener('scroll', fn);
          w.document.removeEventListener('scroll', fn, { capture: true } as any);
        });
      } catch {
        /* ignore */
      }
    }
    const t = window.setInterval(measure, 1000);
    return () => {
      window.clearInterval(t);
      subs.forEach((f) => f());
    };
  }, []);
}

export default function App() {
  const [open, setOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const band = useVisibleBand();
  useToolbarClearance();

  const heroRef = useRef<HTMLDivElement | null>(null);

  // The floating RSVP pill appears at the bottom of the screen (just under the
  // down arrow) as soon as the guest starts scrolling, and hides again while the
  // big RSVP section is on screen so the two never overlap.
  //
  // The page runs inside Windmill's frame, and on phones the scrolling can happen
  // in the frame, in a container, or in the outer page. So instead of trusting
  // window.scrollY alone, we watch a 1px marker at the very top of the page:
  // once it leaves the screen (by any kind of scroll), the guest has scrolled.
  useEffect(() => {
    const marker = document.querySelector('.top-marker');
    const cta = document.querySelector('.cta');
    let markerGone = false;
    let rectPast = false;
    const apply = () => setPastHero(markerGone || rectPast || window.scrollY > 8);
    const onAnyScroll = () => {
      rectPast = !!marker && marker.getBoundingClientRect().top < -8;
      apply();
    };
    document.addEventListener('scroll', onAnyScroll, { passive: true, capture: true });
    window.addEventListener('scroll', onAnyScroll, { passive: true });
    let io: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) =>
        entries.forEach((e) => {
          if (e.target === marker) {
            markerGone = !e.isIntersecting;
            apply();
          } else setCtaVisible(e.isIntersecting);
        }),
      );
      if (marker) io.observe(marker);
      if (cta) io.observe(cta);
    }
    onAnyScroll();
    return () => {
      document.removeEventListener('scroll', onAnyScroll, { capture: true } as any);
      window.removeEventListener('scroll', onAnyScroll);
      io?.disconnect();
    };
  }, []);
  const scrolled = pastHero || (!!band && band.top > 8);
  const showFloat = scrolled && !ctaVisible && !open;
  const floatStyle: React.CSSProperties | undefined = band
    ? { position: 'absolute', top: band.bottom - 52 - 20, bottom: 'auto' }
    : undefined;

  return (
    <>
      <main className="page">
        <div className="top-marker" aria-hidden="true" />
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
        style={floatStyle}
        onClick={() => glideTo(document.querySelector('.cta'), () => setOpen(true))}
        tabIndex={showFloat ? 0 : -1}
        aria-hidden={!showFloat}
      >
        RSVP
      </button>
      <RsvpSheet open={open} onClose={() => setOpen(false)} band={band} />
    </>
  );
}
