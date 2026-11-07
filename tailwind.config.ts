import type { Config } from 'tailwindcss';
// Mode gelap mengikuti pengaturan perangkat (prefers-color-scheme)
const config: Config = { darkMode: 'media', content: ['./src/**/*.{ts,tsx}'], theme: { extend: {} }, plugins: [] };
export default config;
