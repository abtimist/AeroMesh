import { useEffect, useState } from 'react';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const pending = new Map();

export async function fetchJSON(path, options = {}) {
  const response = await fetch(API_BASE + path, { ...options, signal: options.signal || AbortSignal.timeout(20000) });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${response.status})`);
  return data;
}

function sharedRequest(path) {
  if (!pending.has(path)) {
    pending.set(path, fetchJSON(path).finally(() => pending.delete(path)));
  }
  return pending.get(path);
}

export function useResource(path, interval = 60000) {
  const [state, setState] = useState({ path: null, data: null, error: null, loading: true });
  useEffect(() => {
    let cancelled = false;
    let timer;
    const load = async () => {
      let delay = interval;
      try {
        const data = await sharedRequest(path);
        if (data.status === 'loading' || data.refreshing) delay = 3000;
        if (!cancelled) setState({ path, data, error: null, loading: false });
      } catch (error) {
        if (!cancelled) setState(previous => ({ path, data: previous.path === path ? previous.data : null, error: error.message, loading: false }));
      }
      if (!cancelled && interval) timer = setTimeout(load, delay);
    };
    if (path) load();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [path, interval]);
  return state.path === path ? state : { data: null, error: null, loading: Boolean(path) };
}
