export interface DomainNavigationItem {
  readonly key: string;
  readonly path: string;
  readonly icon: string;
  readonly label: string;
  readonly title: string;
  readonly description: string;
}

export const PRODUCT_NAVIGATION: readonly DomainNavigationItem[] = [
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
    label: 'Ölçümler',
    title: 'Vücut Ölçümleri',
    description: 'Kilo, çevre, kompozisyon ve laboratuvar verilerini takip edin.',
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
];
