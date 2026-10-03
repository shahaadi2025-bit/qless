import React, { useState } from 'react';
import { MapPin, Navigation, Search, X, Loader2 } from 'lucide-react';
import { apiFetch } from '../config.ts';

export interface PickedLocation {
  lat: number;
  lng: number;
  label: string;
}

interface SearchHit {
  name: string;
  latitude: number;
  longitude: number;
}

export interface PickerStatus {
  kind: 'loading' | 'ok' | 'warn';
  text: string;
}

interface LocationPickerProps {
  current: PickedLocation | null;
  onChange: (loc: PickedLocation | null) => void;
  status?: PickerStatus | null;
}

const QUICK_CITIES: PickedLocation[] = [
  { label: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { label: 'Delhi', lat: 28.6139, lng: 77.209 },
  { label: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { label: 'Pune', lat: 18.5204, lng: 73.8567 },
  { label: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { label: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { label: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { label: 'Varanasi', lat: 25.3176, lng: 82.9739 }
];

function shortLabel(name: string): string {
  return name.split(',').slice(0, 2).join(',').trim();
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ current, onChange, status }) => {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState<'gps' | 'search' | null>(null);
  const [error, setError] = useState('');

  const choose = (loc: PickedLocation | null) => {
    setHits([]);
    setQuery('');
    setError('');
    onChange(loc);
  };

  const locateMe = () => {
    setError('');
    if (!('geolocation' in navigator)) {
      setError('Your browser does not support location. Type an area or pick a city instead.');
      return;
    }
    setBusy('gps');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(null);
        choose({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'My current location' });
      },
      (err) => {
        setBusy(null);
        setError(
          err.code === 1
            ? 'Location permission is blocked. Type an area below or pick a city.'
            : 'Could not get your location. Type an area below or pick a city.'
        );
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  };

  const runSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = query.trim();
    if (q.length < 3) {
      setError('Type at least 3 letters, for example "Andheri Mumbai".');
      return;
    }
    setError('');
    setHits([]);
    setBusy('search');
    try {
      const res = await apiFetch(`/api/places/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setHits(data.data);
      } else {
        setError(data.message || 'No matching area found. Try adding the city name.');
      }
    } catch {
      setError('Search is unavailable right now (the free server may be waking up). Try again in a minute.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mb-6 rounded-2xl glass-panel border border-white/10 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <MapPin className="w-4 h-4 text-emerald-400" />
          Choose where to look for queues
        </div>
        <div className="flex items-center gap-2 text-xs">
          {current ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
              Showing places near: <strong>{current.label}</strong>
              <button
                type="button"
                onClick={() => choose(null)}
                className="ml-1 text-slate-300 hover:text-white"
                aria-label="Clear location"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ) : (
            <span className="text-slate-400">Showing the default demo area (Mumbai)</span>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={locateMe}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold disabled:opacity-60 whitespace-nowrap"
        >
          {busy === 'gps' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          Use my current location
        </button>

        <form onSubmit={runSearch} className="flex flex-1 gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Or type an area, e.g. Andheri, Mumbai"
            className="flex-1 px-3 py-2.5 rounded-xl glass-card text-white placeholder:text-slate-500 text-xs border border-white/10 focus:border-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy !== null}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass-card text-slate-200 hover:text-white text-xs font-bold border border-white/10 disabled:opacity-60"
          >
            {busy === 'search' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </form>
      </div>

      {hits.length > 0 && (
        <ul className="rounded-xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          {hits.map((h, i) => (
            <li key={`${h.latitude}-${h.longitude}-${i}`}>
              <button
                type="button"
                onClick={() => choose({ lat: h.latitude, lng: h.longitude, label: shortLabel(h.name) })}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
              >
                {h.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500">Quick pick:</span>
        {QUICK_CITIES.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => choose(c)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              current && current.label === c.label
                ? 'bg-brand-500 text-white'
                : 'glass-card text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {status && (
        <p
          className={`flex items-center gap-2 text-xs ${
            status.kind === 'ok' ? 'text-emerald-400' : status.kind === 'warn' ? 'text-amber-400' : 'text-slate-300'
          }`}
        >
          {status.kind === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {status.text}
        </p>
      )}

      {error && <p className="text-xs text-rose-400">{error}</p>}
      <p className="text-[10px] text-slate-500">
        Nearby places come from OpenStreetMap contributors. The first search in a new area can take up to 30 seconds.
      </p>
    </div>
  );
};