import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth-store';
import { ThemeStore } from '../../core/theme/theme-store';
import {
  BillingCycle,
  PLANS,
  Plan,
  TRIAL_DAYS,
  formatTry,
  yearlyTotal,
} from '../../domain/billing';
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

type ShowcaseTab = 'studio' | 'biomarker' | 'glp1' | 'calendar';

interface ModuleFeature {
  readonly badge: string;
  readonly icon: string;
  readonly title: string;
  readonly summary: string;
  readonly bullets: readonly string[];
  readonly metricLabel: string;
  readonly metricValue: string;
}

const MANAGEMENT_MODULES: readonly ModuleFeature[] = [
  {
    badge: '1. Menü Mühendisliği',
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
    badge: '2. Besin & Tarif Veritabanı',
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
    badge: '3. Biyokimya & Tahlil Zekâsı',
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
    badge: '4. Farmako-Beslenme (Rakiplerde Yok)',
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
    badge: '5. GLP-1 & Bariatrik Koruma (Rakiplerde Yok)',
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
    badge: '6. Segmental BIA & Antropometri',
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
    badge: '7. Krono-Beslenme & Sirkadiyen Saat',
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
    badge: '8. Görsel Ajanda & Danışan Portalı',
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
      <!-- ÜST SABİT NAVİGASYON BARI (Sol üstte marka + Giriş/Kayıt hızlı erişim & Sağda aksiyonlar) -->
      <header
        class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#070b16]/90"
      >
        <div
          class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8"
        >
          <!-- Sol Üst: Marka + Hızlı Giriş Yap / Kayıt Ol / Danışan Portalı -->
          <div class="flex flex-wrap items-center gap-3 sm:gap-4">
            <a routerLink="/" class="flex items-center gap-2.5">
              <span
                class="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30"
              >
                <span class="material-symbols-rounded icon-fill !text-xl" aria-hidden="true"
                  >nutrition</span
                >
              </span>
              <div>
                <strong class="block text-base font-extrabold leading-none tracking-tight">{{
                  product.name
                }}</strong>
                <span class="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  diet.odivon.com
                </span>
              </div>
            </a>

            <!-- Sol Üst Hızlı Giriş / Kayıt Hapları -->
            <div
              class="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 p-1 text-xs font-bold dark:border-slate-800 dark:bg-slate-900"
              aria-label="Hızlı hesap işlemleri"
            >
              <a
                routerLink="/login"
                class="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-slate-900 shadow-sm transition hover:text-violet-600 dark:bg-slate-800 dark:text-white dark:hover:text-violet-300"
              >
                <span class="material-symbols-rounded !text-base text-violet-600" aria-hidden="true"
                  >login</span
                >
                Giriş Yap
              </a>
              <a
                routerLink="/register"
                class="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-white shadow-sm transition hover:bg-violet-500"
              >
                <span class="material-symbols-rounded !text-base" aria-hidden="true"
                  >person_add</span
                >
                Kayıt Ol
              </a>
              <a
                routerLink="/portal/login"
                class="hidden items-center gap-1 rounded-lg px-2.5 py-1.5 text-emerald-700 transition hover:bg-emerald-50 sm:inline-flex dark:text-emerald-300 dark:hover:bg-emerald-950/50"
              >
                <span class="material-symbols-rounded !text-base" aria-hidden="true">favorite</span>
                Danışan Girişi
              </a>
            </div>
          </div>

          <!-- Orta: Bölüm Bağlantıları -->
          <nav
            class="hidden items-center gap-5 text-xs font-bold text-slate-600 xl:flex dark:text-slate-300"
            aria-label="Tanıtım bölümleri"
          >
            <a href="#vitrin" class="transition hover:text-violet-600 dark:hover:text-violet-400"
              >Canlı Kokpit</a
            >
            <a href="#moduller" class="transition hover:text-violet-600 dark:hover:text-violet-400"
              >8 Yönetim Modülü</a
            >
            <a
              href="#hesaplayici"
              class="transition hover:text-violet-600 dark:hover:text-violet-400"
              >Canlı BMR & Makro Motoru</a
            >
            <a
              href="#karsilastirma"
              class="transition hover:text-violet-600 dark:hover:text-violet-400"
              >Rakiplerle Farkımız</a
            >
            <a href="#paketler" class="transition hover:text-violet-600 dark:hover:text-violet-400"
              >Paketler & Fiyatlar</a
            >
          </nav>

          <!-- Sağ: Canlı Demo & Tema -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="odv-btn-soft !min-h-9 !px-3 text-xs"
              (click)="launchDietitianDemo()"
            >
              <span class="material-symbols-rounded !text-base" aria-hidden="true"
                >play_circle</span
              >
              Canlı Demo Paneli Aç
            </button>
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
        <!-- HERO BÖLÜMÜ: Tanıtım + Ekran Üzeri Doğrudan Giriş/Kayıt Kartları + Etkileşimli Ürün Önizlemesi -->
        <section class="relative overflow-hidden pb-16 pt-10 lg:pb-24 lg:pt-14">
          <div class="pointer-events-none absolute inset-0" aria-hidden="true">
            <div
              class="absolute -top-40 start-1/4 size-[34rem] rounded-full bg-violet-500/15 blur-[130px]"
            ></div>
            <div
              class="absolute end-10 top-20 size-[28rem] rounded-full bg-emerald-500/10 blur-[120px]"
            ></div>
          </div>

          <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="grid items-center gap-10 lg:grid-cols-[1.08fr_1fr]">
              <!-- Sol: Değer Önerisi & Doğrudan Giriş / Kayıt / Demo Konsolu -->
              <div>
                <div
                  class="inline-flex flex-wrap items-center gap-2 rounded-full border border-violet-200 bg-violet-50/90 px-3.5 py-1.5 text-xs font-bold text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200"
                >
                  <span class="size-2 rounded-full bg-emerald-500"></span>
                  Türkiye'nin En Kapsamlı Klinik Beslenme, Menü Mühendisliği & Biyobelirteç Platformu
                </div>

                <h1
                  class="mt-5 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.25rem]"
                >
                  Diyetisyen kliniğinizi
                  <span
                    class="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-emerald-500 bg-clip-text text-transparent"
                  >
                    bilimsel zekâyla
                  </span>
                  tek ekrandan yönetin.
                </h1>

                <p class="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                  Excel tablolarına, dağınık PDF listelerine ve manuel kalori hesabına son verin.
                  <strong>BeBis 8 değişim grubu</strong>, <strong>Atwater otomatik makro motoru</strong>,
                  <strong>HOMA-IR & kan tahlili analizi</strong>, <strong>İlaç–Besin etkileşim denetimi</strong>,
                  <strong>GLP-1 sarkopeni radarı</strong> ve <strong>görsel randevu ajandası</strong>
                  tek klinik yazılımda birleşti.
                </p>

                <!-- Ekran Üzeri Doğrudan Giriş Yap / Kayıt Ol / Portal / Demo Kartları -->
                <div
                  class="mt-7 grid gap-3 sm:grid-cols-2"
                  aria-label="Hızlı giriş ve kayıt seçenekleri"
                >
                  <a
                    routerLink="/register"
                    class="group flex items-center justify-between rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-4 text-white shadow-xl shadow-violet-600/25 transition hover:from-violet-500 hover:to-indigo-500"
                  >
                    <div>
                      <span
                        class="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      >
                        {{ trialDays }} Gün Ücretsiz Deneme
                      </span>
                      <strong class="mt-1 block text-base font-extrabold"
                        >Yeni Uzman Kaydı Oluştur</strong
                      >
                      <span class="text-xs text-violet-100"
                        >Kredi kartı gerekmez · 1 dakikada kliniğinizi açın</span
                      >
                    </div>
                    <span
                      class="material-symbols-rounded !text-2xl transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                      >arrow_forward</span
                    >
                  </a>

                  <a
                    routerLink="/login"
                    class="group flex items-center justify-between rounded-2xl border-2 border-slate-200 bg-white p-4 transition hover:border-violet-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-500"
                  >
                    <div>
                      <span
                        class="inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                      >
                        Klinik Yönetim Paneli
                      </span>
                      <strong class="mt-1 block text-base font-extrabold"
                        >Diyetisyen Girişi Yap</strong
                      >
                      <span class="text-xs text-slate-500 dark:text-slate-400"
                        >Mevcut uzman hesabınızla oturum açın</span
                      >
                    </div>
                    <span
                      class="material-symbols-rounded !text-2xl text-violet-600 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                      >login</span
                    >
                  </a>

                  <button
                    type="button"
                    (click)="launchDietitianDemo()"
                    class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-start transition hover:border-violet-400 dark:border-slate-800 dark:bg-slate-900/80"
                  >
                    <div class="flex items-center gap-3">
                      <span
                        class="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"
                      >
                        <span class="material-symbols-rounded !text-xl" aria-hidden="true"
                          >science</span
                        >
                      </span>
                      <div>
                        <strong class="block text-xs font-extrabold"
                          >Canlı Diyetisyen Demosunu İncele</strong
                        >
                        <span class="text-[11px] text-slate-500"
                          >Kayıt olmadan örnek danışan ve menülerle test edin</span
                        >
                      </div>
                    </div>
                    <span class="material-symbols-rounded !text-lg text-slate-400" aria-hidden="true"
                      >open_in_new</span
                    >
                  </button>

                  <div class="flex gap-2">
                    <a
                      routerLink="/portal/login"
                      class="flex flex-1 items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 transition hover:border-emerald-400 dark:border-emerald-900/50 dark:bg-emerald-950/30"
                    >
                      <div class="flex items-center gap-2.5">
                        <span
                          class="grid size-9 place-items-center rounded-xl bg-emerald-500 text-white"
                        >
                          <span class="material-symbols-rounded !text-lg" aria-hidden="true"
                            >favorite</span
                          >
                        </span>
                        <div>
                          <strong class="block text-xs font-extrabold text-emerald-950 dark:text-white"
                            >Danışan Portalı Girişi</strong
                          >
                          <span class="text-[11px] text-emerald-700 dark:text-emerald-300"
                            >Menü & ölçüm ekranı</span
                          >
                        </div>
                      </div>
                    </a>
                    <button
                      type="button"
                      (click)="launchMemberDemo()"
                      class="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-slate-900 dark:text-emerald-300"
                      title="Örnek danışan olarak portalı aç"
                    >
                      Demo Portal
                    </button>
                  </div>
                </div>

                <!-- Güven Rozetleri -->
                <div class="mt-7 grid grid-cols-3 gap-3 border-t border-slate-200/80 pt-6 dark:border-slate-800">
                  <div>
                    <strong class="tabular block text-2xl font-extrabold text-violet-600"
                      >4 Formül</strong
                    >
                    <span class="text-xs text-slate-500"
                      >Mifflin, Harris, Katch-McArdle & Cunningham</span
                    >
                  </div>
                  <div>
                    <strong class="tabular block text-2xl font-extrabold text-emerald-600"
                      >BeBis & Atwater</strong
                    >
                    <span class="text-xs text-slate-500"
                      >Otomatik kalori, lif, g/kg ve değişim hesabı</span
                    >
                  </div>
                  <div>
                    <strong class="tabular block text-2xl font-extrabold text-sky-600"
                      >%100 KVKK</strong
                    >
                    <span class="text-xs text-slate-500"
                      >Açık rıza onayı & izole klinik çalışma alanı</span
                    >
                  </div>
                </div>
              </div>

              <!-- Sağ: Etkileşimli Canlı Klinik Kokpit Vitrini -->
              <div
                id="vitrin"
                class="rounded-3xl border border-slate-200/90 bg-[#0c0820] p-5 text-white shadow-2xl shadow-violet-950/30 dark:border-slate-800"
              >
                <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3.5">
                  <div class="flex items-center gap-2">
                    <span class="size-2.5 rounded-full bg-rose-400"></span>
                    <span class="size-2.5 rounded-full bg-amber-400"></span>
                    <span class="size-2.5 rounded-full bg-emerald-400"></span>
                    <span class="ms-2 text-xs font-bold text-slate-300"
                      >OdivonDiet Klinik Kokpit Önizlemesi</span
                    >
                  </div>
                  <div class="flex flex-wrap gap-1" role="tablist" aria-label="Kokpit önizleme sekmeleri">
                    <button
                      type="button"
                      role="tab"
                      [attr.aria-selected]="showcaseTab() === 'studio'"
                      class="rounded-lg px-2.5 py-1 text-[11px] font-bold transition"
                      [class]="
                        showcaseTab() === 'studio'
                          ? 'bg-violet-600 text-white'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      "
                      (click)="showcaseTab.set('studio')"
                    >
                      Menü & Kalori
                    </button>
                    <button
                      type="button"
                      role="tab"
                      [attr.aria-selected]="showcaseTab() === 'biomarker'"
                      class="rounded-lg px-2.5 py-1 text-[11px] font-bold transition"
                      [class]="
                        showcaseTab() === 'biomarker'
                          ? 'bg-violet-600 text-white'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      "
                      (click)="showcaseTab.set('biomarker')"
                    >
                      HOMA-IR & İlaç-Besin
                    </button>
                    <button
                      type="button"
                      role="tab"
                      [attr.aria-selected]="showcaseTab() === 'glp1'"
                      class="rounded-lg px-2.5 py-1 text-[11px] font-bold transition"
                      [class]="
                        showcaseTab() === 'glp1'
                          ? 'bg-violet-600 text-white'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      "
                      (click)="showcaseTab.set('glp1')"
                    >
                      GLP-1 & BIA
                    </button>
                    <button
                      type="button"
                      role="tab"
                      [attr.aria-selected]="showcaseTab() === 'calendar'"
                      class="rounded-lg px-2.5 py-1 text-[11px] font-bold transition"
                      [class]="
                        showcaseTab() === 'calendar'
                          ? 'bg-violet-600 text-white'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      "
                      (click)="showcaseTab.set('calendar')"
                    >
                      Görsel Takvim
                    </button>
                  </div>
                </div>

                @if (showcaseTab() === 'studio') {
                  <div class="mt-4 space-y-3">
                    <div class="flex items-center justify-between rounded-2xl bg-white/[.06] p-3.5">
                      <div>
                        <span class="text-[11px] font-semibold text-violet-300"
                          >Danışan: Elif Kaya · İnsülin Direnci Faz 2</span
                        >
                        <strong class="block text-sm"
                          >Mifflin BMR: 1468 kcal · TDEE: 2019 kcal → Hedef: 1650 kcal</strong
                        >
                      </div>
                      <span
                        class="rounded-full bg-emerald-400/20 px-2.5 py-1 text-xs font-bold text-emerald-300"
                        >%100 Uyumlu</span
                      >
                    </div>

                    <div class="grid grid-cols-4 gap-2 text-center text-xs">
                      <div class="rounded-xl bg-white/[.05] p-2.5">
                        <span class="text-[10px] text-slate-400">Menü Enerji</span>
                        <strong class="tabular block text-base text-white">1642 kcal</strong>
                      </div>
                      <div class="rounded-xl bg-white/[.05] p-2.5">
                        <span class="text-[10px] text-slate-400">Protein</span>
                        <strong class="tabular block text-base text-violet-300"
                          >118g (1,6 g/kg)</strong
                        >
                      </div>
                      <div class="rounded-xl bg-white/[.05] p-2.5">
                        <span class="text-[10px] text-slate-400">Diyet Lifi</span>
                        <strong class="tabular block text-base text-emerald-300">34,2 g</strong>
                      </div>
                      <div class="rounded-xl bg-white/[.05] p-2.5">
                        <span class="text-[10px] text-slate-400">Sirkadiyen Açlık</span>
                        <strong class="tabular block text-base text-sky-300">13,5 saat</strong>
                      </div>
                    </div>

                    <div class="space-y-2 rounded-2xl border border-white/10 bg-white/[.04] p-3.5 text-xs">
                      <div class="flex items-center justify-between font-bold text-violet-200">
                        <span>08:00 · Kahvaltı (Düşük Gİ)</span>
                        <span class="tabular">412 kcal · P: 26g · Lif: 8.4g</span>
                      </div>
                      <ul class="space-y-1 text-slate-300">
                        <li class="flex justify-between">
                          <span>• 2 adet haşlanmış organik yumurta (Et değişimi)</span>
                          <span class="tabular text-slate-400">144 kcal</span>
                        </li>
                        <li class="flex justify-between">
                          <span>• 1 dilim Ezine peyniri (veya 2 YK lor peyniri)</span>
                          <span class="tabular text-slate-400">93 kcal</span>
                        </li>
                        <li class="flex justify-between">
                          <span>• 2 dilim ekşi mayalı karabuğday ekmeği</span>
                          <span class="tabular text-slate-400">130 kcal</span>
                        </li>
                        <li class="flex justify-between">
                          <span>• Yarım avokado + yeşillik (Yağ & Sebze değişimi)</span>
                          <span class="tabular text-slate-400">45 kcal</span>
                        </li>
                      </ul>
                    </div>

                    <div
                      class="flex items-center justify-between rounded-xl bg-violet-600/20 px-3.5 py-2.5 text-xs text-violet-200"
                    >
                      <span
                        >🛒 <strong>7 Günlük Otomatik Alışveriş Listesi</strong> tek tıkla gramajlı
                        hazır.</span
                      >
                      <button
                        type="button"
                        class="font-bold text-white underline"
                        (click)="launchDietitianDemo()"
                      >
                        Stüdyoyu Canlı Dene →
                      </button>
                    </div>
                  </div>
                }

                @if (showcaseTab() === 'biomarker') {
                  <div class="mt-4 space-y-3 text-xs">
                    <div class="grid grid-cols-2 gap-2.5">
                      <div class="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3">
                        <span class="text-[10px] font-bold uppercase text-rose-300"
                          >HOMA-IR İnsülin Direnci</span
                        >
                        <strong class="tabular mt-0.5 block text-2xl font-extrabold text-white"
                          >2,86</strong
                        >
                        <span class="text-[11px] text-rose-200"
                          >Glukoz: 98 mg/dL · İnsülin: 11,8 µIU/mL</span
                        >
                      </div>
                      <div class="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
                        <span class="text-[10px] font-bold uppercase text-amber-300"
                          >TG / HDL Aterojenik Oran</span
                        >
                        <strong class="tabular mt-0.5 block text-2xl font-extrabold text-white"
                          >2,65</strong
                        >
                        <span class="text-[11px] text-amber-200"
                          >TG: 138 mg/dL · HDL: 52 mg/dL</span
                        >
                      </div>
                    </div>

                    <div class="rounded-2xl border border-amber-400/30 bg-white/[.05] p-3.5">
                      <strong class="flex items-center gap-1.5 text-amber-300">
                        <span class="material-symbols-rounded !text-base">warning</span>
                        İlaç × Besin × Tahlil Çapraz Uyarısı Yakalandı:
                      </strong>
                      <p class="mt-1 leading-5 text-slate-300">
                        1. <b>Euthyrox 50 mcg (Levotiroksin):</b> Kahvaltıdaki peynir/ceviz ile
                        kalsiyum şelasyonu riski! İlacı kahvaltıdan 45 dk önce aç karnına ayırın.
                      </p>
                      <p class="mt-1 leading-5 text-slate-300">
                        2. <b>Glifor 1000 mg (Metformin) + B12 (310 pg/mL):</b> İleal B12 emilim
                        baskılanması tespit edildi → Dil altı 1000 mcg Metilkobalamin eklendi.
                      </p>
                    </div>
                  </div>
                }

                @if (showcaseTab() === 'glp1') {
                  <div class="mt-4 space-y-3 text-xs">
                    <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3.5">
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-emerald-300"
                          >GLP-1 (Ozempic 1.0 mg) & Sarkopeni Radarı</span
                        >
                        <span class="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold"
                          >Kas Korunuyor</span
                        >
                      </div>
                      <p class="mt-1.5 text-slate-200">
                        Toplam Kayıp: <b>−7,4 kg</b> · İskelet Kası (SMM) Kaybı: <b>%9</b> (Güvenli
                        sınır &lt;%20). Günlük 118 g protein ve 3 gün direnç antrenmanı aktif.
                      </p>
                    </div>

                    <div class="grid grid-cols-3 gap-2 text-center">
                      <div class="rounded-xl bg-white/[.06] p-2.5">
                        <span class="text-[10px] text-slate-400">İskelet Kası (SMM)</span>
                        <strong class="tabular block text-base text-white">29,4 kg</strong>
                      </div>
                      <div class="rounded-xl bg-white/[.06] p-2.5">
                        <span class="text-[10px] text-slate-400">ECW/TBW (Ödem)</span>
                        <strong class="tabular block text-base text-emerald-300">0,378</strong>
                      </div>
                      <div class="rounded-xl bg-white/[.06] p-2.5">
                        <span class="text-[10px] text-slate-400">Faz Açısı</span>
                        <strong class="tabular block text-base text-violet-300">6,2°</strong>
                      </div>
                    </div>
                  </div>
                }

                @if (showcaseTab() === 'calendar') {
                  <div class="mt-4 space-y-2.5 text-xs">
                    <p class="text-slate-300">
                      <strong>08:00–20:00 Görsel Randevu Takvimi:</strong> Boş slota tıklayarak yüz
                      yüze muayenehane veya online video görüşmesi planlayın.
                    </p>
                    <div class="grid grid-cols-3 gap-2">
                      <div class="rounded-xl border border-violet-400/30 bg-violet-500/15 p-2.5">
                        <span class="font-bold text-violet-200">09:30 · Yüz Yüze</span>
                        <strong class="mt-0.5 block text-white">Elif Kaya</strong>
                        <span class="text-[10px] text-slate-300">InBody BIA + Faz 2 Kontrol</span>
                      </div>
                      <div class="rounded-xl border border-sky-400/30 bg-sky-500/15 p-2.5">
                        <span class="font-bold text-sky-200">11:00 · Online Video</span>
                        <strong class="mt-0.5 block text-white">Mert Yılmaz</strong>
                        <span class="text-[10px] text-slate-300">Yarı Maraton Karbonhidrat Yükleme</span>
                      </div>
                      <div class="rounded-xl border border-emerald-400/30 bg-emerald-500/15 p-2.5">
                        <span class="font-bold text-emerald-200">15:30 · İlk Muayene</span>
                        <strong class="mt-0.5 block text-white">Zeynep Şahin</strong>
                        <span class="text-[10px] text-slate-300">Eliminasyon & FODMAP Anamnezi</span>
                      </div>
                    </div>
                  </div>
                }
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
                      Ücretsiz Hesap Aç & Planla →
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
                      <td class="odv-td text-center text-slate-500">Ek Ücretli / Kısıtlı</td>
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

        <!-- PAKETLER & ŞEFFAF FİYATLANDIRMA -->
        <section id="paketler" class="py-16 lg:py-24">
          <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-start">
              <div>
                <span class="odv-eyebrow">Şeffaf & Esnek Abonelik</span>
                <h2 class="mt-1 text-2xl font-extrabold tracking-tight sm:text-4xl">
                  Muayenehanenizin büyüklüğüne göre ölçeklenen paketler
                </h2>
                <p class="mt-1 text-sm text-slate-500">
                  İlk {{ trialDays }} gün boyunca Profesyonel paketin tüm klinik özelliklerini ücretsiz
                  deneyin.
                </p>
              </div>

              <div
                class="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs font-bold dark:border-slate-800 dark:bg-slate-900"
                role="radiogroup"
                aria-label="Fiyatlandırma dönemi"
              >
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="cycle() === 'monthly'"
                  class="rounded-lg px-3.5 py-2 transition"
                  [class]="
                    cycle() === 'monthly'
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  "
                  (click)="cycle.set('monthly')"
                >
                  Aylık
                </button>
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="cycle() === 'yearly'"
                  class="rounded-lg px-3.5 py-2 transition"
                  [class]="
                    cycle() === 'yearly'
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  "
                  (click)="cycle.set('yearly')"
                >
                  Yıllık <span class="ms-1 text-[10px] opacity-90">(2 Ay Bedava)</span>
                </button>
              </div>
            </div>

            <div class="mt-10 grid gap-6 lg:grid-cols-3">
              @for (plan of plans; track plan.id) {
                <article
                  class="odv-card relative flex flex-col p-6"
                  [class.ring-2]="plan.highlight"
                  [class.ring-violet-600]="plan.highlight"
                >
                  @if (plan.highlight) {
                    <span
                      class="absolute -top-3 start-6 rounded-full bg-violet-600 px-3 py-1 text-[11px] font-bold text-white shadow"
                    >
                      En Çok Tercih Edilen
                    </span>
                  }
                  <h3 class="text-lg font-extrabold">{{ plan.name }}</h3>
                  <p class="mt-1 text-xs text-slate-500">{{ plan.tagline }}</p>
                  <div class="mt-4 flex items-baseline gap-1">
                    <strong class="tabular text-3xl font-extrabold">{{ price(plan) }}</strong>
                    <span class="text-xs text-slate-500">/ ay</span>
                  </div>
                  <p class="mt-1 text-[11px] text-slate-400">
                    {{
                      cycle() === 'yearly'
                        ? 'Yıllık ' + yearly(plan) + ' olarak faturalanır'
                        : 'KDV dahil, taahhütsüz aylık abonelik'
                    }}
                  </p>
                  <ul class="mt-5 flex-1 space-y-2.5 text-xs">
                    @for (feat of plan.features; track feat) {
                      <li class="flex items-start gap-2">
                        <span
                          class="material-symbols-rounded !text-base text-emerald-500"
                          aria-hidden="true"
                          >check_circle</span
                        >
                        <span>{{ feat }}</span>
                      </li>
                    }
                  </ul>
                  <a
                    routerLink="/register"
                    class="mt-6 w-full justify-center"
                    [class]="plan.highlight ? 'odv-btn-primary' : 'odv-btn-secondary'"
                  >
                    {{ trialDays }} Gün Ücretsiz Başla
                  </a>
                </article>
              }
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

  readonly modules = MANAGEMENT_MODULES;
  readonly plans = PLANS;
  readonly trialDays = TRIAL_DAYS;
  readonly cycle = signal<BillingCycle>('yearly');
  readonly showcaseTab = signal<ShowcaseTab>('studio');

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

  price(plan: Plan): string {
    return formatTry(this.cycle() === 'yearly' ? plan.yearlyMonthlyPrice : plan.monthlyPrice);
  }

  yearly(plan: Plan): string {
    return formatTry(yearlyTotal(plan));
  }

  async launchDietitianDemo(): Promise<void> {
    this.auth.continueDemo();
    await this.router.navigateByUrl('/overview');
  }

  async launchMemberDemo(): Promise<void> {
    await this.auth.continueMemberDemo();
    await this.router.navigateByUrl('/portal');
  }
}

