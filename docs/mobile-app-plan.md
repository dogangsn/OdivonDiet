# OdivonDiet Mobil — Danışman & Yönetici Uygulaması Planı

> Durum: taslak plan (14 Kasım 2026). Henüz kod yazılmadı.

## 1. Özet

Diyetisyenler (danışman) ve klinik yöneticileri için **React Native (Expo)** ile iOS + Android uygulaması.
Mobil uygulama web panelin birebir kopyası değil; sahada/telefonda en sık yapılan işlere odaklanır:
günün randevuları, danışan kartı, hızlı ölçüm girişi, mesajlaşma, talepler/görevler ve yönetici için klinik özeti.
Ağır masa başı işler (menü mühendisliği, klinik lab stüdyosu, raporlar, abonelik ödemesi) ilk sürümde webde kalır.

**En kritik ön koşul:** Bugün tüm iş verisi tarayıcının `localStorage`'ında (`odivon:ws:<email>:diet|portal`).
Telefon bu veriyi göremez. Mobil uygulama ancak **gerçek bir backend (MainAPI)** ile web ve mobilin aynı veriyi
paylaşmasıyla anlamlı olur. Bu yüzden plan "önce API, sonra mobil" sırasıyla ilerler.

## 2. Varsayımlar ve teknoloji seçimi

"React projesi" ifadesini **React Native + Expo** olarak yorumladık (mağazadan indirilen gerçek uygulama).

