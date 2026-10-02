 // Centralized Backend API & WebSocket Configuration
 export const API_BASE_URL = '';
 export const SOCKET_URL   = '';

 /** Simple wrapper that works with absolute URLs *or* relative paths */
 export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
     const url = endpoint.startsWith('http')
         ? endpoint
         : ${API_BASE_URL};
     return fetch(url, options);
 }
