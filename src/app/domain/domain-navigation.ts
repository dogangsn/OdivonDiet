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
      { path: '/measurements', icon: 'monitor_weight', label: 'Ölçümler' },
      { path: '/consultations', icon: 'event_note', label: 'Görüşmeler' },
      { path: '/reports', icon: 'insights', label: 'Raporlar' },
    ],
  },
  {
    key: 'measurements',
    path: 'measurements',
    icon: 'monitor_weight',
    label: 'Ölçümler & Laboratuvar',
    title: 'Vücut Ölçümleri & Biyobelirteçler',
    description: 'Kilo, çevre, kompozisyon ve kan tahlili verilerini takip edin.',
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
      { path: '/settings', icon: 'settings', label: 'Ayarlar' },
    ],
  },
  {
    key: 'ai-nutripilot',
    path: 'ai-nutripilot',
    icon: 'auto_awesome',
    label: 'AI NutriPilot',
    title: 'Yapay Zekâ Klinik Diyet Asistanı',
    description: 'Akıllı menü üreticisi, biyobelirteç tahlil analizi ve kaçamak telafi karar desteği.',
  },
  {
    key: 'client-portal',
    path: 'client-portal',
    icon: 'smartphone',
    label: 'Danışan Portalı',
    title: 'Danışan Portalı & Mobil Diyet Günlüğü',
    description: 'Danışanların günlük öğün, su tüketimi, kaçamak telafisi ve kilo takibi yaptığı etkileşimli danışan arayüzü.',
  },
];
