import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Zap,
  BarChart3,
  Tv,
  Users,
  ShieldCheck,
  IndianRupee,
  Camera,
  Clock,
  Check,
  ChevronDown,
  Smartphone,
  HeartPulse,
  Landmark,
  Scissors,
  Utensils,
  GraduationCap,
  Sparkles,
  Building2,
  MapPin
} from 'lucide-react';
import { useAccount } from '../context/AccountContext.tsx';
import { QueueSimulator } from './QueueSimulator.tsx';

interface LandingPageProps {
  onFindQueue: () => void;
  onPricing: () => void;
  onForBusinesses: () => void;
}

const RUPEE = '\u20B9';

// ---------- small animation helpers ----------
const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = '' }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`reveal ${shown ? 'reveal-in' : ''} ${className}`}>
      {children}
    </div>
  );
};

const CountUp: React.FC<{ to: number; prefix?: string; suffix?: string }> = ({ to, prefix = '', suffix = '' }) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVal(to);
      return;
    }
    let raf = 0;
    let started = false;
    const run = () => {
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 1400);
        setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const obs = new IntersectionObserver(
      (entries) => {
        if (!started && entries.some((e) => e.isIntersecting)) {
          started = true;
          run();
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return (
    <span ref={ref}>
      {prefix}
      {val}
      {suffix}
    </span>
  );
};

// Tilts its content gently towards the mouse (mouse only, and not for people who prefer reduced motion).
const TiltCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${-py * 8}deg)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = '';
  };
  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={reset} className="tilt-card">
      {children}
    </div>
  );
};

const ACTIVITY = [
  'Token A-021 called to Counter 2',
  'Cafe table for 4 is ready',
  'OPD wait dropped to 9 min',
  'Darshan line: about 38 min',
  'Priority boost applied on B-017',
  'New place added: Metro Pharmacy',
  'Salon queue is clear right now',
  'Bank counter 3 is free'
];

// ---------- hero artwork: animated phone with a live token ----------
const HeroPhone: React.FC = () => (
  <svg viewBox="0 0 420 520" className="w-full h-auto max-w-md mx-auto" aria-hidden="true">
    <defs>
      <linearGradient id="lp-screen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#0f2a1d" />
        <stop offset="1" stopColor="#0d1117" />
      </linearGradient>
      <linearGradient id="lp-ring" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4ade80" />
        <stop offset="1" stopColor="#38bdf8" />
      </linearGradient>
    </defs>

    <g transform="translate(210 260)">
      <circle r="190" fill="none" stroke="#22c55e" strokeOpacity="0.12" strokeDasharray="4 10">
        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="60s" repeatCount="indefinite" />
      </circle>
      <circle r="150" fill="none" stroke="#38bdf8" strokeOpacity="0.12" strokeDasharray="2 12">
        <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="45s" repeatCount="indefinite" />
      </circle>
    </g>

    {[
      [60, 70, 0],
      [350, 110, 0.8],
      [380, 400, 1.6],
      [40, 440, 2.4]
    ].map(([x, y, d], i) => (
      <path key={i} d={`M${x} ${Number(y) - 8} L${Number(x) + 2} ${y} L${x} ${Number(y) + 8} L${Number(x) - 2} ${y} Z`} fill="#a7f3d0">
        <animate attributeName="opacity" values="0.1;1;0.1" dur="3s" begin={`${d}s`} repeatCount="indefinite" />
      </path>
    ))}

    <rect x="110" y="24" width="200" height="440" rx="34" fill="#0d1117" stroke="#2d3748" strokeWidth="3" />
    <rect x="122" y="40" width="176" height="408" rx="24" fill="url(#lp-screen)" />
    <rect x="186" y="48" width="48" height="8" rx="4" fill="#1f2937" />

    <text x="210" y="96" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace" letterSpacing="2">YOUR TOKEN</text>
    <circle cx="210" cy="182" r="60" fill="none" stroke="#1f2937" strokeWidth="10" />
    <circle cx="210" cy="182" r="60" fill="none" stroke="url(#lp-ring)" strokeWidth="10" strokeLinecap="round" strokeDasharray="377" strokeDashoffset="377" transform="rotate(-90 210 182)">
      <animate attributeName="stroke-dashoffset" values="377;110;110;377" keyTimes="0;0.5;0.85;1" dur="6s" repeatCount="indefinite" />
    </circle>
    <text x="210" y="190" textAnchor="middle" fill="#ffffff" fontSize="26" fontWeight="800" fontFamily="monospace">A-014</text>

    <text x="210" y="280" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="700">2 people ahead</text>
    <rect x="152" y="294" width="116" height="26" rx="13" fill="#22c55e" fillOpacity="0.18" stroke="#22c55e" strokeOpacity="0.5" />
    <text x="210" y="311" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="700">Leave in 6 min</text>

    {[0, 1, 2, 3, 4, 5].map((i) => (
      <circle key={i} cx={156 + i * 18} cy="360" r="6" fill={i === 3 ? '#4ade80' : '#334155'}>
        {i === 3 && <animate attributeName="cy" values="360;352;360" dur="1.4s" repeatCount="indefinite" />}
      </circle>
    ))}
    <rect x="150" y="388" width="120" height="30" rx="15" fill="#6366f1" />
    <text x="210" y="407" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">Boost priority</text>

    <g>
      <animateTransform attributeName="transform" type="translate" values="0 0; 0 -8; 0 0" dur="4s" repeatCount="indefinite" />
      <rect x="6" y="120" width="124" height="54" rx="14" fill="#0f172a" stroke="#0284C7" strokeOpacity="0.7" />
      <circle cx="26" cy="147" r="8" fill="#0284C7" />
      <text x="42" y="143" fill="#e2e8f0" fontSize="10" fontWeight="700">Hospital OPD</text>
      <text x="42" y="159" fill="#38bdf8" fontSize="10" fontFamily="monospace">~12 min</text>
    </g>
    <g>
      <animateTransform attributeName="transform" type="translate" values="0 0; 0 10; 0 0" dur="5s" repeatCount="indefinite" />
      <rect x="292" y="210" width="124" height="54" rx="14" fill="#0f172a" stroke="#D97706" strokeOpacity="0.7" />
      <circle cx="312" cy="237" r="8" fill="#D97706" />
      <text x="328" y="233" fill="#e2e8f0" fontSize="10" fontWeight="700">Mandir Darshan</text>
      <text x="328" y="249" fill="#fbbf24" fontSize="10" fontFamily="monospace">~38 min</text>
    </g>
    <g>
      <animateTransform attributeName="transform" type="translate" values="0 0; 0 -10; 0 0" dur="4.6s" repeatCount="indefinite" />
      <rect x="4" y="330" width="124" height="54" rx="14" fill="#0f172a" stroke="#DB2777" strokeOpacity="0.7" />
      <circle cx="24" cy="357" r="8" fill="#DB2777" />
      <text x="40" y="353" fill="#e2e8f0" fontSize="10" fontWeight="700">Salon</text>
      <text x="40" y="369" fill="#f472b6" fontSize="10" fontFamily="monospace">~5 min</text>
    </g>
  </svg>
);

