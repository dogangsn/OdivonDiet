/**
 * Clinic staff roles and Role-Based Access Control (RBAC) permissions for the dietitian workspace.
 */
export type ClinicStaffRole = 'owner' | 'dietitian' | 'assistant' | 'reception';

export interface ClinicStaffMember {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: ClinicStaffRole;
  readonly specialty: string;
  readonly active: boolean;
  readonly createdAt: string;
  readonly tempPassword?: string;
}

export interface StaffRoleDefinition {
  readonly id: ClinicStaffRole;
  readonly label: string;
  readonly badgeTone: 'primary' | 'info' | 'warning' | 'neutral';
  readonly description: string;
  readonly allowedPaths: readonly string[];
  readonly allowedQuickActions: readonly ('client-new' | 'client-edit' | 'client-detail' | 'plan' | 'measurement' | 'consultation' | 'task')[];
}

export const STAFF_ROLES: readonly StaffRoleDefinition[] = [
  {
    id: 'owner',
    label: 'Klinik Yöneticisi / Baş Diyetisyen',
    badgeTone: 'primary',
    description:
      'Tüm klinik modüller, diyet planlama, biyokimya, abonelik/fatura ve kullanıcı yetkilendirme tam yetki.',
    allowedPaths: [
      '/overview',
      '/clients',
      '/plans',
      '/foods',
      '/clinical-lab',
      '/measurements',
      '/consultations',
      '/reports',
      '/messages',
      '/requests',
      '/tasks',
      '/activity',
      '/settings',
      '/billing',
    ],
    allowedQuickActions: [
      'client-new',
      'client-edit',
      'client-detail',
      'plan',
      'measurement',
      'consultation',
      'task',
    ],
  },
  {
    id: 'dietitian',
    label: 'Uzman Diyetisyen',
    badgeTone: 'info',
    description:
      'Danışan takibi, menü mühendisliği, klinik laboratuvar, ölçümler ve danışan portalı tam yetki.',
    allowedPaths: [
      '/overview',
      '/clients',
      '/plans',
      '/foods',
      '/clinical-lab',
      '/measurements',
      '/consultations',
      '/reports',
      '/messages',
      '/requests',
      '/tasks',
      '/activity',
      '/settings',
    ],
    allowedQuickActions: [
      'client-new',
      'client-edit',
      'client-detail',
      'plan',
      'measurement',
      'consultation',
      'task',
    ],
  },
  {
    id: 'assistant',
    label: 'Asistan / Stajyer Diyetisyen',
    badgeTone: 'warning',
    description:
      'InBody ölçüm girişi, besin kütüphanesi, randevu takvimi ve görev takibi (Reçete yazma, Klinik Lab ve Abonelik kilitli).',
    allowedPaths: [
      '/overview',
      '/clients',
      '/foods',
      '/measurements',
      '/consultations',
      '/tasks',
      '/activity',
    ],
    allowedQuickActions: ['client-detail', 'measurement', 'consultation', 'task'],
  },
  {
    id: 'reception',
    label: 'Ön Büro / Klinik Sekreteri',
    badgeTone: 'neutral',
    description:
      'Yeni danışan kabulü, randevu planlama, danışan mesajları ve talepler (Tıbbi veriler, Diyet Planları, Klinik Lab ve Ayarlar kilitli).',
    allowedPaths: ['/overview', '/clients', '/consultations', '/messages', '/requests', '/tasks'],
    allowedQuickActions: ['client-new', 'client-edit', 'client-detail', 'consultation', 'task'],
  },
];

export function staffRoleById(role: ClinicStaffRole | undefined): StaffRoleDefinition {
  return STAFF_ROLES.find((r) => r.id === role) ?? STAFF_ROLES[0];
}

export function isPathAllowedForStaffRole(
  role: ClinicStaffRole | undefined,
  url: string,
): boolean {
  const def = staffRoleById(role);
  const cleanPath = '/' + (url.split('?')[0]?.replace(/^\/+/, '').split('/')[0] ?? 'overview');
  return def.allowedPaths.includes(cleanPath);
}

export function isQuickActionAllowedForStaffRole(
  role: ClinicStaffRole | undefined,
  kind: 'client-new' | 'client-edit' | 'client-detail' | 'plan' | 'measurement' | 'consultation' | 'task',
): boolean {
  const def = staffRoleById(role);
  return def.allowedQuickActions.includes(kind);
}

export const DEFAULT_STAFF_SEED: readonly ClinicStaffMember[] = [
  {
    id: 'staff-1',
    name: 'Uzm. Dyt. Deniz Arslan',
    email: 'demo@odivon.com',
    role: 'owner',
    specialty: 'Obezite & Metabolik Beslenme',
    active: true,
    createdAt: '2026-01-10',
  },
];

