# OdivonDiet

Odivon'un F‑Gas uyumluluk ve saha operasyonu ürünüdür. Angular 22, Signals, Tailwind CSS 4 ve Odivon UI Design System ile geliştirilir.

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

## Sürüm bilgisi ve güncelleme

- Her `npm start` / `npm run build` öncesinde `scripts/write-version.mjs` çalışır; `package.json` sürümü, commit hash'i ve derleme zamanı `build-info.ts` ile `public/version.json` dosyalarına yazılır. Sürüm (`v1.0.0 · a1b2c3d`) menünün altında ve giriş sayfasında görünür.
- Yeni bir derleme yayınlandığında açık sekmeler `version.json` dosyasını 5 dakikada bir (ve sekmeye dönüldüğünde) kontrol eder ve güncelleme penceresi gösterir.
- Yeni sürüme geçişte oturum, çerezler, sessionStorage ve önbellekler temizlenir (tema/dil tercihleri korunur) ve kullanıcı `/login` sayfasına yönlendirilir.
- Büyük değişikliklerde `package.json` içindeki `version` alanını artırın (`npm version minor`).
