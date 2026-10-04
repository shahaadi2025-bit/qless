import React, { useEffect, useRef, useState } from 'react';
import { fetchPlaceImage } from '../placeImages.ts';
import type { PlaceImageInfo } from '../placeImages.ts';
import { venueArtDataUri } from '../venueArt.ts';

interface PlaceImgProps {
  loc: { id: string; category: string; banner_url?: string | null };
  /** Picture to show until a real photo is found (the venue banner or category artwork). */
  src: string;
  alt: string;
  className?: string;
  showCredit?: boolean;
}

// Shows a real photo of the place when one can be found, otherwise the artwork.
// The lookup only starts when the picture is close to the screen.
export const PlaceImg: React.FC<PlaceImgProps> = ({ loc, src, alt, className, showCredit = true }) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [info, setInfo] = useState<PlaceImageInfo | null>(null);
  const [broken, setBroken] = useState(false);
  const wantsLookup = loc.id.startsWith('osm-') && !loc.banner_url;

  useEffect(() => {
    if (!wantsLookup) return;
    let cancelled = false;
    const load = () => {
      fetchPlaceImage(loc.id).then((r) => {
        if (!cancelled && r) setInfo(r);
      });
    };
    const el = imgRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      load();
      return () => {
        cancelled = true;
      };
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          obs.disconnect();
          load();
        }
      },
      { rootMargin: '300px' }
    );
    obs.observe(el);
    return () => {
      cancelled = true;
      obs.disconnect();
    };
  }, [loc.id, wantsLookup]);

  const shown = broken ? venueArtDataUri(loc.category) : info ? info.url : src;

  return (
    <>
      <img
        ref={imgRef}
        src={shown}
        alt={alt}
        className={className}
        loading="lazy"
        onError={() => {
          if (!broken) setBroken(true);
        }}
      />
      {showCredit && info && !broken && info.credit && (
        <span className="absolute bottom-1.5 right-2 z-10 text-[9px] text-white/70 drop-shadow">{info.credit}</span>
      )}
    </>
  );
};