export interface NavigationItem {
  readonly path: string;
  readonly icon: string;
  readonly label: string;
}

export interface DomainNavigationItem {
  readonly key: string;
  readonly path: string;
  readonly icon: string;
  readonly label: string;
  readonly title: string;
  readonly description: string;
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
];

/** Domain sections used by the legacy workspace page (AI NutriPilot, client portal). */
export const WORKSPACE_DOMAINS: readonly DomainNavigationItem[] = [
  {
    key: 'clients',
    path: 'clients',
    icon: 'group',
    label: 'Danışanlar',
    title: 'Danışan Yönetimi',
    description: 'Danışan profili, sağlık öyküsü, hedef ve izin kayıtlarını yönetin.',
  },
  {
    key: 'plans',
    path: 'plans',
    icon: 'restaurant_menu',
    label: 'Beslenme Planları',
    title: 'Beslenme Planları',
    description: 'Öğün, enerji, makro ve değişim listelerini kişiye özel planlayın.',
  },
  {
    key: 'measurements',
    path: 'measurements',
    icon: 'monitor_weight',
    label: 'Ölçümler & Laboratuvar',
    title: 'Vücut Ölçümleri & Biyobelirteçler',
    description: 'Kilo, çevre, kompozisyon ve kan tahlili verilerini takip edin.',
  },
  {
    key: 'consultations',
    path: 'consultations',
    icon: 'clinical_notes',
    label: 'Takip Görüşmeleri',
    title: 'Takip Görüşmeleri',
    description: 'Seans notlarını, uyum değerlendirmesini ve yeni hedefleri yönetin.',
  },
  {
    key: 'reports',
    path: 'reports',
    icon: 'insights',
    label: 'İlerleme Raporları',
    title: 'İlerleme ve Sonuç Raporları',
    description: 'Danışan ilerlemesini dönemsel ve görsel olarak raporlayın.',
  },
  {
    key: 'ai-nutripilot',
    path: 'ai-nutripilot',
    icon: 'auto_awesome',
    label: 'AI NutriPilot',
    title: 'Yapay Zekâ Klinik Diyet Asistanı',
    description:
      'Akıllı menü üreticisi, biyobelirteç tahlil analizi ve kaçamak telafi karar desteği.',
  },
  {
    key: 'client-portal',
    path: 'client-portal',
    icon: 'smartphone',
    label: 'Danışan Portalı',
    title: 'Danışan Portalı & Mobil Diyet Günlüğü',
    description:
      'Danışanların günlük öğün, su tüketimi, kaçamak telafisi ve kilo takibi yaptığı etkileşimli danışan arayüzü.',
  },
];
