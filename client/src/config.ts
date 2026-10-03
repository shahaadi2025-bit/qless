// Centralized Backend API & WebSocket Configuration
//
// VITE_API_URL = absolute URL of the deployed backend, e.g. https://qless-backend.onrender.com
// Leave it unset for local development: requests stay relative and the Vite dev server
// proxies /api and /socket.io to http://localhost:5000.
const rawEnv = ((import.meta as any).env ?? {}) as Record<string, string | undefined>;
const base = (rawEnv.VITE_API_URL ?? '').trim().replace(/\/+$/, '');

export const API_BASE_URL: string = base;
export const SOCKET_URL: string = base;

export function apiUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  return `${API_BASE_URL}${endpoint}`;
}

/** Simple wrapper that works with absolute URLs *or* relative paths */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  return fetch(apiUrl(endpoint), options);
}

// Safety net: any component that calls fetch('/api/...') directly also reaches the
// deployed backend in production.
if (base && typeof window !== 'undefined' && !(window as any).__qlessFetchPatched) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      return nativeFetch(`${base}${input}`, init);
    }
    return nativeFetch(input as any, init);
  }) as typeof window.fetch;
  (window as any).__qlessFetchPatched = true;
}