const STEP_ART: Record<number, React.ReactNode> = {
  1: (
    <svg viewBox="0 0 80 80" className="w-16 h-16" aria-hidden="true">
      <circle cx="40" cy="62" r="6" fill="none" stroke="#4ade80" strokeWidth="2">
        <animate attributeName="r" values="4;18" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0" dur="2s" repeatCount="indefinite" />
      </circle>
      <path d="M40 14 a16 16 0 0 1 16 16 c0 14 -16 32 -16 32 s-16 -18 -16 -32 a16 16 0 0 1 16 -16 z" fill="#22c55e">
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 -4; 0 0" dur="1.6s" repeatCount="indefinite" />
      </path>
      <circle cx="40" cy="30" r="6" fill="#0d1117" />
    </svg>
  ),
  2: (
    <svg viewBox="0 0 80 80" className="w-16 h-16" aria-hidden="true">
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-6 40 40; 6 40 40; -6 40 40" dur="3s" repeatCount="indefinite" />
        <rect x="12" y="22" width="56" height="36" rx="8" fill="#38bdf8" />
        <circle cx="12" cy="40" r="6" fill="#0d1117" />
        <circle cx="68" cy="40" r="6" fill="#0d1117" />
        <line x1="26" y1="26" x2="26" y2="54" stroke="#0d1117" strokeWidth="2" strokeDasharray="3 3" />
        <text x="47" y="46" textAnchor="middle" fill="#0d1117" fontSize="14" fontWeight="800" fontFamily="monospace">A-14</text>
      </g>
    </svg>
  ),
  3: (
    <svg viewBox="0 0 80 80" className="w-16 h-16" aria-hidden="true">
      <path id="lp-walk" d="M10 60 Q 30 20 50 44 T 72 24" fill="none" stroke="#475569" strokeWidth="2" strokeDasharray="3 4" />
      <circle r="6" fill="#f59e0b">
        <animateMotion dur="3s" repeatCount="indefinite" path="M10 60 Q 30 20 50 44 T 72 24" />
      </circle>
      <circle cx="72" cy="24" r="5" fill="#22c55e" />
    </svg>
  )
};

