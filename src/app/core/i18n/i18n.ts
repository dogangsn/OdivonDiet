import { Injectable, Pipe, PipeTransform, computed, inject, signal } from '@angular/core';

export type SupportedLang = 'tr' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'nl' | 'ar';

export interface LanguageOption {
  readonly code: SupportedLang;
  readonly nativeName: string;
  readonly flag: string;
  readonly dir: 'ltr' | 'rtl';
}

export const LANGUAGES: readonly LanguageOption[] = [
  { code: 'tr', nativeName: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'en', nativeName: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'de', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'fr', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'es', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'it', nativeName: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  { code: 'nl', nativeName: 'Nederlands', flag: '🇳🇱', dir: 'ltr' },
  { code: 'ar', nativeName: 'العربية', flag: '🇦🇪', dir: 'rtl' },
];

const TR: Record<string, string> = {
  'nav.overview': 'Genel Bakış',
  'nav.modules': 'Modüller',
  'nav.activity': 'Aktiviteler',
  'nav.settings': 'Ayarlar',
  'common.search': 'Danışan, plan, tetkik veya not ara…',
  'common.new': 'Yeni Kayıt',
  'common.active': 'Aktif',
  'common.archive': 'Arşiv',
  'common.save': 'Kaydet',
  'common.cancel': 'Vazgeç',
  'dashboard.live': 'Klinik & Danışan Takip Radarı',
  'dashboard.online': 'Canlı Klinik Verisi',
  'dashboard.health': 'Plan Uyumu',
  'dashboard.capacity': 'Hedef Başarısı',
  'dashboard.today': 'Bugünkü Seanslar',
  'product.category': 'Klinik Beslenme & Diyetisyen Yönetimi',
  'product.tagline': 'Kişiye özel beslenme reçeteleri, ölçülebilir metabolik başarı.',
  'product.promise': 'Danışan profili, beslenme planı, biyobelirteçler ve AI NutriPilot karar desteğini tek profesyonel akışta yönetin.',
  'metric.total': 'Aktif Danışanlar',
  'metric.totalNote': 'Klinik ve online takipte',
  'metric.active': 'Plan Uyum Skoru',
  'metric.activeNote': 'Hedefe ulaşma oranı %92',
  'metric.pending': 'Yaklaşan Seanslar',
  'metric.pendingNote': 'Önümüzdeki 7 gün içinde',
  'metric.score': 'AI İçgörüleri',
  'metric.scoreNote': 'Klinik karar ve makro optimizasyonu',
  'module.title': 'Klinik Beslenme Modülleri',
  'module.subtitle': 'Diyetisyenler ve sağlık profesyonelleri için yeni nesil çalışma alanı',
  'module.one': 'Danışan Portföyü & Anamnez',
  'module.oneDesc': 'Sağlık geçmişi, besin alerjileri, hedefler ve biyometrik kayıtlar',
  'module.two': 'Kişiselleştirilmiş Beslenme Planları',
  'module.twoDesc': 'Enerji, makro/mikro dağılımı ve esnek öğün değişim listeleri',
  'module.three': 'Vücut Kompozisyonu & Biyobelirteçler',
  'module.threeDesc': 'Kilo, yağ/kas analizi, kan tahlilleri ve metabolik trendler',
  'module.four': 'AI NutriPilot Karar Desteği',
  'module.fourDesc': 'Yapay zekâ menü üretici, tahlil yorumlayıcı ve seans asistanı',
  'table.name': 'Kayıt',
  'table.status': 'Durum',
  'empty.title': 'Henüz kayıt bulunmuyor',
  'empty.body': 'İlk danışan veya beslenme kaydını oluşturarak süreci başlatın.',
  'update.title': 'Uygulama güncellemesi hazır',
  'update.body': 'Güvenli biçimde en güncel sürüme geçin.',
  'update.action': 'Şimdi Güncelle',
  'drawer.title': 'Yeni Kayıt Oluştur',
  'drawer.name': 'Kayıt adı',
  'ai.title': 'AI NutriPilot Asistanı',
  'ai.tagline': 'Yapay Zekâ Destekli Klinik Karar & Beslenme Motoru',
  'ai.tab.menu': 'Akıllı Menü Oluşturucu',
  'ai.tab.labs': 'Biyobelirteç & Tahlil Yorumu',
  'ai.tab.recovery': 'Kaçamak & Telafi Simülatörü',
  'ai.tab.consultation': 'Seans Notu & Motivasyon',
  'portal.title': 'Danışan Portalı & Diyet Günlüğü',
  'portal.subtitle': 'Öğün takibi, su sayacı, kaçamak telafisi ve kilo kaydı',
  'portal.todayMeals': 'Bugünkü Öğünler',
  'portal.waterTracker': 'Canlı Su Takibi',
  'portal.cheatReport': 'Kaçamak Bildirimi & AI Telafi',
  'portal.weighIn': 'Haftalık Tartı Bildirimi',
};

const EN: Record<string, string> = {
  'nav.overview': 'Overview',
  'nav.modules': 'Modules',
  'nav.activity': 'Activity',
  'nav.settings': 'Settings',
  'nav.clientPortal': 'Client Portal',
  'common.search': 'Search clients, plans, labs or notes…',
  'common.new': 'New Record',
  'common.active': 'Active',
  'common.archive': 'Archive',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'dashboard.live': 'Clinical & Client Tracking Radar',
  'dashboard.online': 'Live Clinic Data',
  'dashboard.health': 'Diet Compliance',
  'dashboard.capacity': 'Goal Success',
  'dashboard.today': 'Sessions Today',
  'product.category': 'Clinical Nutrition & Dietitian Management',
  'product.tagline': 'Personalized nutrition plans, measurable metabolic success.',
  'product.promise': 'Manage client profiles, nutrition plans, biomarkers and AI NutriPilot clinical decisions in one unified workflow.',
  'metric.total': 'Active Clients',
  'metric.totalNote': 'In clinic and online coaching',
  'metric.active': 'Compliance Score',
  'metric.activeNote': 'Target achievement rate 92%',
  'metric.pending': 'Upcoming Sessions',
  'metric.pendingNote': 'Next 7 days scheduled',
  'metric.score': 'AI Clinical Insights',
  'metric.scoreNote': 'Metabolic decision & macro optimizer',
  'module.title': 'Clinical Nutrition Modules',
  'module.subtitle': 'Next-generation workspace built for dietitians and health professionals',
  'module.one': 'Client Profiles & History',
  'module.oneDesc': 'Medical history, food intolerances, goals and biometric logs',
  'module.two': 'Personalized Meal Plans',
  'module.twoDesc': 'Energy, macro/micro nutrient targets and smart food exchanges',
  'module.three': 'Body Composition & Labs',
  'module.threeDesc': 'Weight, body fat/muscle analysis, blood tests and metabolic trends',
  'module.four': 'AI NutriPilot Decision Support',
  'module.fourDesc': 'AI menu generator, lab test interpreter and consultation copilot',
  'table.name': 'Record',
  'table.status': 'Status',
  'empty.title': 'No records yet',
  'empty.body': 'Create the first client or nutrition record to get started.',
  'update.title': 'Application update ready',
  'update.body': 'Move safely to the latest version.',
  'update.action': 'Update Now',
  'drawer.title': 'Create New Record',
  'drawer.name': 'Record name',
  'ai.title': 'AI NutriPilot Assistant',
  'ai.tagline': 'AI-Powered Clinical Decision & Nutrition Engine',
  'ai.tab.menu': 'Smart Menu Planner',
  'ai.tab.labs': 'Biomarker & Lab Review',
  'ai.tab.recovery': 'Cheat & Recovery Simulator',
  'ai.tab.consultation': 'Consultation & Motivation',
  'portal.title': 'Client Portal & Diet Diary',
  'portal.subtitle': 'Meal tracking, water counter, cheat recovery and weight log',
  'portal.todayMeals': "Today's Meals",
  'portal.waterTracker': 'Live Water Tracker',
  'portal.cheatReport': 'Report Cheat Meal & AI Recovery',
  'portal.weighIn': 'Weekly Weigh-in',
};

const DICTS: Partial<Record<SupportedLang, Record<string, string>>> = { tr: TR, en: EN };

@Injectable({ providedIn: 'root' })
export class I18nStore {
  readonly currentLang = signal<SupportedLang>(this.initial());
  readonly options = LANGUAGES;
  readonly active = computed(
    () => LANGUAGES.find((x) => x.code === this.currentLang()) ?? LANGUAGES[0],
  );

  setLanguage(lang: SupportedLang): void {
    this.currentLang.set(lang);
    localStorage.setItem('odivon:preferred_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = this.active().dir;
    document.documentElement.classList.toggle('rtl', this.active().dir === 'rtl');
  }

  t(key: string): string {
    return DICTS[this.currentLang()]?.[key] ?? TR[key] ?? key;
  }

  private initial(): SupportedLang {
    const value = localStorage.getItem('odivon:preferred_lang') as SupportedLang | null;
    return LANGUAGES.some((x) => x.code === value) ? value! : 'tr';
  }
}

@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nStore);
  transform(key: string): string {
    this.i18n.currentLang();
    return this.i18n.t(key);
  }
}
