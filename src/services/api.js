const base = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

export function apiUrl(path) {
  return base + "/" + path.replace(/^\/+/, "");
}

export function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), {
    ...options,
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
  });
}