const VENUES = [
  { icon: HeartPulse, label: 'Hospitals and clinics' },
  { icon: Landmark, label: 'Banks and offices' },
  { icon: Utensils, label: 'Restaurants and cafes' },
  { icon: Sparkles, label: 'Temples' },
  { icon: Scissors, label: 'Salons' },
  { icon: GraduationCap, label: 'Colleges' },
  { icon: Building2, label: 'Government counters' },
  { icon: Smartphone, label: 'Service centres' }
];

const FEATURES = [
  { icon: MapPin, title: 'Find any place nearby', text: 'Pick your location and see real places around you, with photos. Search a name to add any place on the map.' },
  { icon: Bell, title: 'Smart departure alerts', text: 'Leave the crowd. Your phone tells you when you are almost up, so you arrive just in time.' },
  { icon: Zap, title: 'Priority boosts', text: 'Pay a little to move up the line, or include boosts in a plan. Staff screens update instantly.' },
  { icon: Tv, title: 'Counter and kiosk tools', text: 'A one-tap calling console for staff and a walk-in kiosk for people without a phone.' },
  { icon: IndianRupee, title: 'UPI, cards and netbanking', text: 'Pay with any UPI app or through Razorpay. QLESS never sees your card or UPI PIN.' },
  { icon: BarChart3, title: 'Analytics for businesses', text: 'See waits, busy hours and payouts at a glance, with plans that start free.' }
];

const FAQS = [
  { q: 'Is QLESS free?', a: 'Yes. You can find places, join queues and track them live for free. Paid plans add priority boosts for customers and more counters for businesses.' },
  { q: 'How do payments work?', a: 'Pay with any UPI app (scan a QR code or tap to open your app) or use Razorpay for UPI, cards and netbanking. Plans switch on as soon as a payment is confirmed. UPI payments made by entering a reference number are checked by a person first.' },
  { q: 'Do I need to install an app?', a: 'No. QLESS runs in your browser on any phone or computer.' },
  { q: 'Which places can I queue at?', a: 'Hospitals, clinics, banks, restaurants, temples, salons, colleges, government offices and more. Places come from OpenStreetMap, and you can search for any named place to add it.' },
  { q: 'Is my information safe?', a: 'Passwords are stored as salted hashes, sign-in uses signed tokens, and card or UPI PIN details never reach QLESS.' }
];

