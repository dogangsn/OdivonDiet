import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth-store';
import { ThemeStore } from '../../core/theme/theme-store';
import {
  bmi,
  bmiBand,
  bmr,
  harrisBenedictBmr,
  idealWeightRange,
  katchMcArdleBmr,
  leanBodyMassKg,
  macroGrams,
  round1,
  suggestedKcal,
  tdee,
  waterNeedLiters,
} from '../../domain/diet-calc';
import { ActivityLevel, ProgramType, Sex } from '../../domain/diet.models';
import { PRODUCT } from '../../domain/product-manifest';
import { VersionBadge } from '../../shared/ui/version-badge';

type ScreenId = 'overview' | 'plans' | 'clinical' | 'calendar' | 'portal';

interface ScreenTab {
  readonly id: ScreenId;
  readonly icon: string;
  readonly label: string;
  readonly routeUrl: string;
  readonly caption: string;
}

interface ModuleFeature {
  readonly badge: string;
  readonly icon: string;
  readonly title: string;
  readonly summary: string;
  readonly bullets: readonly string[];
  readonly metricLabel: string;
  readonly metricValue: string;
}

const SCREEN_TABS: readonly ScreenTab[] = [
  {
    id: 'overview',
    icon: 'space_dashboard',
    label: '1. Klinik Kokpit & Genel Bakış',
    routeUrl: 'https://diet.odivon.com/overview',
    caption:
      'Aktif danışanlar, haftalık kilo değişimi, bugünün randevu ajandası ve klinik dikkat uyarıları tek ekranda.',
  },
  {
    id: 'plans',
    icon: 'restaurant_menu',
    label: '2. Diyet & Kalori Stüdyosu',
    routeUrl: 'https://diet.odivon.com/plans',
    caption:
      'BeBis 8 değişim grubu, Atwater (4-4-9) otomatik makro/lif hesabı, öğün reçeteleri ve 7 günlük alışveriş listesi.',
  },
  {
    id: 'clinical',
    icon: 'biotech',
    label: '3. Tahlil, İlaç-Besin & GLP-1',
    routeUrl: 'https://diet.odivon.com/clinical-lab',
    caption:
      'HOMA-IR, TG/HDL aterojenik indeks, İlaç×Besin×Tahlil çapraz etkileşim denetimi ve GLP-1 sarkopeni kas radarı.',
  },
  {
    id: 'calendar',
    icon: 'calendar_month',
    label: '4. Görsel Takvim & InBody BIA',
    routeUrl: 'https://diet.odivon.com/consultations',
    caption:
      '08:00–20:00 saat ızgaralı randevu takvimi ve InBody/Tanita segmental BIA (SMM kas, ECW/TBW ödem, faz açısı) analizi.',
  },
  {
    id: 'portal',
    icon: 'favorite',
    label: '5. Danışan Mobil & Web Portalı',
    routeUrl: 'https://diet.odivon.com/portal',
    caption:
      'Danışanlarınızın kendi telefon veya bilgisayarından günlük öğünlerini, ölçümlerini ve mesajlarını takip ettiği portal.',
  },
];

