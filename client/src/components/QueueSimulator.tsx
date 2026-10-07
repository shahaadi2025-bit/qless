import React, { useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Zap, RotateCcw, UserPlus, BellRing } from 'lucide-react';

interface Person {
  id: number;
  label: string;
  mine?: boolean;
  vip?: boolean;
  leaving?: boolean;
}

const tokenLabel = (n: number) => `A-${String(n).padStart(3, '0')}`;
const initialQueue = (): Person[] =>
  Array.from({ length: 7 }, (_, i) => ({ id: i + 1, label: tokenLabel(11 + i), mine: i === 6 }));

const STEP = 56;
const OFFSET = 128;
const MAX_WAITING = 11;

// A small playable queue: call the next person, add people, or boost to move up.
export const QueueSimulator: React.FC = () => {
  const [people, setPeople] = useState<Person[]>(initialQueue);
  const [serving, setServing] = useState('--');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const nextId = useRef(8);
  const nextLabel = useRef(18);

  const waiting = people.filter((p) => !p.leaving);
  const myPos = waiting.findIndex((p) => p.mine);
  const boosted = people.some((p) => p.mine && p.vip);

  const callNext = () => {
    if (busy || done || waiting.length === 0) return;
    const first = waiting[0];
    setBusy(true);
    setServing(first.label);
    setPeople((ps) => ps.map((p) => (p.id === first.id ? { ...p, leaving: true } : p)));
    window.setTimeout(() => {
      setPeople((ps) => ps.filter((p) => p.id !== first.id));
      setBusy(false);
      if (first.mine) {
        setDone(true);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 }, disableForReducedMotion: true });
      }
    }, 450);
  };

  const boost = () => {
    if (boosted || done || myPos < 0) return;
    setPeople((ps) => {
      const mine = ps.find((p) => p.mine);
      if (!mine) return ps;
      const rest = ps.filter((p) => !p.mine);
      const leaving = rest.filter((p) => p.leaving);
      const vips = rest.filter((p) => !p.leaving && p.vip);
      const others = rest.filter((p) => !p.leaving && !p.vip);
      return [...leaving, ...vips, { ...mine, vip: true }, ...others];
    });
  };

  const addPerson = () => {
    if (done || waiting.length >= MAX_WAITING) return;
    setPeople((ps) => [...ps, { id: nextId.current++, label: tokenLabel(nextLabel.current++) }]);
  };

  const reset = () => {
    nextId.current = 8;
    nextLabel.current = 18;
    setPeople(initialQueue());
    setServing('--');
    setBusy(false);
    setDone(false);
  };

  // Horizontal slot of every person (people who are leaving slide off to the left).
  let slot = 0;
  const placed = people.map((p) => ({ p, x: p.leaving ? -80 : OFFSET + slot++ * STEP }));

  const status = done
    ? 'It is your turn. Walk in now!'
    : myPos === 0
    ? 'You are next. Time to head over.'
    : `You are number ${myPos + 1} in line, about ${myPos * 3} minutes to go.`;

  return (
    <div className="max-w-3xl mx-auto rounded-3xl glass-panel border border-white/10 p-4 sm:p-6 space-y-5">
      <div className="relative overflow-x-auto rounded-2xl bg-dark-950/60 border border-white/10">
        <div className="relative h-28" style={{ width: Math.max(560, OFFSET + (waiting.length + 1) * STEP) }}>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[104px] h-[72px] rounded-xl border border-brand-500/40 bg-brand-500/10 flex flex-col items-center justify-center">
            <span className="text-[9px] font-bold tracking-widest text-brand-300">NOW SERVING</span>
            <span key={serving} className="pop-in text-xl font-black font-mono text-white">{serving}</span>
          </div>
          {placed.map(({ p, x }) => (
            <div key={p.id} className="queue-person" style={{ transform: `translate(${x}px, 0)`, opacity: p.leaving ? 0 : 1 }}>
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center text-[9px] font-extrabold font-mono ${
                  p.mine ? 'bg-brand-500 text-white ring-4 ring-brand-500/30' : p.vip ? 'bg-amber-400 text-dark-950' : 'bg-slate-700 text-slate-200'
                }`}
              >
                {p.label}
              </div>
              {(p.mine || p.vip) && (
                <span className={`absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-extrabold ${p.mine ? 'text-brand-300' : 'text-amber-300'}`}>
                  {p.mine ? 'YOU' : 'VIP'}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-sm font-semibold text-white" aria-live="polite">
        <BellRing className="inline w-4 h-4 text-brand-400 mr-1.5 -mt-0.5" />
        {status}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button onClick={callNext} disabled={busy || done} className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-extrabold shadow-lg shadow-brand-500/25 disabled:opacity-50">
          Call next token
        </button>
        <button onClick={boost} disabled={boosted || done} className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-dark-950 text-xs font-extrabold flex items-center gap-1.5 disabled:opacity-50">
          <Zap className="w-3.5 h-3.5" /> {boosted ? 'Priority active' : 'Boost my place'}
        </button>
        <button onClick={addPerson} disabled={done || waiting.length >= MAX_WAITING} className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
          <UserPlus className="w-3.5 h-3.5" /> Add a person
        </button>
        <button onClick={reset} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold flex items-center gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>
    </div>
  );
};