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