const PREVIEW_PLANS = [
  { name: 'Free', price: 'Free', note: 'Join any queue', accent: 'bg-white/10' },
  { name: 'Plus', price: `${RUPEE}49/mo`, note: '5 free boosts a month', accent: 'bg-gradient-to-br from-brand-400 to-sky-400', popular: true },
  { name: 'Elite', price: `${RUPEE}149/mo`, note: 'Unlimited boosts', accent: 'bg-white/10' }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onFindQueue, onPricing, onForBusinesses }) => {
  const { account, openAuth } = useAccount();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="space-y-24 pb-8">
      {/* Hero */}
      <section className="relative grid lg:grid-cols-2 gap-10 items-center pt-6">
        <div className="hero-mesh absolute -inset-x-6 -top-10 bottom-0 -z-10 rounded-[3rem] opacity-70" aria-hidden="true" />
        <div className="space-y-6 text-center lg:text-left">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel border border-brand-500/30 text-xs font-semibold text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Live queues, right in your browser
          </span>
          <h1 className="text-5xl sm:text-6xl xl:text-7xl font-black tracking-tight text-white leading-[1.05]">
            STOP WAITING.
            <span className="block text-shimmer">START MOVING.</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-xl mx-auto lg:mx-0">
            Join queues digitally, watch your place in real time, and arrive when it is actually your turn.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <button onClick={onFindQueue} className="px-8 py-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold flex items-center justify-center gap-2 shadow-xl shadow-brand-500/25 hover:-translate-y-0.5 transition-all">
              Find a queue near you <ArrowRight className="w-4 h-4" />
            </button>
            {account ? (
              <button onClick={onPricing} className="px-7 py-4 rounded-xl glass-panel border border-white/15 text-slate-200 hover:text-white font-semibold hover:bg-white/10 transition-all">
                See plans
              </button>
            ) : (
              <button onClick={() => openAuth('signup')} className="px-7 py-4 rounded-xl glass-panel border border-white/15 text-slate-200 hover:text-white font-semibold hover:bg-white/10 transition-all">
                Create free account
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center lg:justify-start text-xs text-slate-400">
            {['No app to install', 'Free to start', 'UPI and cards'].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> {t}</span>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 -z-10 bg-brand-500/10 blur-[110px] rounded-full" />
          <TiltCard>
            <HeroPhone />
          </TiltCard>
        </div>
      </section>

      {/* Marquee */}
      <section className="overflow-hidden border-y border-white/10 py-5" aria-label="Places you can queue at">
        <div className="marquee-track flex gap-10 w-max">
          {[...VENUES, ...VENUES].map((v, i) => (
            <span key={i} className="flex items-center gap-2.5 text-sm font-semibold text-slate-300 whitespace-nowrap">
              <v.icon className="w-5 h-5 text-brand-400" /> {v.label}
            </span>
          ))}
        </div>
      </section>

      {/* Example activity ticker */}
      <section className="-mt-14 overflow-hidden" aria-label="Example queue activity">
        <p className="text-center text-[10px] uppercase tracking-widest text-slate-500 mb-3">Example activity</p>
        <div className="marquee-track flex gap-4 w-max" style={{ animationDuration: '55s', animationDirection: 'reverse' }}>
          {[...ACTIVITY, ...ACTIVITY].map((a, i) => (
            <span key={i} className="flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-white/10 text-xs text-slate-300 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 beacon-live" /> {a}
            </span>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { to: 16, suffix: '', label: 'kinds of places found automatically' },
          { to: 3, suffix: '', label: 'ways to pay: UPI app, QR, cards' },
          { to: 6, suffix: '', label: 'industries supported out of the box' },
          { to: 0, prefix: RUPEE, suffix: '', label: 'to get started' }
        ].map((s, i) => (
          <Reveal key={s.label} delay={i * 80}>
            <div className="card-glow rounded-2xl glass-card border border-white/10 p-5 text-center">
              <p className="text-4xl font-black text-white font-mono"><CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} /></p>
              <p className="text-[11px] text-slate-400 mt-1">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </section>

      {/* How it works */}
      <section className="space-y-8">
        <Reveal>
          <div className="text-center space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-white">How it works</h2>
            <p className="text-sm text-slate-400">Three steps. No standing around.</p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { n: 1, t: 'Find', d: 'Choose your location and see queues around you with live waits and photos.' },
            { n: 2, t: 'Join', d: 'Get a digital token in seconds. Boost it if you are in a hurry.' },
            { n: 3, t: 'Arrive', d: 'We alert you when you are nearly up, so you walk in at the right time.' }
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 120}>
              <div className="card-glow relative h-full rounded-3xl glass-card border border-white/10 p-6 space-y-4">
                <span className="absolute top-4 right-5 text-5xl font-black text-white/5 font-mono">{s.n}</span>
                {STEP_ART[s.n]}
                <h3 className="text-xl font-extrabold text-white">{s.t}</h3>
                <p className="text-sm text-slate-400">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Try it */}
      <section className="space-y-6">
        <Reveal>
          <div className="text-center space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-white">Try it yourself</h2>
            <p className="text-sm text-slate-400">A tiny queue. You are the green token. Call the next person, or boost to move up.</p>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <QueueSimulator />
        </Reveal>
      </section>

      {/* Features */}
      <section className="space-y-8">
        <Reveal>
          <div className="text-center space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-white">Everything a queue needs</h2>
            <p className="text-sm text-slate-400">For the people waiting and the people serving.</p>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 100}>
              <div className="card-glow h-full rounded-3xl glass-card border border-white/10 p-6 space-y-3">
                <div className="w-11 h-11 rounded-xl bg-brand-500/15 flex items-center justify-center"><f.icon className="w-5 h-5 text-brand-400" /></div>
                <h3 className="font-extrabold text-white">{f.title}</h3>
                <p className="text-sm text-slate-400">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Photos band */}
      <section className="grid lg:grid-cols-2 gap-8 items-center">
        <Reveal>
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-300"><Camera className="w-4 h-4" /> SEE BEFORE YOU GO</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Real photos and aerial views of every place</h2>
            <p className="text-sm text-slate-400">QLESS looks for a photo of each place and shows a satellite view when there is none, so you always know what you are walking towards.</p>
          </div>
        </Reveal>
        <Reveal delay={150}>
          <svg viewBox="0 0 400 220" className="w-full h-auto rounded-3xl border border-white/10 bg-gradient-to-br from-sky-900/60 to-emerald-900/40" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line key={`h${i}`} x1="0" x2="400" y1={30 + i * 34} y2={30 + i * 34} stroke="#ffffff" strokeOpacity="0.06" />
            ))}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <line key={`v${i}`} y1="0" y2="220" x1={30 + i * 50} x2={30 + i * 50} stroke="#ffffff" strokeOpacity="0.06" />
            ))}
            <path d="M0 150 C 90 120, 160 190, 260 140 S 360 100, 400 120" fill="none" stroke="#fbbf24" strokeOpacity="0.5" strokeWidth="6" />
            {[[80, 70, '#0284C7'], [190, 110, '#EA580C'], [300, 60, '#DB2777'], [250, 170, '#D97706']].map(([x, y, c], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <circle r="16" fill={String(c)} fillOpacity="0.25">
                  <animate attributeName="r" values="14;22;14" dur="2.4s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
                </circle>
                <circle r="8" fill={String(c)} stroke="#fff" strokeWidth="2" />
              </g>
            ))}
          </svg>
        </Reveal>
      </section>

      {/* Business band */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-dark-800 to-dark-900 p-8 sm:p-12 grid lg:grid-cols-2 gap-8 items-center">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative space-y-4">
          <span className="text-xs font-bold text-brand-300 flex items-center gap-1.5"><Users className="w-4 h-4" /> FOR BUSINESSES</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Run a calmer counter</h2>
          <ul className="space-y-2.5 text-sm text-slate-300">
            {['One-tap calling console for staff', 'Walk-in kiosk for people without phones', 'Analytics and payouts, with plans that start free', 'Low platform commission on paid queues'].map((t) => (
              <li key={t} className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> {t}</li>
            ))}
          </ul>
          <button onClick={onForBusinesses} className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm flex items-center gap-2">
            See business plans <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">
          <svg viewBox="0 0 320 180" className="w-full h-auto" aria-hidden="true">
            <line x1="10" y1="160" x2="310" y2="160" stroke="#ffffff" strokeOpacity="0.15" />
            {[40, 70, 55, 100, 85, 120, 95, 140].map((h, i) => (
              <rect key={i} className="bar-grow" x={22 + i * 36} y={160 - h} width="22" height={h} rx="5" fill={i === 5 ? '#4ade80' : '#334155'} style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
            <text x="14" y="18" fill="#94a3b8" fontSize="10" fontFamily="monospace">AVERAGE WAIT BY HOUR</text>
          </svg>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="space-y-8">
        <Reveal>
          <div className="text-center space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-white">Simple pricing</h2>
            <p className="text-sm text-slate-400">Start free. Upgrade when it helps.</p>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {PREVIEW_PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 100}>
              <div className={`rounded-3xl p-[1.5px] card-glow ${p.accent}`}>
                <div className="rounded-3xl bg-dark-900 p-6 text-center space-y-2 h-full">
                  {p.popular && <span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-500 text-[9px] font-extrabold text-white">MOST POPULAR</span>}
                  <h3 className="font-black text-white text-lg">{p.name}</h3>
                  <p className="text-3xl font-black text-white font-mono">{p.price}</p>
                  <p className="text-xs text-slate-400">{p.note}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="text-center">
          <button onClick={onPricing} className="px-7 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-500/25">Compare all plans</button>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto w-full space-y-6">
        <Reveal><h2 className="text-3xl sm:text-4xl font-black text-white text-center">Questions</h2></Reveal>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <div key={f.q} className="rounded-2xl glass-card border border-white/10 overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left" aria-expanded={openFaq === i}>
                <span className="font-bold text-white text-sm">{f.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && <p className="px-5 pb-4 text-sm text-slate-400">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="gradient-border-anim relative overflow-hidden rounded-3xl p-10 sm:p-14 text-center bg-gradient-to-br from-emerald-700 via-brand-600 to-teal-700">
        <div className="absolute -top-10 -left-10 w-56 h-56 rounded-full bg-white/10 float-slow" />
        <div className="absolute -bottom-16 -right-10 w-72 h-72 rounded-full bg-black/10 float-slow" style={{ animationDelay: '2s' }} />
        <div className="relative space-y-5">
          <h2 className="text-3xl sm:text-5xl font-black text-white">Your time is worth more than a queue.</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onFindQueue} className="px-8 py-4 rounded-xl bg-white text-emerald-800 font-extrabold hover:scale-105 transition-transform">Find a queue now</button>
            {!account && (
              <button onClick={() => openAuth('signup')} className="px-8 py-4 rounded-xl bg-black/20 hover:bg-black/30 text-white font-bold border border-white/30 transition-all">Create free account</button>
            )}
          </div>
        </div>
      </section>

      <footer className="text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <Clock className="w-3.5 h-3.5" /> QLESS - Universal real-time queue platform <ShieldCheck className="w-3.5 h-3.5" />
      </footer>
    </div>
  );
};