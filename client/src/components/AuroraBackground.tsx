import React from 'react';

// Fixed, non-interactive animated backdrop: soft colour blobs over a dot grid.
export const AuroraBackground: React.FC = () => (
  <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 dot-grid" />
    <div
      className="aurora-blob"
      style={{ width: 520, height: 520, top: -120, left: -80, background: '#22c55e', animation: 'qless-float 14s ease-in-out infinite' }}
    />
    <div
      className="aurora-blob"
      style={{ width: 460, height: 460, top: '30%', right: -120, background: '#38bdf8', animation: 'qless-float-alt 17s ease-in-out infinite' }}
    />
    <div
      className="aurora-blob"
      style={{ width: 420, height: 420, bottom: -140, left: '30%', background: '#8b5cf6', animation: 'qless-float 20s ease-in-out infinite' }}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-dark-950/40 to-dark-950" />
  </div>
);