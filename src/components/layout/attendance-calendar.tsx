import { STATUS_COLOR, STATUS_LABEL } from '@/lib/status';

// Status terburuk pada satu hari yang ditampilkan
const PRIORITY = ['alfa', 'di_luar_area', 'terlambat', 'sakit', 'izin', 'hadir'];
export const worst = (a: string | undefined, b: string) => (!a || PRIORITY.indexOf(b) < PRIORITY.indexOf(a) ? b : a);

export function AttendanceCalendar({ year, month, byDay }: { year: number; month: number; byDay: Record<number, string> }) {
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7; // Senin = kolom pertama
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const title = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month, 1)));
  return (
    <div>
      <p className="mb-2 text-sm font-medium capitalize">{title}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => <span key={d} className="py-1 text-slate-500">{d}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const st = byDay[i + 1];
          return (
            <span key={i} aria-label={`Tanggal ${i + 1}${st ? `: ${STATUS_LABEL[st]}` : ''}`}
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs"
              style={st ? { background: STATUS_COLOR[st], color: '#fff' } : undefined}>{i + 1}</span>
          );
        })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        {Object.keys(STATUS_LABEL).map((k) => (
          <li key={k} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[k] }} />{STATUS_LABEL[k]}</li>
        ))}
      </ul>
    </div>
  );
}
