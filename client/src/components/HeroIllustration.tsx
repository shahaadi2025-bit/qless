import React from 'react';

const ROWS = [0, 1, 2, 3];
const COLS = [0, 1, 2];
const PEOPLE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SHIRTS = ['#22c55e', '#38bdf8', '#f59e0b', '#f472b6', '#a78bfa'];

// Animated city skyline: five venue types, a moving queue, tokens flying between buildings, a live phone card.
export const HeroIllustration: React.FC = () => (
  <div className="relative max-w-4xl mx-auto select-none" aria-hidden="true">
    <div className="absolute inset-x-10 bottom-0 h-24 rounded-full bg-brand-500/10 blur-3xl" />
    <svg viewBox="0 0 900 290" className="relative w-full h-auto">
      <defs>
        <linearGradient id="qg-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f2937" />
          <stop offset="1" stopColor="#0d1117" />
        </linearGradient>
        <radialGradient id="qg-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#22c55e" stopOpacity="0.35" />
          <stop offset="1" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="450" cy="205" rx="430" ry="38" fill="url(#qg-glow)" />

      {/* Hospital */}
      <g transform="translate(60 70)">
        <rect width="120" height="130" rx="6" fill="#0c3b5e" stroke="#0284C7" strokeWidth="2" />
        <circle cx="60" cy="26" r="20" fill="#ffffff" />
        <rect x="56" y="14" width="8" height="24" rx="2" fill="#ef4444" />
        <rect x="48" y="22" width="24" height="8" rx="2" fill="#ef4444" />
        {ROWS.map((r) =>
          COLS.map((c) => (
            <rect key={`h-${r}-${c}`} x={16 + c * 34} y={54 + r * 18} width="22" height="10" rx="2" fill="#7dd3fc" opacity={(r + c) % 2 ? 0.35 : 0.7} />
          ))
        )}
      </g>

      {/* Cafe */}
      <g transform="translate(215 110)">
        <rect width="110" height="90" rx="6" fill="#3a1d10" stroke="#EA580C" strokeWidth="2" />
        <polygon points="-6,0 116,0 106,26 4,26" fill="#EA580C" />
        <polygon points="14,0 34,0 30,26 12,26" fill="#fff7ed" opacity="0.9" />
        <polygon points="54,0 74,0 72,26 52,26" fill="#fff7ed" opacity="0.9" />
        <polygon points="94,0 112,0 106,26 92,26" fill="#fff7ed" opacity="0.9" />
        <rect x="14" y="40" width="46" height="34" rx="4" fill="#fdba74" opacity="0.55" />
        <rect x="72" y="42" width="26" height="48" rx="3" fill="#7c2d12" />
        <circle cx="86" cy="68" r="2.5" fill="#fdba74" />
      </g>

      {/* Temple */}
      <g transform="translate(355 140)">
        <rect width="140" height="60" rx="4" fill="#6b3a05" stroke="#D97706" strokeWidth="2" />
        <path d="M20 0 Q70 -72 120 0 Z" fill="#D97706" />
        <line x1="70" y1="-52" x2="70" y2="-72" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
        <circle cx="70" cy="-76" r="4" fill="#fbbf24" />
        <path d="M54 60 L54 34 Q70 16 86 34 L86 60 Z" fill="#fbbf24" opacity="0.8" />
        <rect x="14" y="20" width="10" height="40" fill="#fbbf24" opacity="0.4" />
        <rect x="116" y="20" width="10" height="40" fill="#fbbf24" opacity="0.4" />
      </g>

      {/* Bank */}
      <g transform="translate(530 96)">
        <rect width="130" height="104" rx="4" fill="#14305e" stroke="#2563EB" strokeWidth="2" />
        <polygon points="-8,0 65,-36 138,0" fill="#2563EB" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={`b-${i}`} x={14 + i * 22} y="16" width="12" height="70" rx="2" fill="#93c5fd" opacity="0.55" />
        ))}
        <rect x="-4" y="88" width="138" height="16" rx="2" fill="#1e40af" />
        <circle cx="65" cy="-8" r="7" fill="#fde68a" />
      </g>

      {/* Salon */}
      <g transform="translate(690 104)">
        <rect width="110" height="96" rx="6" fill="#4a123a" stroke="#DB2777" strokeWidth="2" />
        <rect x="14" y="10" width="82" height="22" rx="6" fill="#DB2777" />
        <line x1="42" y1="16" x2="68" y2="28" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="68" y1="16" x2="42" y2="28" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="32" cy="64" rx="16" ry="22" fill="#f9a8d4" opacity="0.5" stroke="#f472b6" strokeWidth="2" />
        <rect x="64" y="44" width="30" height="52" rx="3" fill="#831843" />
      </g>

      {/* Ground + pavement */}
      <rect x="0" y="200" width="900" height="90" fill="url(#qg-ground)" />
      <line x1="0" y1="206" x2="900" y2="206" stroke="#ffffff" strokeOpacity="0.08" strokeDasharray="6 8" />

      {/* The queue: people shuffle forward slowly */}
      {PEOPLE.map((i) => {
        const x = 130 + i * 46;
        return (
          <g key={`p-${i}`} transform={`translate(${x} 238)`}>
            <animateTransform
              attributeName="transform"
              type="translate"
              values={`${x} 238; ${x + 9} 238; ${x} 238`}
              dur={`${3 + (i % 3)}s`}
              begin={`${i * 0.2}s`}
              repeatCount="indefinite"
            />
            <circle cx="0" cy="-14" r="7" fill="#fcd9b6" />
            <rect x="-7" y="-6" width="14" height="22" rx="7" fill={SHIRTS[i % SHIRTS.length]} />
          </g>
        );
      })}

      {/* Digital tokens flying between venues */}
      {[
        { path: 'M120 70 Q 290 -20 420 130', dur: '6s', begin: '0s' },
        { path: 'M420 130 Q 560 20 595 90', dur: '5s', begin: '1.5s' },
        { path: 'M595 90 Q 700 10 745 104', dur: '5.5s', begin: '3s' },
        { path: 'M270 110 Q 190 40 120 70', dur: '4.5s', begin: '2s' }
      ].map((t, i) => (
        <circle key={`t-${i}`} r="5" fill="#4ade80">
          <animateMotion path={t.path} dur={t.dur} begin={t.begin} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" dur={t.dur} begin={t.begin} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Floating phone card */}
      <g transform="translate(690 8)">
        <animateTransform attributeName="transform" type="translate" values="690 8; 690 0; 690 8" dur="4s" repeatCount="indefinite" />
        <rect width="190" height="74" rx="16" fill="#0f172a" stroke="#22c55e" strokeOpacity="0.7" strokeWidth="1.5" />
        <circle cx="22" cy="24" r="5" fill="#4ade80">
          <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <text x="36" y="28" fill="#94a3b8" fontSize="11" fontFamily="monospace" letterSpacing="1">
          LIVE TOKEN
        </text>
        <text x="16" y="58" fill="#ffffff" fontSize="22" fontWeight="800" fontFamily="monospace">
          A-014
        </text>
        <text x="100" y="58" fill="#4ade80" fontSize="13" fontWeight="700" fontFamily="monospace">
          2 ahead
        </text>
      </g>
    </svg>
  </div>
);