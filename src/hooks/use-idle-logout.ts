'use client';
import { useEffect } from 'react';

// Logout otomatis setelah tidak ada aktivitas (default 30 menit)
export function useIdleLogout(minutes = 30) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const logout = async () => {
      await fetch('/api/auth/logout', { method: 'POST', redirect: 'manual' }).catch(() => {});
      window.location.href = '/login?error=idle';
    };
    const reset = () => { clearTimeout(timer); timer = setTimeout(logout, minutes * 60_000); };
    const events = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, reset)); };
  }, [minutes]);
}
