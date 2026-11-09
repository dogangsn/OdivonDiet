# OdivonDiet

Odivon'un klinik beslenme, diyetisyen ve danışan yönetimi SaaS platformudur. Angular 22, Signals, Tailwind CSS 4, Odivon UI Design System ve yapay zekâ destekli **AI NutriPilot** klinik karar destek motoru ile geliştirilir.

## Temel Yetkinlikler

- **Danışan Portföyü & Anamnez**: Danışan sağlık öyküsü, alerjenler, klinik tanılar ve biyometrik veriler.
- **Kişiselleştirilmiş Beslenme Planları**: BMR/TDEE bazlı enerji, makro/mikro dağılımı ve esnek öğün değişim listeleri.
- **Vücut Kompozisyonu & Biyobelirteçler**: Kilo, yağ/kas analizi, antropometrik ölçümler ve kan tahlili takibi.
- **Takip Görüşmeleri & Danışan İletişimi**: Seans notları, haftalık uyum puanlaması ve motivasyon protokolleri.
- **AI NutriPilot (Yapay Zekâ Klinik Karar Desteği)**:
  - Otomatik klinik menü ve beslenme reçetesi üretimi (Glutensiz, Laktozsuz, Düşük FODMAP, İnsülin Direnci vb.).
  - Laboratuvar biyobelirteç analizi ve besin-ilaç/besin-besin etkileşim uyarıları.
  - Akıllı kaçamak telafi simülatörü (48 saatlik toparlanma protokolü).
  - Görüşme notlarından otomatik SOAP klinik kaydı ve WhatsApp/SMS motivasyon mesajı derleyicisi.
- **8 Dil & Tam RTL Desteği**: Türkçe, İngilizce, Almanca, Fransızca, İspanyolca, İtalyanca, Hollandaca ve tam uyumlu Arapça (RTL).
- **Erişilebilirlik (A11y)**: WCAG AA standartlarına ve Axe-core sıfır kritik bulgu kuralına tam uyumluluk.

## Yerel Geliştirme

```bash
npm install
npm start
```

MainAPI adresi ve Firebase web istemci ayarları `src/environments/environment.ts` içinde yerel/deployment ortamına göre sağlanır. Bu repoya service-account veya production credential eklenmez.

## Doğrulama ve Testler

```bash
npm run typecheck
npm test -- --watch=false
npm run build
```

İş verisi yalnız `/api/v1/diet` MainAPI alanından alınır. Firebase yalnız Auth ve App Check için kullanılır.

## Lisans

Bu projeye açık kaynak lisansı verilmemiştir. Tüm hakları saklıdır.
