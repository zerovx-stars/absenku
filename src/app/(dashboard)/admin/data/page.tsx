import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { CrudTable, type Field } from './crud-table';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((label, i) => ({ value: String(i + 1), label }));
type Opt = { id: string; name: string };

export default async function DataMasterPage() {
  const me = await getMe();
  if (!me || me.role !== 'admin') redirect('/');
  const sb = me.supabase;
  const [years, classes, subjects, schedules, teachers] = await Promise.all([
    sb.from('academic_years').select('*').order('start_date', { ascending: false }),
    sb.from('classes').select('*').order('name'),
    sb.from('subjects').select('*').order('code'),
    sb.from('schedules').select('*').order('day_of_week').order('start_time'),
    sb.from('profiles').select('id,full_name').eq('role', 'guru_piket').order('full_name'),
  ]);
  const opt = (rows: Opt[] | null) => (rows ?? []).map((r) => ({ value: r.id, label: r.name }));
  const yearOpts = opt((years.data ?? []).map((y: { id: string; name: string }) => y));
  const classOpts = opt(classes.data);
  const subjectOpts = opt(subjects.data);
  const teacherOpts = (teachers.data ?? []).map((t: { id: string; full_name: string }) => ({ value: t.id, label: t.full_name }));

  const yearF: Field[] = [
    { key: 'name', label: 'Nama (mis. 2026/2027)', type: 'text', required: true }, { key: 'start_date', label: 'Mulai', type: 'date', required: true },
    { key: 'end_date', label: 'Selesai', type: 'date', required: true }, { key: 'is_active', label: 'Aktif', type: 'checkbox' },
  ];
  const classF: Field[] = [
    { key: 'name', label: 'Nama kelas', type: 'text', required: true }, { key: 'grade', label: 'Tingkat', type: 'number', required: true },
    { key: 'academic_year_id', label: 'Tahun ajaran', type: 'select', options: yearOpts, required: true }, { key: 'homeroom_teacher_id', label: 'Wali kelas', type: 'select', options: teacherOpts },
  ];
  const subjF: Field[] = [{ key: 'code', label: 'Kode', type: 'text', required: true }, { key: 'name', label: 'Mata pelajaran', type: 'text', required: true }];
  const schedF: Field[] = [
    { key: 'class_id', label: 'Kelas', type: 'select', options: classOpts, required: true }, { key: 'subject_id', label: 'Mata pelajaran', type: 'select', options: subjectOpts, required: true },
    { key: 'teacher_id', label: 'Guru', type: 'select', options: teacherOpts }, { key: 'day_of_week', label: 'Hari', type: 'select', options: DAYS, required: true },
    { key: 'start_time', label: 'Mulai', type: 'time', required: true }, { key: 'end_time', label: 'Selesai', type: 'time', required: true },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Data Master</h1>
      <p className="text-sm text-slate-500">Akun murid, guru, dan orang tua dikelola di menu Pengguna.</p>
      <CrudTable table="academic_years" title="Tahun ajaran" fields={yearF} rows={years.data ?? []} />
      <CrudTable table="classes" title="Kelas" fields={classF} rows={classes.data ?? []} />
      <CrudTable table="subjects" title="Mata pelajaran" fields={subjF} rows={subjects.data ?? []} />
      <CrudTable table="schedules" title="Jadwal" fields={schedF} rows={schedules.data ?? []} />
    </div>
  );
}
