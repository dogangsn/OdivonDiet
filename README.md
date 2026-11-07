# OdivonDiet

Odivon'un diyetisyenler için danışan takip ürünüdür: danışan profili, beslenme planı, ölçüm ve takip görüşmeleri tek akışta yönetilir. Angular 22, Signals, Tailwind CSS 4 ve Odivon UI Design System ile geliştirilir.

## Modüller

| Sayfa | İçerik |
| --- | --- |
| Genel bakış | Bugünkü görüşmeler, dikkat gerektiren danışanlar, hedef ilerlemesi |
| Danışanlar | Profil kartları (BKİ, güncel/hedef kilo, sıradaki randevu), profil çekmecesi |
| Beslenme planları | Enerji hedefi, makro dağılımı, öğün düzeni; danışan başına tek aktif plan |
| Ölçümler | Kilo / bel / yağ oranı trend grafiği ve ölçüm geçmişi |
| Görüşmeler | Randevu planlama, tamamlama, plana uyum puanı |
| Raporlar | Danışan bazında değişim, hedef ilerlemesi, uyum; yazdırılabilir |

BKİ, bazal metabolizma (Mifflin‑St Jeor) ve günlük enerji ihtiyacı `src/app/domain/diet-calc.ts` içinde hesaplanır.

## Mimari

- `src/app/domain` – tipler (`diet.models.ts`) ve saf hesaplama fonksiyonları.
- `src/app/core/data/diet-store.ts` – tüm sayfaların okuduğu tek veri deposu (Signals). Şu an bellekte demo veriyle çalışır; MainAPI bağlantısı bu sınıfın metotlarına eklenecek.
- `src/app/features/forms` – her yerden açılabilen ortak çekmeceler (`QuickActions` servisi ile).
- `src/app/shared/ui` – KPI kartı, avatar, trend grafiği, makro çubuğu gibi ortak bileşenler.

## Yerel geliştirme

```bash
npm install
npm start
```

MainAPI adresi ve Firebase web istemci ayarları `src/environments/environment.ts` içinde yerel/deployment ortamına göre sağlanır. Bu repoya service-account veya production credential eklenmez.

## Doğrulama

```bash
npm run typecheck
npm test -- --watch=false
npm run build
```

İş verisi yalnız `/api/v1/diet` MainAPI alanından alınır. Firebase yalnız Auth ve App Check için kullanılır.

## Lisans

Bu projeye açık kaynak lisansı verilmemiştir. Tüm hakları saklıdır.