const MANAGEMENT_MODULES: readonly ModuleFeature[] = [
  {
    badge: 'Menü Mühendisliği',
    icon: 'restaurant_menu',
    title: 'Öğün Bazlı Diyet Stüdyosu & Otomatik Atwater Kalori Motoru',
    summary:
      'Öğünlere besin veya tarif eklediğiniz anda kalori, protein (g ve g/kg), karbonhidrat, yağ, lif ve BeBis değişim hakları canlı hesaplanır.',
    bullets: [
      'Hedef enerji (kcal) ile gerçek menü toplamı arasında anlık sapma kontrolü',
      'Öğün bazında alternatif besin tanımlama ("veya 2 yemek kaşığı lor peyniri")',
      '1, 3, 7 ve 14 günlük otomatik gramajlı Market & Alışveriş Listesi üretimi',
    ],
    metricLabel: 'Plan Hazırlama Hızı',
    metricValue: '3 dk / danışan',
  },
  {
    badge: 'Besin & Tarif Bankası',
    icon: 'grocery',
    title: 'BeBis 8 Değişim Gruplu Besin, Ev Yemeği & Paketli Ürün Kütüphanesi',
    summary:
      'Süt, et, ekmek/tahıl, sebze, meyve, yağ, kurubaklagil ve serbest gruplara ayrılmış klinik besin bankası; kendi özel tariflerinizi ekleyin.',
    bullets: [
      'Porsiyon birimi (1 dilim, 1 kepçe, 4 yemek kaşığı) ve net gramaj eşleştirmesi',
      'Düşük / Orta / Yüksek Glisemik İndeks (Gİ) ve alerjen (Gluten, Laktoz, Yumurta) etiketleri',
      'Atwater (4-4-9 kcal/g) enerji tutarlılığı doğrulaması',
    ],
    metricLabel: 'Standart Değişim Grubu',
    metricValue: '8 BeBis Grubu',
  },
  {
    badge: 'Biyokimya & Tahlil',
    icon: 'biotech',
    title: 'Kan Tahlili, Otomatik HOMA-IR & TG/HDL Aterojenik İndeks Analizi',
    summary:
      'Açlık glukozu, açlık insülini, HbA1c, lipid paneli, Ferritin, D3, B12, TSH, Ürik Asit ve hs-CRP değerlerinden otomatik klinik beslenme önerisi üretir.',
    bullets: [
      'Otomatik HOMA-IR ((Glukoz × İnsülin) / 405) ve kardiyometabolik TG/HDL oranı',
      'Referans dışı biyobelirteçler için kanıta dayalı tıbbi beslenme tedavisi (MNT) uyarıları',
      'Dönemsel tahlil karşılaştırması ve hedef iyileşme takibi',
    ],
    metricLabel: 'Klinik Biyobelirteç',
    metricValue: '12+ Parametre',
  },
  {
    badge: 'Farmako-Beslenme',
    icon: 'medication',
    title: 'İlaç × Beslenme Planı × Kan Tahlili Üçlü Çapraz Etkileşim Motoru',
    summary:
      'Danışanın kullandığı ilaçları, menüsündeki besinleri ve tahlillerini aynı anda tarayarak emilim çakışmalarını ve mikrobesin kayıplarını yakalar.',
    bullets: [
      'Levotiroksin (Euthyrox) ile kahvaltıdaki peynir/ceviz/lif şelasyon uyarısı',
      'Metformin kullanımında B12 malabsorpsiyonu ve Warfarin–K vitamini denetimi',
      'Saat dilimli (Sabah aç, kahvaltıyla, yatmadan önce) kanıta dayalı Supplement Reçetesi',
    ],
    metricLabel: 'Çapraz Güvenlik',
    metricValue: '%100 Otomatik',
  },
  {
    badge: 'GLP-1 & Bariatrik',
    icon: 'vaccines',
    title: 'GLP-1 (Ozempic / Mounjaro) & Bariatrik Sarkopeni / Kas Koruma Radarı',
    summary:
      'Hızlı kilo kaybı süreçlerinde verilen kilonun ne kadarının yağdan, ne kadarının iskelet kasından gittiğini izleyerek sarkopeniyi önler.',
    bullets: [
      'Kas kaybı oranı ≥%25 olduğunda kırmızı Sarkopeni Alarmı ve minimum protein tabanı (1.6 g/kg)',
      'Haftalık doz titrasyonu, enjeksiyon günü bulantı/reflü ve Bristol Dışkı Ölçeği (Tip 1–7)',
      'Bariatrik cerrahi sonrası Faz 1 (Berrak Sıvı) → Faz 5 (Katı) protokol takibi',
    ],
    metricLabel: 'Yağsız Kütle Koruma',
    metricValue: '≥1,6 g/kg Hedef',
  },
  {
    badge: 'Segmental BIA',
    icon: 'monitor_weight',
    title: 'InBody / Tanita Hücresel Vücut Kompozisyonu & Ödem (ECW/TBW) Takibi',
    summary:
      'Yalnızca tartı kilosu değil; İskelet Kası (SMM), Visseral Yağ, Vücut Suyu (TBW), ECW/TBW Ödem Oranı, Faz Açısı (°) ve US Navy çevre yağ analizi.',
    bullets: [
      'Mifflin-St Jeor, Harris-Benedict, Katch-McArdle (LBM) ve Cunningham (Sporcu) BMR denklemleri',
      'Gebelik (1./2./3. Trimester), Emzirme, Luteal Faz ve Klinik Stres kalori modifikatörleri',
      'Bel/Kalça (WHR) kardiyometabolik risk sınıflandırması ve grafiksel trendler',
    ],
    metricLabel: 'BMR Denklem Motoru',
    metricValue: '4 Klinik Formül',
  },
  {
    badge: 'Krono-Beslenme',
    icon: 'schedule',
    title: '24 Saatlik Post-Prandiyal Glisemik Eğri & Sirkadiyen Açlık Simülatörü',
    summary:
      'Öğün saatleri ve lif/protein tamponlamasına göre gün içi tahmini kan şekeri dalgalanmasını ve gece açlık penceresini (eTRE) simüle eder.',
    bullets: [
      'İlk öğün – son öğün beslenme penceresi ve 19:30 sonrası kalori yükü (%) analizi',
      '"Önce Sebze/Lif → Protein/Yağ → Kompleks Karbonhidrat" öğün sıralama rehberi',
      'Melatonin ve insülin duyarlılığına göre Sirkadiyen Uyum Skoru (/100)',
    ],
    metricLabel: 'Glukoz Pik Azalması',
    metricValue: '%32 Tamponlama',
  },
  {
    badge: 'Görsel Ajanda & Portal',
    icon: 'calendar_month',
    title: 'Haftalık Saat Izgaralı Randevu Takvimi & Çift Yönlü Danışan Portalı',
    summary:
      '08:00–20:00 saatlik klinik takvimde boş slota tıklayarak randevu açın; danışanlarınız kendi portalından menü, ölçüm ve mesajlarını takip etsin.',
    bullets: [
      'Yüz yüze muayenehane, online video, telefon ve mesaj kontrolleri için renk kodlu takvim',
      'Danışan portalında günlük öğün listesi, su takibi, ölçüm girişi ve uzman mesajlaşma',
      'KVKK açık rıza onayı, klinik aktivite izi ve tek tıkla PDF / Yazdırılabilir raporlar',
    ],
    metricLabel: 'Randevu & Uyum',
    metricValue: '7/24 Portal',
  },
];

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, FormsModule, VersionBadge],
  template: `
    <div
      class="min-h-screen bg-slate-50 text-slate-900 selection:bg-violet-600 selection:text-white dark:bg-[#070b16] dark:text-white"
    >
      <!-- TEK SATIR MODERN ÜST NAVİGASYON BARI -->
      <header
        class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#070b16]/95"
      >
        <div
          class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
        >
          <!-- Sol: Marka Logosu -->
          <a routerLink="/" class="flex shrink-0 items-center gap-3">
            <span
              class="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30"
            >
              <span class="material-symbols-rounded icon-fill !text-xl" aria-hidden="true"
                >nutrition</span
              >
            </span>
            <div>
              <strong class="block text-base font-extrabold leading-tight tracking-tight">{{
                product.name
              }}</strong>
              <span class="block text-[11px] font-semibold text-slate-400">
                Klinik Beslenme Platformu
              </span>
            </div>
          </a>

          <!-- Orta: Sayfa İçi Navigasyon (Tek satır, ferah) -->
          <nav
            class="hidden items-center gap-7 text-xs font-bold text-slate-600 lg:flex dark:text-slate-300"
            aria-label="Tanıtım bölümleri"
          >
            <a
              href="#ekran-goruntuleri"
              class="transition hover:text-violet-600 dark:hover:text-violet-400"
              >Ürün Ekran Görüntüleri</a
            >
            <a href="#moduller" class="transition hover:text-violet-600 dark:hover:text-violet-400"
              >Klinik Modüller</a
            >
            <a
              href="#hesaplayici"
              class="transition hover:text-violet-600 dark:hover:text-violet-400"
              >Canlı BMR & Makro Motoru</a
            >
            <a
              href="#karsilastirma"
              class="transition hover:text-violet-600 dark:hover:text-violet-400"
              >Neden OdivonDiet?</a
            >
          </nav>

          <!-- Sağ: Giriş Yap, Kayıt Ol, Danışan Portalı & Tema -->
          <div class="flex shrink-0 items-center gap-2">
            <a
              routerLink="/portal/login"
              class="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 md:inline-flex dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            >
              <span class="material-symbols-rounded !text-base" aria-hidden="true">favorite</span>
              Danışan Girişi
            </a>
            <a
              routerLink="/login"
              class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs transition hover:border-violet-300 hover:text-violet-600 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-violet-700"
            >
              Giriş Yap
            </a>
            <a
              routerLink="/register"
              class="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-violet-500/25 transition hover:bg-violet-500"
            >
              Kayıt Ol
            </a>
            <button
              type="button"
              class="odv-icon-btn !size-9"
              (click)="theme.toggle()"
              [attr.aria-label]="theme.dark() ? 'Açık temaya geç' : 'Koyu temaya geç'"
            >
              <span class="material-symbols-rounded !text-lg">{{
                theme.dark() ? 'light_mode' : 'dark_mode'
              }}</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        <!-- HERO BÖLÜMÜ -->
        <section class="relative overflow-hidden pb-12 pt-10 lg:pb-16 lg:pt-14">
          <div class="pointer-events-none absolute inset-0" aria-hidden="true">
            <div
              class="absolute -top-40 start-1/4 size-[34rem] rounded-full bg-violet-500/15 blur-[130px]"
            ></div>
            <div
              class="absolute end-10 top-20 size-[28rem] rounded-full bg-emerald-500/10 blur-[120px]"
            ></div>
          </div>

          <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-4xl text-center">
              <div
                class="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-violet-200 bg-violet-50/90 px-4 py-1.5 text-xs font-bold text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200"
              >
                <span class="size-2 rounded-full bg-emerald-500"></span>
                Klinik Beslenme, Menü Mühendisliği, Biyobelirteç & Danışan Takip Sistemi
              </div>

              <h1
                class="mt-5 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]"
              >
                Diyetisyen kliniğinizi
                <span
                  class="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-emerald-500 bg-clip-text text-transparent"
                >
                  bilimsel zekâyla
                </span>
                tek ekrandan yönetin.
              </h1>

              <p class="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                Dağınık dosyalar ve manuel kalori hesabına son verin.
                <strong>BeBis 8 değişim grubu</strong>, <strong>Atwater otomatik makro motoru</strong>,
                <strong>HOMA-IR & kan tahlili analizi</strong>, <strong>İlaç–Besin etkileşim denetimi</strong>,
                <strong>GLP-1 sarkopeni radarı</strong> ve <strong>görsel randevu ajandası</strong>
                tek klinik platformda.
              </p>

              <!-- Ana Aksiyon Butonları (Giriş Yap / Kayıt Ol / Canlı Demo / Danışan Portalı) -->
              <div
                class="mt-8 flex flex-wrap items-center justify-center gap-3"
                aria-label="Hızlı giriş ve kayıt seçenekleri"
              >
                <a
                  routerLink="/register"
                  class="odv-btn-primary !min-h-12 !px-6 !text-sm shadow-lg shadow-violet-600/25"
                >
                  <span class="material-symbols-rounded !text-lg" aria-hidden="true"
                    >person_add</span
                  >
                  Yeni Uzman Kaydı Oluştur
                </a>
                <a
                  routerLink="/login"
                  class="odv-btn-secondary !min-h-12 !px-6 !text-sm dark:!border-slate-800 dark:!bg-slate-900"
                >
                  <span class="material-symbols-rounded !text-lg text-violet-600" aria-hidden="true"
                    >login</span
                  >
                  Diyetisyen Girişi Yap
                </a>
                <button
                  type="button"
                  (click)="launchDietitianDemo()"
                  class="odv-btn-soft !min-h-12 !px-5 !text-sm"
                >
                  <span class="material-symbols-rounded !text-lg" aria-hidden="true"
                    >play_circle</span
                  >
                  Canlı Demo Paneli Aç
                </button>
                <a
                  routerLink="/portal/login"
                  class="inline-flex min-h-12 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100/80 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  <span class="material-symbols-rounded !text-lg" aria-hidden="true">favorite</span>
                  Danışan Portalı Girişi
                </a>
              </div>
            </div>

            <!-- ÜRÜN EKRAN GÖRÜNTÜLERİ VİTRİNİ (GERÇEK UYGULAMA PENCERESİ GÖRÜNÜMÜ) -->
            <div id="ekran-goruntuleri" class="mt-12">
              <!-- Ekran Seçici Sekmeler -->
              <div
                class="flex flex-wrap items-center justify-center gap-2"
                role="tablist"
                aria-label="Ürün ekran görüntüleri"
              >
                @for (tab of screenTabs; track tab.id) {
                  <button
                    type="button"
                    role="tab"
                    [attr.aria-selected]="activeScreen() === tab.id"
                    class="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-extrabold transition"
                    [class]="
                      activeScreen() === tab.id
                        ? 'border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-600/25'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                    "
                    (click)="activeScreen.set(tab.id)"
                  >
                    <span class="material-symbols-rounded !text-base" aria-hidden="true">{{
                      tab.icon
                    }}</span>
                    {{ tab.label }}
                  </button>
                }
              </div>

              <!-- Tarayıcı Penceresi Çerçeveli Gerçek Ürün Ekran Görüntüsü -->
              <div
                class="mt-5 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-[#0b1020]"
              >
                <!-- Tarayıcı Üst Çubuğu -->
                <div
                  class="flex items-center justify-between border-b border-slate-200 bg-slate-100/90 px-4 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div class="flex items-center gap-2">
                    <span class="size-3 rounded-full bg-rose-400"></span>
                    <span class="size-3 rounded-full bg-amber-400"></span>
                    <span class="size-3 rounded-full bg-emerald-400"></span>
                  </div>
                  <div
                    class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1 font-mono text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                  >
                    <span class="material-symbols-rounded !text-sm text-emerald-500" aria-hidden="true"
                      >lock</span
                    >
                    {{ currentScreenMeta().routeUrl }}
                  </div>
                  <button
                    type="button"
                    (click)="launchDietitianDemo()"
                    class="text-[11px] font-bold text-violet-600 hover:underline dark:text-violet-400"
                  >
                    Bu Ekranı Canlı Aç →
                  </button>
                </div>

                <!-- Uygulama İçi Görsel Ekran Görüntüsü (Sol Sidebar + Sağ İçerik Alanı) -->
                <div class="grid min-h-[470px] lg:grid-cols-[220px_1fr]">
                  <!-- Sol Uygulama Menüsü Mockup -->
                  <aside
                    class="hidden border-e border-slate-200/80 bg-slate-50/70 p-4 lg:flex lg:flex-col lg:justify-between dark:border-slate-800 dark:bg-slate-900/50"
                    aria-hidden="true"
                  >
                    <div class="space-y-4">
                      <div class="flex items-center gap-2.5 px-2">
                        <span
                          class="grid size-8 place-items-center rounded-lg bg-violet-600 text-white"
                        >
                          <span class="material-symbols-rounded !text-base">nutrition</span>
                        </span>
                        <div>
                          <strong class="block text-xs font-extrabold">OdivonDiet</strong>
                          <span class="text-[10px] text-slate-400">Uzm. Dyt. Deniz Arslan</span>
                        </div>
                      </div>
                      <div class="space-y-1 text-xs">
                        @for (nav of screenTabs; track nav.id) {
                          <div
                            class="flex items-center gap-2 rounded-xl px-3 py-2 font-semibold"
                            [class]="
                              activeScreen() === nav.id
                                ? 'bg-violet-600 text-white'
                                : 'text-slate-500 dark:text-slate-400'
                            "
                          >
                            <span class="material-symbols-rounded !text-base">{{ nav.icon }}</span>
                            <span class="truncate">{{ nav.label.slice(3) }}</span>
                          </div>
                        }
                      </div>
                    </div>
                    <div class="rounded-xl border border-slate-200 bg-white p-3 text-[11px] dark:border-slate-800 dark:bg-slate-900">
                      <strong class="block text-violet-600 dark:text-violet-400"
                        >Aktif Klinik</strong
                      >
                      <span class="text-slate-500">Nişantaşı Beslenme Merkezi</span>
                    </div>
                  </aside>

                  <!-- Sağ Ekran İçeriği -->
                  <div class="p-5 sm:p-7">
                    <!-- EKRAN 1: GENEL BAKIŞ & KLİNİK KOKPİT -->
                    @if (activeScreen() === 'overview') {
                      <div class="space-y-5">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span class="odv-eyebrow">Genel Bakış · Klinik Kokpit</span>
                            <h3 class="text-lg font-extrabold">
                              Günaydın, Uzm. Dyt. Deniz Arslan
                            </h3>
                          </div>
                          <span class="odv-badge odv-tone-positive"
                            >Bugün 3 Randevu · %94 Plan Uyumu</span
                          >
                        </div>

                        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div class="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                            <span class="text-[11px] text-slate-400">Aktif Danışan</span>
                            <strong class="tabular mt-1 block text-2xl font-extrabold">48</strong>
                            <span class="text-[11px] font-semibold text-emerald-600"
                              >+6 bu ay yeni kayıt</span
                            >
                          </div>
                          <div class="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                            <span class="text-[11px] text-slate-400">Toplam Yağ Kaybı</span>
                            <strong class="tabular mt-1 block text-2xl font-extrabold text-emerald-600"
                              >−184,6 kg</strong
                            >
                            <span class="text-[11px] text-slate-400">Kas korunumu %91</span>
                          </div>
                          <div class="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                            <span class="text-[11px] text-slate-400">Aktif Diyet Planı</span>
                            <strong class="tabular mt-1 block text-2xl font-extrabold text-violet-600"
                              >44</strong
                            >
                            <span class="text-[11px] text-slate-400">Ort. 1.720 kcal/gün</span>
                          </div>
                          <div class="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                            <span class="text-[11px] text-slate-400">Klinik Uyarı</span>
                            <strong class="tabular mt-1 block text-2xl font-extrabold text-amber-600"
                              >3</strong
                            >
                            <span class="text-[11px] text-slate-400">Ölçüm & tahlil kontrolü</span>
                          </div>
                        </div>

                        <div class="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                          <div class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                            <div class="flex items-center justify-between">
                              <strong class="text-xs font-extrabold"
                                >Elif Kaya — Kilo & İskelet Kası (SMM) İlerleme Grafiği</strong
                              >
                              <span class="odv-badge odv-tone-positive">82,0 kg → 74,6 kg</span>
                            </div>
                            <svg
                              viewBox="0 0 360 110"
                              class="mt-3 h-28 w-full"
                              preserveAspectRatio="none"
                              aria-hidden="true"
                            >
                              <defs>
                                <linearGradient id="scr-grad" x1="0" x2="0" y1="0" y2="1">
                                  <stop offset="0%" stop-color="#7c3aed" stop-opacity=".35" />
                                  <stop offset="100%" stop-color="#7c3aed" stop-opacity="0" />
                                </linearGradient>
                              </defs>
                              <path
                                d="M0,18 C60,25 110,38 170,52 S280,74 360,86 L360,110 L0,110 Z"
                                fill="url(#scr-grad)"
                              />
                              <path
                                d="M0,18 C60,25 110,38 170,52 S280,74 360,86"
                                fill="none"
                                stroke="#7c3aed"
                                stroke-width="3"
                                stroke-linecap="round"
                              />
                              <line
                                x1="0"
                                x2="360"
                                y1="95"
                                y2="95"
                                stroke="#10b981"
                                stroke-dasharray="5 5"
                              />
                            </svg>
                            <div class="mt-2 flex justify-between text-[11px] text-slate-400">
                              <span>1. Hafta (82,0 kg)</span>
                              <span>4. Hafta (79,4 kg)</span>
                              <span>8. Hafta (76,8 kg)</span>
                              <span class="font-bold text-emerald-600">12. Hafta (74,6 kg)</span>
                            </div>
                          </div>

                          <div class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                            <strong class="block text-xs font-extrabold"
                              >Bugünkü Klinik Görüşmeler</strong
                            >
                            <div class="mt-3 space-y-2 text-xs">
                              <div
                                class="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60"
                              >
                                <div>
                                  <strong class="block">09:30 · Elif Kaya</strong>
                                  <span class="text-[11px] text-slate-500"
                                    >Yüz yüze · InBody BIA + Faz 2</span
                                  >
                                </div>
                                <span class="odv-badge odv-tone-primary">Muayenehane</span>
                              </div>
                              <div
                                class="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60"
                              >
                                <div>
                                  <strong class="block">11:00 · Mert Yılmaz</strong>
                                  <span class="text-[11px] text-slate-500"
                                    >Online Video · Yarı Maraton Planı</span
                                  >
                                </div>
                                <span class="odv-badge odv-tone-info">Video</span>
                              </div>
                              <div
                                class="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60"
                              >
                                <div>
                                  <strong class="block">15:30 · Zeynep Şahin</strong>
                                  <span class="text-[11px] text-slate-500"
                                    >Yüz yüze · Glutensiz Eliminasyon</span
                                  >
                                </div>
                                <span class="odv-badge odv-tone-positive">İlk Muayene</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    }

                    <!-- EKRAN 2: DİYET PROGRAMI & OTOMATİK KALORİ STÜDYOSU -->
                    @if (activeScreen() === 'plans') {
                      <div class="space-y-4">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span class="odv-eyebrow">Menü Mühendisliği & Atwater Motoru</span>
                            <h3 class="text-lg font-extrabold">
                              Elif Kaya — İnsülin Direnci Faz 2 Diyet Programı
                            </h3>
                          </div>
                          <div class="flex flex-wrap gap-1.5 text-xs">
                            <span class="odv-badge odv-tone-primary">Hedef: 1650 kcal</span>
                            <span class="odv-badge odv-tone-positive"
                              >Hesaplanan Menü: 1642 kcal</span
                            >
                            <span class="odv-badge odv-tone-info"
                              >Protein: 118 g (1,6 g/kg) · Lif: 34,2 g</span
                            >
                          </div>
                        </div>

                        <div class="grid gap-3 md:grid-cols-3">
                          <div class="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                            <div class="flex justify-between border-b border-slate-100 pb-2 text-xs font-bold dark:border-slate-800">
                              <span class="text-violet-600">08:00 · Kahvaltı</span>
                              <span class="tabular">412 kcal</span>
                            </div>
                            <ul class="mt-2.5 space-y-1.5 text-xs">
                              <li class="flex justify-between">
                                <span>2 adet haşlanmış yumurta (100g)</span>
                                <b class="tabular">144 kcal</b>
                              </li>
                              <li class="flex justify-between">
                                <span>1 dilim Ezine peyniri (veya Lor)</span>
                                <b class="tabular">93 kcal</b>
                              </li>
                              <li class="flex justify-between">
                                <span>2 dilim karabuğday ekmeği (60g)</span>
                                <b class="tabular">130 kcal</b>
                              </li>
                              <li class="flex justify-between">
                                <span>5 adet zeytin + yeşillik</span>
                                <b class="tabular">45 kcal</b>
                              </li>
                            </ul>
                          </div>

                          <div class="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                            <div class="flex justify-between border-b border-slate-100 pb-2 text-xs font-bold dark:border-slate-800">
                              <span class="text-violet-600">13:00 · Öğle Yemeği</span>
                              <span class="tabular">565 kcal</span>
                            </div>
                            <ul class="mt-2.5 space-y-1.5 text-xs">
                              <li class="flex justify-between">
                                <span>1 kepçe mercimek çorbası (200ml)</span>
                                <b class="tabular">135 kcal</b>
                              </li>
                              <li class="flex justify-between">
                                <span>150g ızgara tavuk göğsü</span>
                                <b class="tabular">248 kcal</b>
                              </li>
                              <li class="flex justify-between">
                                <span>4 YK siyez bulgur pilavı (100g)</span>
                                <b class="tabular">132 kcal</b>
                              </li>
                              <li class="flex justify-between">
                                <span>Mevsim salata (1 TK zeytinyağlı)</span>
                                <b class="tabular">50 kcal</b>
                              </li>
                            </ul>
                          </div>

                          <div class="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                            <div class="flex justify-between border-b border-slate-100 pb-2 text-xs font-bold dark:border-slate-800">
                              <span class="text-violet-600">19:00 · Akşam Yemeği</span>
                              <span class="tabular">485 kcal</span>
                            </div>
                            <ul class="mt-2.5 space-y-1.5 text-xs">
                              <li class="flex justify-between">
                                <span>180g fırında somon (Omega-3)</span>
                                <b class="tabular">295 kcal</b>
                              </li>
                              <li class="flex justify-between">
                                <span>1 porsiyon zeytinyağlı enginar</span>
                                <b class="tabular">110 kcal</b>
                              </li>
                              <li class="flex justify-between">
                                <span>1 su bardağı probiyotik kefir</span>
                                <b class="tabular">80 kcal</b>
                              </li>
                            </ul>
                          </div>
                        </div>

                        <div
                          class="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-violet-50/80 p-3.5 text-xs dark:bg-violet-950/30"
                        >
                          <div>
                            <strong class="text-violet-900 dark:text-violet-200"
                              >BeBis Günlük Değişim Dağılımı:</strong
                            >
                            <span class="ms-2 text-slate-600 dark:text-slate-300"
                              >Süt: 2,5 · Et/Peynir: 5,0 · Ekmek/Tahıl: 4,0 · Sebze: 3,0 · Meyve:
                              2,0 · Yağ: 3,5</span
                            >
                          </div>
                          <span class="odv-badge odv-tone-primary"
                            >🛒 7 Günlük Market Listesi Hazır</span
                          >
                        </div>
                      </div>
                    }

                    <!-- EKRAN 3: KAN TAHLİLİ, HOMA-IR, İLAÇ-BESİN & GLP-1 SARKOPENİ -->
                    @if (activeScreen() === 'clinical') {
                      <div class="space-y-4">
                        <div class="grid gap-3 sm:grid-cols-3">
                          <div
                            class="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5 dark:border-rose-900/50 dark:bg-rose-950/30"
                          >
                            <span class="text-[10px] font-bold uppercase text-rose-600"
                              >HOMA-IR İnsülin Direnci</span
                            >
                            <strong class="tabular mt-0.5 block text-2xl font-extrabold"
                              >2,86</strong
                            >
                            <span class="text-[11px] text-slate-500"
                              >Glukoz: 98 · İnsülin: 11,8 µIU/mL</span
                            >
                          </div>
                          <div
                            class="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/30"
                          >
                            <span class="text-[10px] font-bold uppercase text-amber-600"
                              >TG / HDL Aterojenik İndeks</span
                            >
                            <strong class="tabular mt-0.5 block text-2xl font-extrabold"
                              >2,65</strong
                            >
                            <span class="text-[11px] text-slate-500"
                              >Trigliserid: 138 · HDL: 52 mg/dL</span
                            >
                          </div>
                          <div
                            class="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/30"
                          >
                            <span class="text-[10px] font-bold uppercase text-emerald-600"
                              >GLP-1 Sarkopeni Kas Radarı</span
                            >
                            <strong class="tabular mt-0.5 block text-2xl font-extrabold"
                              >%9 Kas Kaybı</strong
                            >
                            <span class="text-[11px] text-slate-500"
                              >Güvenli Sınır (&lt;%20) · 1,6 g/kg Protein</span
                            >
                          </div>
                        </div>

                        <div
                          class="rounded-2xl border border-amber-300/80 bg-amber-50/50 p-4 text-xs dark:border-amber-900/50 dark:bg-amber-950/20"
                        >
                          <strong class="flex items-center gap-1.5 text-sm font-extrabold text-amber-900 dark:text-amber-200">
                            <span class="material-symbols-rounded !text-lg text-amber-600"
                              >medication</span
                            >
                            İlaç × Beslenme Planı × Kan Tahlili Otomatik Çapraz Uyarıları
                          </strong>
                          <div class="mt-2.5 grid gap-2.5 md:grid-cols-2">
                            <div class="rounded-xl bg-white p-3 dark:bg-slate-900">
                              <strong class="text-rose-600"
                                >Euthyrox 50 mcg (Levotiroksin) × Kahvaltı Menüsü</strong
                              >
                              <p class="mt-1 text-slate-600 dark:text-slate-300">
                                Kahvaltıdaki Ezine peyniri ve ceviz L-tiroksin emilimini %40
                                düşürür. İlacı kahvaltıdan 45–60 dk önce aç karnına ayırın.
                              </p>
                            </div>
                            <div class="rounded-xl bg-white p-3 dark:bg-slate-900">
                              <strong class="text-violet-600"
                                >Glifor 1000 mg (Metformin) × Serum B12 (310 pg/mL)</strong
                              >
                              <p class="mt-1 text-slate-600 dark:text-slate-300">
                                Metformin kaynaklı ileal B12 malabsorpsiyonu saptandı. Sabah aç
                                karnına 1000 mcg sublingual Metilkobalamin protokolü eklendi.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    }

                    <!-- EKRAN 4: GÖRSEL RANDEVU TAKVİMİ & INBODY BIA -->
                    @if (activeScreen() === 'calendar') {
                      <div class="space-y-4">
                        <div class="grid gap-3 sm:grid-cols-4">
                          <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                            <span class="text-[11px] text-slate-400">İskelet Kası (SMM)</span>
                            <strong class="tabular block text-lg font-extrabold text-violet-600"
                              >29,4 kg</strong
                            >
                          </div>
                          <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                            <span class="text-[11px] text-slate-400">Visseral Yağ</span>
                            <strong class="tabular block text-lg font-extrabold"
                              >Seviye 7 (Normal)</strong
                            >
                          </div>
                          <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                            <span class="text-[11px] text-slate-400">ECW/TBW (Ödem)</span>
                            <strong class="tabular block text-lg font-extrabold text-emerald-600"
                              >0,378</strong
                            >
                          </div>
                          <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                            <span class="text-[11px] text-slate-400">Biyoelektrik Faz Açısı</span>
                            <strong class="tabular block text-lg font-extrabold">6,2°</strong>
                          </div>
                        </div>

                        <div class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                          <div class="mb-3 flex items-center justify-between text-xs">
                            <strong class="font-extrabold"
                              >Haftalık Görsel Randevu Takvimi (08:00–20:00 Saat Izgarası)</strong
                            >
                            <span class="text-slate-400"
                              >Boş slota tıklayarak anında randevu oluşturun</span
                            >
                          </div>
                          <div class="grid grid-cols-5 gap-2 text-xs">
                            <div class="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                              <span class="block text-[10px] font-bold text-slate-400"
                                >Pazartesi</span
                              >
                              <div class="mt-2 rounded-lg bg-violet-100 p-2 text-violet-900 dark:bg-violet-950/80 dark:text-violet-200">
                                <b>09:30</b> Elif Kaya
                                <span class="block text-[10px]">Yüz yüze BIA</span>
                              </div>
                            </div>
                            <div class="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                              <span class="block text-[10px] font-bold text-slate-400">Salı</span>
                              <div class="mt-2 rounded-lg bg-sky-100 p-2 text-sky-900 dark:bg-sky-950/80 dark:text-sky-200">
                                <b>11:00</b> Mert Yılmaz
                                <span class="block text-[10px]">Online Video</span>
                              </div>
                            </div>
                            <div class="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                              <span class="block text-[10px] font-bold text-slate-400"
                                >Çarşamba</span
                              >
                              <div class="mt-2 rounded-lg bg-emerald-100 p-2 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200">
                                <b>14:00</b> Selin Aras
                                <span class="block text-[10px]">Kontrol Muayene</span>
                              </div>
                            </div>
                            <div class="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                              <span class="block text-[10px] font-bold text-slate-400"
                                >Perşembe</span
                              >
                              <div class="mt-2 rounded-lg bg-amber-100 p-2 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200">
                                <b>16:00</b> Burak Demir
                                <span class="block text-[10px]">GLP-1 Titrasyon</span>
                              </div>
                            </div>
                            <div class="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                              <span class="block text-[10px] font-bold text-slate-400">Cuma</span>
                              <div class="mt-2 rounded-lg bg-violet-100 p-2 text-violet-900 dark:bg-violet-950/80 dark:text-violet-200">
                                <b>15:30</b> Zeynep Şahin
                                <span class="block text-[10px]">Eliminasyon Planı</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    }

                    <!-- EKRAN 5: DANIŞAN MOBİL & WEB PORTALI -->
                    @if (activeScreen() === 'portal') {
                      <div class="grid items-center gap-6 md:grid-cols-[1fr_1.2fr]">
                        <div class="space-y-3">
                          <span class="odv-badge odv-tone-positive">Danışan Deneyimi</span>
                          <h3 class="text-lg font-extrabold">
                            Danışanlarınız kendi portalından programını adım adım uygular
                          </h3>
                          <p class="text-xs leading-5 text-slate-500 dark:text-slate-400">
                            Danışanınıza gönderdiğiniz davet ile kendi ekranından günlük öğünlerini,
                            alternatif yemeklerini, su hedefini, haftalık ölçüm girişlerini ve
                            mesajlarınızı anlık takip eder.
                          </p>
                          <div class="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              (click)="launchMemberDemo()"
                              class="odv-btn-primary !min-h-9 text-xs"
                            >
                              Canlı Danışan Portalını Aç →
                            </button>
                            <a routerLink="/portal/login" class="odv-btn-soft !min-h-9 text-xs">
                              Danışan Giriş Ekranı
                            </a>
                          </div>
                        </div>

                        <div
                          class="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/20"
                        >
                          <div class="flex items-center justify-between border-b border-emerald-200/60 pb-2.5 dark:border-emerald-900/40">
                            <div>
                              <strong class="block text-sm">Merhaba, Elif Kaya 👋</strong>
                              <span class="text-[11px] text-slate-500"
                                >Aktif Program: Kilo Verme · Faz 2 (1.650 kcal)</span
                              >
                            </div>
                            <span class="odv-badge odv-tone-positive">Hedefe %61</span>
                          </div>
                          <div class="mt-3 grid grid-cols-3 gap-2 text-center">
                            <div class="rounded-xl bg-white p-2.5 dark:bg-slate-900">
                              <span class="text-[10px] text-slate-400">Güncel Kilo</span>
                              <strong class="tabular block text-sm font-extrabold">74,6 kg</strong>
                            </div>
                            <div class="rounded-xl bg-white p-2.5 dark:bg-slate-900">
                              <span class="text-[10px] text-slate-400">Günlük Su</span>
                              <strong class="tabular block text-sm font-extrabold text-sky-600"
                                >2,8 L</strong
                              >
                            </div>
                            <div class="rounded-xl bg-white p-2.5 dark:bg-slate-900">
                              <span class="text-[10px] text-slate-400">Sonraki Randevu</span>
                              <strong class="block text-sm font-extrabold text-violet-600"
                                >09:30</strong
                              >
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Alt Ekran Açıklama Bandı -->
                <div
                  class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
                >
                  <span>{{ currentScreenMeta().caption }}</span>
                  <div class="flex items-center gap-3 font-bold">
                    <a routerLink="/register" class="text-violet-600 hover:underline dark:text-violet-400"
                      >Kayıt Ol & Kullanmaya Başla</a
                    >
                    <span>·</span>
                    <a routerLink="/login" class="hover:underline">Giriş Yap</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 8 YÖNETİM MODÜLÜ DETAYLI TANITIM BÖLÜMÜ -->
        <section
          id="moduller"
          class="border-t border-slate-200/80 bg-white py-16 lg:py-24 dark:border-slate-800 dark:bg-slate-900/40"
        >
          <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-3xl text-center">
              <span class="odv-eyebrow">Uçtan Uca Klinik Beslenme Yönetimi</span>
              <h2 class="mt-2 text-2xl font-extrabold tracking-tight sm:text-4xl">
                Bir diyetisyenin ihtiyaç duyduğu tüm klinik araçlar, rakiplerde olmayan derinlikle.
              </h2>
              <p class="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                İlk anamnezden kan tahlili yorumuna, BeBis değişimli menü tasarımından danışan mobil
                portalına kadar her aşama birbirine bağlı çalışır.
              </p>
            </div>

            <div class="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              @for (mod of modules; track mod.title) {
                <article
                  class="odv-card flex flex-col justify-between p-5 transition hover:-translate-y-0.5 hover:border-violet-300 dark:hover:border-violet-700"
                >
                  <div>
                    <div class="flex items-center justify-between gap-2">
                      <span class="odv-badge odv-tone-primary !text-[10px]">{{ mod.badge }}</span>
                      <span
                        class="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"
                      >
                        <span class="material-symbols-rounded !text-lg" aria-hidden="true">{{
                          mod.icon
                        }}</span>
                      </span>
                    </div>
                    <h3 class="mt-3 text-base font-extrabold leading-snug">{{ mod.title }}</h3>
                    <p class="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {{ mod.summary }}
                    </p>
                    <ul class="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      @for (b of mod.bullets; track b) {
                        <li class="flex items-start gap-1.5">
                          <span
                            class="material-symbols-rounded mt-0.5 !text-sm text-emerald-500"
                            aria-hidden="true"
                            >check_circle</span
                          >
                          <span>{{ b }}</span>
                        </li>
                      }
                    </ul>
                  </div>
                  <div
                    class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800"
                  >
                    <span class="text-slate-400">{{ mod.metricLabel }}</span>
                    <strong class="tabular font-extrabold text-violet-600 dark:text-violet-400">{{
                      mod.metricValue
                    }}</strong>
                  </div>
                </article>
              }
            </div>
          </div>
        </section>

        <!-- CANLI İNTERAKTİF KLİNİK HESAPLAMA SİMÜLATÖRÜ -->
        <section id="hesaplayici" class="py-16 lg:py-24">
          <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="odv-card overflow-hidden p-6 sm:p-8 lg:p-10">
              <div class="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
                <div>
                  <span class="odv-eyebrow">Hemen Şimdi Test Edin</span>
                  <h2 class="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Canlı Klinik Metabolizma, LBM & Makro Hesaplama Motoru
                  </h2>
                  <p class="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Danışan parametrelerini değiştirerek OdivonDiet'in aynı anda 3 farklı BMR
                    formülünü, yağsız vücut kütlesini (LBM), günlük su ihtiyacını ve hedef makro
                    gramajlarını nasıl hesapladığını canlı görün.
                  </p>

                  <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <label class="block">
                      <span class="odv-label">Cinsiyet</span>
                      <select
                        class="odv-input !py-2 text-xs"
                        [ngModel]="calcSex()"
                        (ngModelChange)="calcSex.set($event)"
                      >
                        <option value="female">Kadın</option>
                        <option value="male">Erkek</option>
                      </select>
                    </label>
                    <label class="block">
                      <span class="odv-label">Yaş</span>
                      <input
                        class="odv-input tabular !py-2 text-xs"
                        type="number"
                        min="14"
                        max="90"
                        [ngModel]="calcAge()"
                        (ngModelChange)="calcAge.set(+$event || 30)"
                      />
                    </label>
                    <label class="block">
                      <span class="odv-label">Boy (cm)</span>
                      <input
                        class="odv-input tabular !py-2 text-xs"
                        type="number"
                        min="130"
                        max="220"
                        [ngModel]="calcHeightCm()"
                        (ngModelChange)="calcHeightCm.set(+$event || 168)"
                      />
                    </label>
                    <label class="block">
                      <span class="odv-label">Kilo (kg)</span>
                      <input
                        class="odv-input tabular !py-2 text-xs"
                        type="number"
                        min="35"
                        max="250"
                        step="0.5"
                        [ngModel]="calcWeightKg()"
                        (ngModelChange)="calcWeightKg.set(+$event || 74)"
                      />
                    </label>
                    <label class="block">
                      <span class="odv-label">Yağ Oranı (%)</span>
                      <input
                        class="odv-input tabular !py-2 text-xs"
                        type="number"
                        min="5"
                        max="60"
                        [ngModel]="calcBodyFatPct()"
                        (ngModelChange)="calcBodyFatPct.set(+$event || 28)"
                      />
                    </label>
                    <label class="block">
                      <span class="odv-label">Aktivite Düzeyi</span>
                      <select
                        class="odv-input !py-2 text-xs"
                        [ngModel]="calcActivity()"
                        (ngModelChange)="calcActivity.set($event)"
                      >
                        <option value="sedentary">Hareketsiz (×1,2)</option>
                        <option value="light">Hafif Aktif (×1,375)</option>
                        <option value="moderate">Orta Aktif (×1,55)</option>
                        <option value="active">Aktif (×1,725)</option>
                      </select>
                    </label>
                    <label class="col-span-2 block sm:col-span-3">
                      <span class="odv-label">Klinik Program Hedefi</span>
                      <select
                        class="odv-input !py-2 text-xs"
                        [ngModel]="calcProgram()"
                        (ngModelChange)="calcProgram.set($event)"
                      >
                        <option value="weight_loss">Kilo Verme (−500 kcal/gün sağlıklı açık)</option>
                        <option value="clinical">Klinik / İnsülin Direnci Dengesi</option>
                        <option value="sports">Sporcu Performans & Kas Artışı (+250 kcal)</option>
                        <option value="weight_gain">Sağlıklı Kilo Alma (+350 kcal)</option>
                      </select>
                    </label>
                  </div>
                </div>

                <!-- Sağ: Canlı Hesaplama Sonuçları -->
                <div
                  class="flex flex-col justify-between rounded-2xl border border-violet-200 bg-violet-50/40 p-5 dark:border-violet-900/50 dark:bg-violet-950/20"
                >
                  <div>
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <span class="odv-eyebrow">Anlık Klinik Hesaplama Çıktısı</span>
                      <span class="odv-badge" [class]="'odv-tone-' + liveCalc().band.tone">
                        BKİ: {{ liveCalc().bmiVal }} ({{ liveCalc().band.label }})
                      </span>
                    </div>

                    <div class="mt-4 grid grid-cols-3 gap-2.5 text-center">
                      <div class="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
                        <span class="text-[10px] font-bold text-slate-400">Mifflin-St Jeor BMR</span>
                        <strong class="tabular mt-0.5 block text-xl font-extrabold"
                          >{{ liveCalc().mifflin }} <small class="text-xs">kcal</small></strong
                        >
                      </div>
                      <div class="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
                        <span class="text-[10px] font-bold text-slate-400">Harris-Benedict</span>
                        <strong class="tabular mt-0.5 block text-xl font-extrabold"
                          >{{ liveCalc().harris }} <small class="text-xs">kcal</small></strong
                        >
                      </div>
                      <div class="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
                        <span class="text-[10px] font-bold text-slate-400"
                          >Katch-McArdle (LBM)</span
                        >
                        <strong class="tabular mt-0.5 block text-xl font-extrabold text-violet-600"
                          >{{ liveCalc().katch }} <small class="text-xs">kcal</small></strong
                        >
                      </div>
                    </div>

                    <div class="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      <div class="rounded-xl bg-white p-3 dark:bg-slate-900">
                        <span class="text-[10px] text-slate-400">Günlük TDEE</span>
                        <strong class="tabular block text-base font-extrabold"
                          >{{ liveCalc().tdeeVal }} kcal</strong
                        >
                      </div>
                      <div class="rounded-xl bg-white p-3 dark:bg-slate-900">
                        <span class="text-[10px] text-slate-400">Önerilen Diyet</span>
                        <strong class="tabular block text-base font-extrabold text-emerald-600"
                          >{{ liveCalc().targetKcal }} kcal</strong
                        >
                      </div>
                      <div class="rounded-xl bg-white p-3 dark:bg-slate-900">
                        <span class="text-[10px] text-slate-400">Yağsız Kütle (LBM)</span>
                        <strong class="tabular block text-base font-extrabold"
                          >{{ liveCalc().lbm }} kg</strong
                        >
                      </div>
                      <div class="rounded-xl bg-white p-3 dark:bg-slate-900">
                        <span class="text-[10px] text-slate-400">Su İhtiyacı</span>
                        <strong class="tabular block text-base font-extrabold text-sky-600"
                          >{{ liveCalc().waterL }} L/gün</strong
                        >
                      </div>
                    </div>

                    <div class="mt-3 rounded-xl bg-white p-3.5 text-xs dark:bg-slate-900">
                      <div class="flex items-center justify-between font-bold">
                        <span>Önerilen Günlük Makro Dağılımı (%30 P / %40 K / %30 Y)</span>
                        <span class="text-violet-600"
                          >İdeal Kilo: {{ liveCalc().ideal.minKg }}–{{
                            liveCalc().ideal.maxKg
                          }}
                          kg</span
                        >
                      </div>
                      <div class="mt-2 grid grid-cols-3 gap-2 text-center">
                        <div class="rounded-lg bg-violet-50 py-1.5 font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                          Protein: {{ liveCalc().macros.protein }} g ({{
                            liveCalc().proteinPerKg
                          }}
                          g/kg)
                        </div>
                        <div class="rounded-lg bg-amber-50 py-1.5 font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                          Karbonhidrat: {{ liveCalc().macros.carb }} g
                        </div>
                        <div class="rounded-lg bg-sky-50 py-1.5 font-bold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                          Yağ: {{ liveCalc().macros.fat }} g
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2">
                    <span class="text-xs text-slate-500"
                      >Bu hesaplamayı tek tıkla öğün planına dönüştürmek ister misiniz?</span
                    >
                    <a routerLink="/register" class="odv-btn-primary !min-h-9 text-xs">
                      Kayıt Ol & Planla →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- RAKİPLERLE KARŞILAŞTIRMA MATRİSİ -->
        <section
          id="karsilastirma"
          class="border-t border-slate-200/80 bg-white py-16 lg:py-24 dark:border-slate-800 dark:bg-slate-900/40"
        >
          <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-2xl text-center">
              <span class="odv-eyebrow">Neden OdivonDiet?</span>
              <h2 class="mt-2 text-2xl font-extrabold tracking-tight sm:text-4xl">
                Standart diyet programları ve rakiplerle karşılaştırma
              </h2>
            </div>

            <div class="odv-card mt-10 overflow-hidden">
              <div class="custom-scroll overflow-x-auto">
                <table class="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr class="border-b border-slate-200 dark:border-slate-800">
                      <th class="odv-th">Klinik Özellik / Yetenek</th>
                      <th class="odv-th text-center">Word / Excel Şablonları</th>
                      <th class="odv-th text-center">Klasik Diyet Yazılımları</th>
                      <th class="odv-th bg-violet-50/80 text-center text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                        OdivonDiet Klinik
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 text-xs dark:divide-slate-800">
                    <tr>
                      <td class="odv-td font-bold">
                        BeBis 8 Değişim Grubu + Otomatik Atwater Kalori/Lif Hesabı
                      </td>
                      <td class="odv-td text-center text-slate-400">Manuel Hesap</td>
                      <td class="odv-td text-center text-emerald-600">Var</td>
                      <td class="odv-td bg-violet-50/40 text-center font-extrabold text-emerald-600 dark:bg-violet-950/20">
                        ✓ Tam Otomatik + Alternatif Besinli
                      </td>
                    </tr>
                    <tr>
                      <td class="odv-td font-bold">
                        İlaç × Beslenme Planı × Kan Tahlili Üçlü Etkileşim Motoru
                      </td>
                      <td class="odv-td text-center text-rose-500">Yok</td>
                      <td class="odv-td text-center text-rose-500">Yok (Sadece Not Alanı)</td>
                      <td class="odv-td bg-violet-50/40 text-center font-extrabold text-emerald-600 dark:bg-violet-950/20">
                        ✓ Levotiroksin, Metformin, Statin, Warfarin Denetimi
                      </td>
                    </tr>
                    <tr>
                      <td class="odv-td font-bold">
                        GLP-1 (Ozempic/Mounjaro) & Bariatrik Sarkopeni Kas Radarı
                      </td>
                      <td class="odv-td text-center text-rose-500">Yok</td>
                      <td class="odv-td text-center text-rose-500">Yok</td>
                      <td class="odv-td bg-violet-50/40 text-center font-extrabold text-emerald-600 dark:bg-violet-950/20">
                        ✓ Kas Kaybı % Alarmı + Lösin & Bristol Takibi
                      </td>
                    </tr>
                    <tr>
                      <td class="odv-td font-bold">
                        Krono-Beslenme & 24s Post-Prandiyal Glisemik Eğri Simülasyonu
                      </td>
                      <td class="odv-td text-center text-rose-500">Yok</td>
                      <td class="odv-td text-center text-rose-500">Yok</td>
                      <td class="odv-td bg-violet-50/40 text-center font-extrabold text-emerald-600 dark:bg-violet-950/20">
                        ✓ Sirkadiyen Açlık + Saatlik Glukoz Dalga Grafiği
                      </td>
                    </tr>
                    <tr>
                      <td class="odv-td font-bold">
                        InBody / Tanita Segmental BIA (SMM, ECW/TBW Ödem, Faz Açısı)
                      </td>
                      <td class="odv-td text-center text-slate-400">Kısıtlı</td>
                      <td class="odv-td text-center text-slate-500">Sadece Kilo & Yağ %</td>
                      <td class="odv-td bg-violet-50/40 text-center font-extrabold text-emerald-600 dark:bg-violet-950/20">
                        ✓ Tam Hücresel BIA + US Navy Çevre Formülü
                      </td>
                    </tr>
                    <tr>
                      <td class="odv-td font-bold">
                        7 Günlük Otomatik Gramajlı Alışveriş & Meal-Prep Listesi
                      </td>
                      <td class="odv-td text-center text-rose-500">Yok</td>
                      <td class="odv-td text-center text-slate-500">Kısıtlı</td>
                      <td class="odv-td bg-violet-50/40 text-center font-extrabold text-emerald-600 dark:bg-violet-950/20">
                        ✓ 1 / 3 / 7 / 14 Günlük Tek Tıkla Hazır
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <!-- ALT BAŞLANGIÇ ÇAĞRISI (FİYAT VEYA SABİT PAKET OLMADAN) -->
        <section class="py-16 lg:py-20">
          <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div
              class="rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 p-8 text-center text-white shadow-2xl shadow-violet-600/25 sm:p-12"
            >
              <h2 class="text-2xl font-extrabold tracking-tight sm:text-4xl">
                Muayenehanenizi bugün dijital klinik standardına taşıyın
              </h2>
              <p class="mx-auto mt-3 max-w-2xl text-sm leading-6 text-violet-100">
                Hemen uzman hesabınızı oluşturun, mevcut hesabınızla giriş yapın veya örnek klinik
                verileriyle tüm modülleri canlı inceleyin.
              </p>
              <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
                <a
                  routerLink="/register"
                  class="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-extrabold text-violet-700 shadow-lg transition hover:bg-violet-50"
                >
                  <span class="material-symbols-rounded !text-lg" aria-hidden="true"
                    >person_add</span
                  >
                  Ücretsiz Uzman Hesabı Oluştur
                </a>
                <a
                  routerLink="/login"
                  class="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                >
                  <span class="material-symbols-rounded !text-lg" aria-hidden="true">login</span>
                  Diyetisyen Girişi Yap
                </a>
                <button
                  type="button"
                  (click)="launchDietitianDemo()"
                  class="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                >
                  <span class="material-symbols-rounded !text-lg" aria-hidden="true"
                    >play_circle</span
                  >
                  Canlı Demo İncele
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <!-- ALT BİLGİ (FOOTER) -->
      <footer
        class="border-t border-slate-200 bg-white py-10 text-xs text-slate-500 dark:border-slate-800 dark:bg-[#070b16]"
      >
        <div
          class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8"
        >
          <div class="flex items-center gap-3">
            <strong class="text-sm font-extrabold text-slate-900 dark:text-white">{{
              product.name
            }}</strong>
            <span>· Klinik Beslenme & Danışan Yönetim Platformu</span>
            <odv-version-badge />
          </div>
          <div class="flex flex-wrap items-center gap-4 font-semibold">
            <a routerLink="/login" class="hover:text-violet-600">Diyetisyen Girişi</a>
            <a routerLink="/register" class="hover:text-violet-600">Kayıt Ol</a>
            <a routerLink="/portal/login" class="hover:text-emerald-600">Danışan Portalı</a>
            <button type="button" (click)="launchDietitianDemo()" class="hover:text-violet-600">
              Canlı Demo
            </button>
          </div>
        </div>
      </footer>
    </div>
  `,
})
export class LandingPage {
  readonly product = PRODUCT;
  readonly theme = inject(ThemeStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  readonly screenTabs = SCREEN_TABS;
  readonly activeScreen = signal<ScreenId>('overview');
  readonly currentScreenMeta = computed(
    () => SCREEN_TABS.find((s) => s.id === this.activeScreen()) ?? SCREEN_TABS[0],
  );

  readonly modules = MANAGEMENT_MODULES;

  // Interactive Calculator Signals
  readonly calcSex = signal<Sex>('female');
  readonly calcAge = signal(32);
  readonly calcHeightCm = signal(166);
  readonly calcWeightKg = signal(74.5);
  readonly calcBodyFatPct = signal(29);
  readonly calcActivity = signal<ActivityLevel>('moderate');
  readonly calcProgram = signal<ProgramType>('weight_loss');

  readonly liveCalc = computed(() => {
    const sex = this.calcSex();
    const age = this.calcAge();
    const h = this.calcHeightCm();
    const w = this.calcWeightKg();
    const bf = this.calcBodyFatPct();
    const act = this.calcActivity();
    const prog = this.calcProgram();

    const bmiVal = bmi(w, h);
    const band = bmiBand(bmiVal);
    const lbm = leanBodyMassKg(w, bf, h, sex);
    const mifflin = bmr(sex, w, h, age);
    const harris = harrisBenedictBmr(sex, w, h, age);
    const katch = katchMcArdleBmr(lbm);
    const tdeeVal = tdee(mifflin, act);
    const targetKcal = suggestedKcal(tdeeVal, prog);
    const macros = macroGrams(targetKcal, 30, 40, 30);
    const proteinPerKg = round1(macros.protein / Math.max(35, w));
    const waterL = waterNeedLiters(w, act);
    const ideal = idealWeightRange(h, sex);

    return {
      bmiVal,
      band,
      lbm,
      mifflin,
      harris,
      katch,
      tdeeVal,
      targetKcal,
      macros,
      proteinPerKg,
      waterL,
      ideal,
    };
  });

  async launchDietitianDemo(): Promise<void> {
    this.auth.continueDemo();
    await this.router.navigateByUrl('/overview');
  }

  async launchMemberDemo(): Promise<void> {
    await this.auth.continueMemberDemo();
    await this.router.navigateByUrl('/portal');
  }
}
