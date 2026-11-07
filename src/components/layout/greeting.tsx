export function Greeting({ name, subtitle }: { name: string; subtitle: string }) {
  const today = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: 'Asia/Jakarta' }).format(new Date());
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{today} (WIB)</p>
      <h1 className="mt-1 text-2xl font-semibold">Halo, {name}</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-300">{subtitle}</p>
    </section>
  );
}
export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {title ? <h2 className="mb-3 font-semibold">{title}</h2> : null}
      {children}
    </section>
  );
}
