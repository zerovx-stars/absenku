import { redirect } from 'next/navigation';
// Middleware mengarahkan sesuai role; ini hanya cadangan
export default function Home() { redirect('/login'); }