| Seçenek | Artı | Eksi |
|---|---|---|
| **React Native (Expo)** — önerilen | Gerçek native uygulama, App Store/Play yayını, güvenilir push bildirim, kamera/galeri, biyometrik giriş, EAS ile OTA güncelleme | Ayrı kod tabanı; mağaza inceleme süreci |
| PWA (mevcut Angular'ın mobil uyumlu hali) | En hızlı; yeni kod tabanı yok; anında yayın | iOS'ta push sınırlı (ana ekrana ekleme şart), mağazada görünmez, "React" değil |
| React web (Next.js vb.) | React ekosistemi | Mobil için PWA ile aynı sınırlar + web paneli ikinci kez yazmak demek |

Önerilen yığın:
- **Expo SDK (güncel) + TypeScript (strict)**, **Expo Router** (dosya tabanlı navigasyon, sekmeler + stack)
- **TanStack Query** (sunucu verisi, önbellek, offline-first kuyruk) + **Zustand** (küçük istemci durumu: oturum, tema)
- **NativeWind** (Tailwind sınıfları RN'de; web'deki Tailwind 4 token'larıyla aynı isimler)
- **react-hook-form + zod** (formlar; zod şemaları API sözleşmesiyle paylaşılır)
- **Firebase Auth** (`@react-native-firebase/auth`) + App Check — web ile aynı kimlik, aynı custom claim'ler
- **expo-notifications** (push), **expo-image-picker / expo-document-picker** (ek dosya), **expo-local-authentication** (Face ID / parmak izi), **expo-secure-store** (token)
- **victory-native** veya **react-native-gifted-charts** (kilo/ölçüm trend grafikleri)
- Hata izleme: Sentry; dağıtım: **EAS Build + EAS Submit + EAS Update**

## 3. Roller

Web'deki RBAC (`src/app/domain/staff-rbac.ts`) aynen korunur; mobil yalnızca personel rollerini hedefler.

| Rol (web) | Mobilde | Not |
|---|---|---|
| `owner` — Klinik Yöneticisi / Baş Diyetisyen | **Yönetici** modu + tüm danışman ekranları | Ekip, klinik KPI'ları, abonelik durumu (salt okunur) |
| `dietitian` — Uzman Diyetisyen | **Danışman** modu | Ana kullanıcı |
| `assistant` — Asistan | Danışman modu, kısıtlı | Ölçüm girişi, randevu, görev |
| `reception` — Ön büro | Danışman modu, kısıtlı | Danışan kabulü, randevu, mesaj, talep |
| `member` — Danışan | **Kapsam dışı** | Danışan uygulaması ayrı bir sonraki proje olabilir (aynı altyapıyla) |

Sekme ve aksiyon görünürlüğü, web'deki `allowedPaths` / `allowedQuickActions` listelerinden türetilir;
asıl yetki kontrolü backend'de token claim'leriyle yapılır.

## 4. Ekranlar (web özelliklerinden eşleme)

Alt sekme çubuğu: **Bugün · Danışanlar · Mesajlar · Görevler · Daha fazla** (+ ortada hızlı ekle "+" butonu, `redesign/mobile.png`'deki gibi).

### Danışman (MVP)
| Mobil ekran | Web karşılığı | İçerik |
|---|---|---|
| Bugün | `/overview` | Selamlama, bugünkü görüşmeler (sıradaki vurgulu), KPI kartları (aktif danışan, bugünkü görüşme, ort. hedef ilerlemesi), ilgilenilmesi gereken danışanlar |
| Danışanlar | `/clients` | Arama, durum filtresi (aktif/beklemede/arşiv), liste; yeni danışan formu |
| Danışan detayı | `client-detail` | Özet (kilo, hedef %, BKİ), ölçüm trend grafiği, aktif plan özeti, görüşme geçmişi, notlar, portal erişim durumu; hızlı aksiyonlar |
| Ölçüm ekle | `measurement-form` | Kilo, bel/kalça, yağ %, InBody alanları; büyük sayısal klavye, son değerle karşılaştırma |
| Görüşmeler / takvim | `/consultations` | Gün/hafta görünümü, görüşme planla, durum güncelle (yapıldı/iptal), görüşme notu |
| Mesajlar | `/messages` + `chat-thread` | Danışan konuşmaları, okunmamış rozetleri, foto/dosya eki, okundu bilgisi |
| Talepler | `/requests` | Randevu/plan değişikliği/soru talepleri; durum değiştir, yanıtla |
| Görevler | `/tasks` | Danışana görev ata, tamamlananları gör |
| Plan görüntüle | `/plans` | Danışanın aktif planı (öğünler, kcal, makro çubuğu) — **salt okunur** |
| Profil & ayarlar | `/settings` | Profil, tema (açık/koyu), bildirim tercihleri, biyometrik kilit, çıkış |

### Yönetici (owner) ek ekranları
| Mobil ekran | Web karşılığı | İçerik |
|---|---|---|
| Klinik özeti | `/overview` + `/reports` | Toplam/aktif danışan, haftalık görüşme sayısı, diyetisyen bazında yük, yeni danışan trendi |
| Ekip | `/settings` (personel) | Personel listesi, rol değiştir, davet et, pasifleştir |
| Aktivite | `/activity` | Klinikteki son işlemler akışı |
| Abonelik | `/billing` | Paket, deneme/yenileme tarihi — **salt okunur**; ödeme webde (bkz. §8) |

### Sonraki fazlar (ilk sürümde webde kalır)
Plan oluşturma/düzenleme (menü mühendisliği), besin kütüphanesi düzenleme, klinik lab stüdyosu, PDF raporlar, AI NutriPilot.

## 5. Mimari

```
┌─────────────┐   ┌──────────────┐
│ Angular web │   │ Expo mobil   │
└──────┬──────┘   └──────┬───────┘
       │  Firebase ID token (role, staffRole, clinicId)
       └────────┬────────┘
          ┌─────▼──────┐        ┌───────────────┐
          │  MainAPI   │───────▶│ Veritabanı    │
          │ /api/v1/…  │        │ + dosya depo  │
          └─────┬──────┘        └───────────────┘
                │ push gönderimi (Expo Push / FCM / APNs)
```

**Repo yapısı (öneri):** Aynı repoda monorepo — `apps/web` (mevcut Angular), `apps/mobile` (Expo),
`packages/domain` (paylaşılan TS: `diet.models.ts`, `portal.models.ts`, `diet-calc.ts`, `staff-rbac.ts`, `billing.ts`, API sözleşmeleri + zod şemaları).
Bu dosyalar zaten framework bağımsız saf TypeScript olduğundan doğrudan paylaşılabilir; BKİ/kalori hesapları iki uygulamada aynı sonucu verir.
İlk adımda taşımak riskliyse `apps/mobile` ayrı klasör olarak başlar, `packages/domain` sonra çıkarılır.

**Mobil katmanlar:**
- `app/` — Expo Router ekranları (`(auth)`, `(tabs)`, `client/[id]`, `admin/…`)
- `api/` — fetch istemcisi (Firebase token + `X-Client-Version` / `X-Build-ID` başlıkları, web'deki `client-contract.ts` ile aynı; 426 → "güncelleme gerekli" ekranı)
- `features/*` — ekran başına hook'lar (`useClients`, `useClient(id)`, `useAddMeasurement`…)
- `ui/` — tasarım sistemi bileşenleri (KpiCard, Avatar, MacroBar, ProgressBar, TrendChart, EmptyState, Toast, ConfirmSheet)

**Offline:** TanStack Query önbelleği diske kalıcı (MMKV); ölçüm girişi ve mesaj gönderimi çevrimdışıyken kuyruğa alınır, bağlantı gelince gönderilir.

## 6. Backend: ortak MainAPI

**Karar (14 Kasım 2026):** web ve mobil ortak MainAPI'yi kullanacak. Repo: `AhmetAkif07/OdivonMainApi`, canlı adres `https://mainapi.odivon.com/api/v1`.

### MainAPI'nin bugünkü durumu (incelendi)
- **NestJS 11 modüler monolit**, Cloudflare Workers üzerinde (`odivon-main-api` worker), veritabanı **Cloud Firestore**, kimlik **Firebase Auth**. Swagger `/docs`.
- Akış: `Controller → Service → Repository → Firestore`. Kiracı (tenant) kimliği istekten alınmaz; doğrulanmış kullanıcının `users/{uid}` profilinden okunur, veriler `tenants/{tenantId}/...` altına yazılır. Yetkinin asıl kaynağı Firestore'daki profil, custom claim'ler sadece önbellek.
- Ortak guard'lar hazır: `FirebaseAuthGuard`, `FirebaseAppCheckGuard`, `EmailVerifiedGuard`, `TenantGuard`, `ModuleGuard`, `@RequirePermission(...)`, `ClientVersionGuard` (web'deki `X-Client-Version` / 426 akışıyla aynı sözleşme).
- `identity` modülü: `register`, `verify-email`, `me`, `change-password`, `permission-catalog`, `users` (personel ekle/düzenle). Web'in localStorage'daki personel listesi ve kayıt akışı bunlara taşınabilir.
- `payments` modülü: paylaşılan **PayTR** sağlayıcısı + `saas-billing` (`status`, `payments`, `notices`, `subscribe`) — şu an `vet`, `gym`, `beauty` için açık.
- `platform` modülü: uygulama içi bildirimler (`notifications/platform`), destek talepleri, sürümler.
- **`diet` ürünü sadece kayıtlı**: `PRODUCT_MODULES` listesinde `diet` var, tek bir izin anahtarı (`dietRecords`) ve hoş geldin e-postası tanımlı; **ama hiçbir diet controller'ı / endpoint'i yok.** Web'in `DietApiService` ve `PORTAL_API`'de beklediği `/diet/...` uçları MainAPI'de karşılıksız.
- **Push bildirim altyapısı yok** (FCM / cihaz token kaydı bulunmuyor).

### MainAPI `diet` modülü (yazıldı, 15 Kasım 2026)
`src/modules/diet/` — tüm uçlar `FirebaseAuth + Tenant + EmailVerified + Subscription + Module('diet') + Permission` guard'larıyla korunur, veri `tenants/{tenantId}/diet*` koleksiyonlarında.

| Alan | Uçlar (`/api/v1/diet/...`) | İzin |
|---|---|---|
| Bugün ekranı | `GET dashboard` | dietClients:view |
| Yönetici özeti | `GET admin/summary` | dietReports:view |
| Danışanlar | `GET/POST clients`, `GET/PATCH/DELETE clients/:id`, `GET clients/:id/overview` | dietClients |
| Ölçümler | `GET/POST clients/:id/measurements`, `DELETE measurements/:id` | dietClinical |
| Görüşmeler | `GET consultations?from&to&clientId&dietitianId`, `POST`, `PATCH/DELETE consultations/:id` | dietSchedule |
| Planlar | `GET plans?clientId`, `GET/PATCH/DELETE plans/:id`, `POST plans` | dietClinical |
| Mesajlar | `GET conversations`, `GET/POST conversations/:clientId/messages`, `POST conversations/:clientId/read` | dietMessages |
| Görevler | `GET tasks`, `GET/POST clients/:id/tasks`, `PATCH/DELETE tasks/:id` | dietMessages |
| Talepler | `GET/POST requests`, `PATCH requests/:id` | dietMessages |
| Push / tercih | `POST devices`, `POST devices/unregister`, `GET/PUT notification-preferences` | oturum yeterli |
| Abonelik | `diet/saas-billing/*` (ortak PayTR) | owner/admin |
| Rol şablonları | `GET roles/templates` (diyetisyen, asistan, ön büro) | — |

Kurallar: `dietClinical:view` izni olmayan personel (ör. ön büro) danışanın hastalık/alerji/klinik notlarını ve görüşme notlarını görmez; ölçüm eklenince danışanın güncel kilosu güncellenir; bir danışanın tek aktif planı olur; görev ve talep güncellemeleri sohbete sistem mesajı olarak düşer.

Henüz yok: danışan (member) tarafı uçları, push gönderimi (token'lar kaydediliyor), dosya yükleme (imzalı URL), besin kütüphanesi ve klinik lab.

### Web tarafındaki taşıma
- `DietStore`, `PortalStore`, `AuthStore` (personel), `SubscriptionStore` localStorage yerine MainAPI'yi kullanır.
- Web'in kendi worker'ındaki PayTR uçları (`/api/billing/paytr/*`) MainAPI'nin paylaşılan PayTR akışına devredilir; tek ödeme ve abonelik kaynağı MainAPI olur.
- İlk girişte mevcut localStorage verisini MainAPI'ye yükleyen tek seferlik **"verileri buluta taşı"** adımı.

## 7. Kimlik doğrulama

- Firebase Auth (e-posta/şifre; ileride Google/Apple ile giriş — iOS'ta üçüncü taraf giriş varsa Apple ile giriş zorunlu).
- Kayıt/doğrulama/profil MainAPI `identity` uçlarından; kiracı ve rol bilgisi Firestore `users/{uid}` profilinden gelir (claim'ler önbellek, rol değişince token yenilenir). Danışan (`member`) hesabı mobil personel uygulamasına giriş yapamaz.
- Token `expo-secure-store`'da; uygulama açılışında opsiyonel Face ID / parmak izi kilidi (sağlık verisi olduğu için önerilir).
- E-posta doğrulama ve şifre sıfırlama Firebase üzerinden; bu yüzden canlıda boş olan `environment.firebase` yapılandırması bu projenin de ön koşulu.

## 8. Abonelik ve mağaza kuralları

Apple/Google, uygulama içinde dijital abonelik satışında kendi ödeme sistemlerini şart koşuyor.
B2B SaaS'larda yaygın çözüm: **mobilde satın alma yok**, kullanıcı web'de (PayTR) öder, mobil uygulama abonelik durumunu gösterir.
Süresi biten hesapta mobil "Aboneliğiniz sona erdi, web panelden yenileyebilirsiniz" ekranı gösterir (Apple'ın bölgesel dış bağlantı kuralları değişken olduğundan buton yerine bilgilendirme metni).

## 9. Bildirimler

Expo Push (arka planda FCM/APNs). Sunucu olay → push:
- Danışandan yeni mesaj
- Yeni talep (randevu, plan değişikliği…)
- Danışan görevi tamamladı / ölçüm girdi
- Görüşmeden 30 dk önce hatırlatma (zamanlanmış)
- Yönetici: deneme/abonelik bitiş uyarısı, yeni personel daveti kabul edildi

Bildirime dokununca ilgili ekrana derin bağlantı (`odivon://client/123`, `odivon://messages/123`).
Kullanıcı bazında kategori aç/kapa; sessiz saatler. Bildirim içeriğinde tıbbi detay yazılmaz (kilitli ekranda görünür): "Elif K. yeni bir mesaj gönderdi".

## 10. Tasarım dili

`redesign/` ve `portal/` ekran görüntüleri referans:
- Font **Plus Jakarta Sans**; açık zemin, büyük yuvarlatılmış (≈20–24 px) beyaz kartlar, ince kenarlık
- Ana vurgu mor→indigo gradyan (birincil butonlar, "+" FAB), başarı/ilerleme için zümrüt yeşili, uyarı rozetleri amber
- KPI kartları: büyük rakam + küçük büyük-harf etiket + sağ üstte pastel ikon kutusu + alt açıklama satırı
- "Sıradaki" öğe yeşil kenarlı vurgulu satır; okunmamış sayıları dolu pill rozet
- Koyu mod zorunlu (web'de var); token'lar web'den aynı isimlerle NativeWind temasına taşınır
- Erişilebilirlik: dokunma hedefi ≥ 44 pt, dinamik yazı boyutu, ekran okuyucu etiketleri (web'deki WCAG AA hedefinin mobil karşılığı)
- Dil: önce Türkçe; i18n altyapısı baştan kurulur (web'de TR/EN/AR var, RTL desteği için `start/end` mantıksal yönler)

## 11. Güvenlik ve KVKK

Sağlık verisi = özel nitelikli kişisel veri. Gerekenler: aydınlatma metni + açık rıza (web'deki `consentAt` akışı korunur),
TLS, sunucu tarafı yetki, ekler için kısa ömürlü imzalı URL'ler, cihazda önbelleğe alınan verinin çıkışta silinmesi,
ekran görüntüsü önizlemesinde içerik bulanıklaştırma (uygulama arka plana geçince), mağaza formlarında (App Privacy, Data Safety) sağlık verisi beyanı.

## 12. Fazlar

| Faz | Kapsam | Tahmini süre* |
|---|---|---|
| **0 — Karar & altyapı** | MainAPI'de diet kapsamı ve izin modeli, Firebase (MainAPI ile aynı proje), Apple Developer ($99/yıl) + Google Play ($25) hesapları, paket adı (`com.odivon.diet`) | 1 hafta |
| **1 — MainAPI diet modülü** | §6'daki `diet` modülü (Firestore koleksiyonları, uçlar, izinler, testler), saas-billing'e diet, dosya depolama; web'i MainAPI'ye bağlama + veri taşıma | 3–4 hafta |
| **2 — Mobil MVP (danışman)** | Giriş, Bugün, Danışanlar + detay, ölçüm ekle, görüşmeler, mesajlar, talepler, görevler, ayarlar, koyu mod | 4–5 hafta |
| **3 — Bildirimler & yönetici** | MainAPI'de FCM/Expo push servisi + cihaz kaydı, derin bağlantılar, yönetici özeti, ekip, aktivite, abonelik durumu | 2–3 hafta |
| **4 — Yayın** | TestFlight / Play iç test, mağaza görselleri ve metinleri, gizlilik beyanları, inceleme | 1–2 hafta |
| 5 — Sonrası | Mobilde plan düzenleme, offline genişletme, danışan (member) uygulaması | — |

\* Tek geliştirici için kaba tahmin; Faz 1 en belirsiz kalemdir.

**MVP bitti sayılır:** bir diyetisyen telefondan bugünkü görüşmelerini görür, danışan açar, ölçüm girer, mesaja yanıt verir;
webde girilen veri mobilde, mobilde girilen veri webde anında görünür; yeni mesajda push alır.

## 13. Açık kararlar

1. ~~Backend~~ → **Ortak MainAPI** (`AhmetAkif07/OdivonMainApi`, NestJS + Firestore). Açık: `diet` modülünü kim yazacak, MainAPI reposuna doğrudan commit atılabilir mi?
2. **Platform:** Expo (önerilen) mi, PWA mı?
3. **Repo:** Mobil aynı repoda monorepo olarak mı (önerilen), ayrı repoda mı?
4. Danışan (member) mobil uygulaması bu projenin parçası mı, sonraki iş mi?
5. Mağaza hesapları hangi şirket adına açılacak (yayıncı adı mağazada görünür)?
