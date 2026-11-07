'use client';
import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { wib } from '@/lib/status';

type N = { id: string; title: string; body: string; is_read: boolean; created_at: string };

// Notifikasi dalam aplikasi, realtime lewat Supabase Realtime
export function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<N[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = createClient();
    sb.from('notifications').select('id,title,body,is_read,created_at').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(15).then(({ data }) => setItems((data ?? []) as N[]));
    const ch = sb.channel(`notif-${userId}`).on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (p) => { const n = p.new as N; setItems((prev) => [n, ...prev].slice(0, 15)); toast.info(n.title, { description: n.body }); }).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [userId]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const unread = items.filter((i) => !i.is_read).length;
  async function markAll() {
    await createClient().from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    setItems((p) => p.map((i) => ({ ...i, is_read: true })));
  }

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`}
        className="relative rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
        <Bell className="h-5 w-5" aria-hidden />
        {unread ? <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-sm font-semibold">Notifikasi</span>
            {unread ? <button type="button" onClick={markAll} className="text-xs text-indigo-600 hover:underline">Tandai semua dibaca</button> : null}
          </div>
          {items.length === 0 ? <p className="px-2 py-6 text-center text-sm text-slate-500">Belum ada notifikasi.</p> : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {items.map((n) => (
                <li key={n.id} className={`px-2 py-2 text-sm ${n.is_read ? 'opacity-70' : ''}`}>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-slate-600 dark:text-slate-300">{n.body}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{wib(n.created_at, { dateStyle: 'medium', timeStyle: 'short' })} WIB</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
