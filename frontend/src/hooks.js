// useTheme — manages light/dark mode
// Persists to localStorage, applies `html.dark` class

import { useState, useEffect } from 'react';

export function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('aeromesh-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const html = document.documentElement;
    if (dark) {
      html.classList.add('dark');
      localStorage.setItem('aeromesh-theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('aeromesh-theme', 'light');
    }
  }, [dark]);

  return { dark, toggle: () => setDark(v => !v) };
}

// useDeviceType — returns 'mobile' for screens < 768px, 'desktop' otherwise
// Used to automatically serve the right view without routing

export function useDeviceType() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile ? 'mobile' : 'desktop';
}
