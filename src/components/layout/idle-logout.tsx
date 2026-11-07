'use client';
import { useIdleLogout } from '@/hooks/use-idle-logout';

export function IdleLogout({ minutes = 30 }: { minutes?: number }) {
  useIdleLogout(minutes);
  return null;
}
