'use client';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/status';

const KEYS = ['hadir', 'terlambat', 'di_luar_area', 'izin', 'sakit', 'alfa'] as const;

export function AttendanceChart({ data }: { data: Record<string, string | number>[] }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-slate-500">Belum ada data kehadiran pada rentang ini.</p>;
  return (
    <div className="h-72 w-full" role="img" aria-label="Grafik kehadiran">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Legend />
          {KEYS.map((k) => <Bar key={k} dataKey={k} name={STATUS_LABEL[k]} stackId="a" fill={STATUS_COLOR[k]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
