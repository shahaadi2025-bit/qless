import React from 'react';
import { aerialLayout, AERIAL_CREDIT } from '../aerial.ts';

interface AerialViewProps {
  lat: number;
  lng: number;
  className?: string;
  color?: string;
  /** Show the "Aerial view" label and the imagery credit (turn off for tiny thumbnails). */
  showLabels?: boolean;
  onFail?: () => void;
}

// A satellite picture centred on the place, built from 3 x 3 map tiles, with a marker on the place.
export const AerialView: React.FC<AerialViewProps> = ({ lat, lng, className, color = '#22c55e', showLabels = true, onFail }) => {
  const layout = aerialLayout(lat, lng);
  return (
    <div className={`relative overflow-hidden bg-slate-800 ${className || ''}`}>
      <div
        className="absolute"
        style={{ left: '50%', top: '50%', width: 768, height: 768, marginLeft: -layout.offsetX, marginTop: -layout.offsetY }}
      >
        {layout.tiles.map((t, i) => (
          <img
            key={t.url}
            src={t.url}
            alt=""
            draggable={false}
            className="absolute select-none"
            style={{ left: t.left, top: t.top, width: 256, height: 256 }}
            onError={i === 4 ? onFail : undefined}
          />
        ))}
      </div>
      <span
        className="absolute rounded-full border-2 border-white shadow-lg"
        style={{ left: '50%', top: '50%', width: 14, height: 14, marginLeft: -7, marginTop: -7, background: color }}
      />
      {showLabels && (
        <>
          <span className="absolute left-2 top-2 z-10 px-1.5 py-0.5 rounded-md bg-dark-950/80 text-[9px] font-bold text-slate-200">
            Aerial view
          </span>
          <span className="absolute bottom-1.5 right-2 z-10 text-[9px] text-white/70 drop-shadow">{AERIAL_CREDIT}</span>
        </>
      )}
    </div>
  );
};