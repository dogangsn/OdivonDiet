export interface NavigationItem {
  readonly path: string;
  readonly icon: string;
  readonly label: string;
}

export interface NavigationGroup {
  readonly label: string;
  readonly items: readonly NavigationItem[];
}

export const PRODUCT_NAVIGATION: readonly NavigationGroup[] = [
  {
    label: 'Genel',
    items: [{ path: '/overview', icon: 'space_dashboard', label: 'Genel bakış' }],
  },
  {
    label: 'Danışan takibi',
    items: [
      { path: '/clients', icon: 'group', label: 'Danışanlar' },
      { path: '/plans', icon: 'restaurant_menu', label: 'Beslenme planları' },
      { path: '/foods', icon: 'grocery', label: 'Besin & yemekler' },
      { path: '/measurements', icon: 'monitor_weight', label: 'Ölçümler' },
      { path: '/consultations', icon: 'event_note', label: 'Görüşmeler' },
      { path: '/reports', icon: 'insights', label: 'Raporlar' },
    ],
  },
  {
    label: 'Danışan portalı',
    items: [
      { path: '/messages', icon: 'forum', label: 'Mesajlar' },
      { path: '/requests', icon: 'inbox', label: 'Talepler' },
      { path: '/tasks', icon: 'task_alt', label: 'Görevler' },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { path: '/activity', icon: 'history', label: 'Aktiviteler' },
      { path: '/billing', icon: 'workspace_premium', label: 'Abonelik' },
      { path: '/settings', icon: 'settings', label: 'Ayarlar' },
    ],
  },
];
