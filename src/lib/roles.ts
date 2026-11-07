export const ROLES = ['admin', 'guru_piket', 'murid', 'orang_tua'] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_HOME: Record<Role, string> = {
  admin: '/admin', guru_piket: '/guru-piket', murid: '/murid', orang_tua: '/orang-tua',
};
export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin', guru_piket: 'Guru Piket', murid: 'Murid', orang_tua: 'Orang Tua',
};
export const isRole = (v: unknown): v is Role => ROLES.includes(v as Role);
