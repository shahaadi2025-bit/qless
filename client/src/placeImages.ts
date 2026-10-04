import { apiFetch } from './config.ts';

export interface PlaceImageInfo {
  url: string;
  source: string;
  credit?: string;
}

// Real photos are looked up on demand and remembered for the session.
// At most 4 lookups run at once so a long list of places never floods the server.
const resolved = new Map<string, PlaceImageInfo | null>();
const pending = new Map<string, Promise<PlaceImageInfo | null>>();
const waiting: Array<() => void> = [];
let active = 0;
const MAX_ACTIVE = 4;

function pump() {
  while (active < MAX_ACTIVE && waiting.length > 0) {
    const run = waiting.shift();
    if (run) {
      active++;
      run();
    }
  }
}

export function fetchPlaceImage(id: string): Promise<PlaceImageInfo | null> {
  if (resolved.has(id)) return Promise.resolve(resolved.get(id) ?? null);
  const existing = pending.get(id);
  if (existing) return existing;

  const p = new Promise<PlaceImageInfo | null>((resolve) => {
    waiting.push(async () => {
      let info: PlaceImageInfo | null = null;
      let remember = true;
      try {
        const res = await apiFetch(`/api/places/image?id=${encodeURIComponent(id)}`);
        const json = await res.json();
        if (!res.ok || !json || !json.success) remember = false; // busy or asleep: try again later
        else info = json.data && json.data.url ? (json.data as PlaceImageInfo) : null;
      } catch {
        remember = false;
      }
      if (remember) resolved.set(id, info);
      pending.delete(id);
      active--;
      resolve(info);
      pump();
    });
    pump();
  });
  pending.set(id, p);
  return p;
}