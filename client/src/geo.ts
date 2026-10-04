import { apiFetch } from './config.ts';

/** Turn coordinates into a readable area name such as "Borivali West, Mumbai". */
export async function reverseLabel(lat: number, lng: number): Promise<string> {
  try {
    const res = await apiFetch(`/api/places/reverse?lat=${lat}&lng=${lng}`);
    const data = await res.json();
    if (data.success && data.data && data.data.short) return data.data.short;
  } catch {
    /* fall through to the generic label */
  }
  return 'Selected location';
}