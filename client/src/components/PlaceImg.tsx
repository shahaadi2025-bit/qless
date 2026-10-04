import React, { useEffect, useRef, useState } from 'react';
import { fetchPlaceImage } from '../placeImages.ts';
import type { PlaceImageInfo } from '../placeImages.ts';
import { venueArtDataUri } from '../venueArt.ts';
import { AERIAL_ENABLED } from '../aerial.ts';
import { AerialView } from './AerialView.tsx';

interface PlaceImgProps {
  loc: { id: string; category: string; banner_url?: string | null; latitude?: number; longitude?: number };
  /** Picture to show until a real photo is found (the venue banner or category artwork). */
  src: string;
  alt: string;
  className?: string;
  showCredit?: boolean;
}

// Shows a real photo of the place when one can be found. If there is none, it shows an aerial view of the
// place (when coordinates are known), and category artwork only as the last resort.
// The lookup only starts when the picture is close to the screen.
export const PlaceImg: React.FC<PlaceImgProps> = ({ loc, src, alt, className, showCredit = true }) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [info, setInfo] = useState<PlaceImageInfo | null>(null);
  const [broken, setBroken] = useState(false);
  const [noPhoto, setNoPhoto] = useState(false);
  const [aerialFailed, setAerialFailed] = useState(false);
  const wantsLookup = loc.id.startsWith('osm-') && !loc.banner_url;

  const lat = Number(loc.latitude);
  const lng = Number(loc.longitude);
  const canAerial = AERIAL_ENABLED && Number.isFinite(lat) && Number.isFinite(lng) && !aerialFailed;

  useEffect(() => {
    if (!wantsLookup) return;
    let cancelled = false;
    const load = () => {
      fetchPlaceImage(loc.id).then((r) => {
        if (cancelled) return;
        if (r) setInfo(r);
        else setNoPhoto(true);
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

  // No photo anywhere: show the satellite view of the place.
  if (wantsLookup && noPhoto && !info && canAerial) {
    return (
      <AerialView
        lat={lat}
        lng={lng}
        className={className}
        showLabels={showCredit}
        onFail={() => setAerialFailed(true)}
      />
    );
  }

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