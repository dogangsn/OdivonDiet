import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, minLength, required, submit } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { TranslatePipe } from '../../core/i18n/i18n';
import { PRODUCT_NAVIGATION } from '../../domain/domain-navigation';
import { PRODUCT } from '../../domain/product-manifest';
import { PageHeader } from '../../shared/ui/page-header';
import { SlideOver } from '../../shared/ui/slide-over';

interface DomainFormLabels {
  readonly primaryLabel: string;
  readonly primaryPlaceholder: string;
  readonly secondaryLabel: string;
  readonly secondaryPlaceholder: string;
  readonly categoryLabel: string;
  readonly categories: readonly string[];
}

interface RecordRow {
  id: number;
  name: string;
  code: string;
  location: string;
  status: 'active' | 'pending';
  updated: string;
  archived: boolean;
}

@Component({
  selector: 'app-workspace-page',
  imports: [PageHeader, SlideOver, FormField, TranslatePipe],
  template: `
    @if (view === 'overview') {
      <div class="space-y-6">
        <app-page-header
          eyebrow="Operasyon Merkezi"
          [title]="product.name + ' Genel Bakış'"
          description="Kritik kayıtları, yaklaşan kontrolleri ve ekip performansını tek merkezden yönetin."
          ><button actions type="button" class="odv-btn-primary" (click)="openCreate()">
            <span class="material-symbols-rounded">add</span>Yeni kayıt
          </button></app-page-header
        >
        <section
          class="odv-card overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-blue-950 p-6 text-white lg:p-8"
        >
          <div class="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-center">
            <div>
              <div
                class="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300"
              >
                <span class="size-2 animate-pulse rounded-full bg-emerald-400"></span>CANLI UYUM
                RADARI
              </div>
              <h2 class="m-0 text-2xl font-black">Operasyonlar kontrol altında</h2>
              <p class="max-w-2xl text-sm leading-6 text-slate-300">
                Tüm iş akışları MainAPI ile senkronize; kritik operasyonlar anlık takip ediliyor.
              </p>
            </div>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="rounded-2xl bg-white/10 p-4">
                <strong class="block text-2xl">98%</strong
                ><span class="text-xs text-slate-300">Sistem</span>
              </div>
              <div class="rounded-2xl bg-white/10 p-4">
                <strong class="block text-2xl">76%</strong
                ><span class="text-xs text-slate-300">Tamamlanma</span>
              </div>
              <div class="rounded-2xl bg-white/10 p-4">
                <strong class="block text-2xl">42</strong
                ><span class="text-xs text-slate-300">Bugün</span>
              </div>
            </div>
          </div>
        </section>
        <section aria-label="Temel göstergeler" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          @for (metric of product.metrics; track metric.labelKey; let first = $first) {
            <article
              class="odv-card p-5"
              [class.!bg-gradient-to-br]="first"
              [class.!from-violet-600]="first"
              [class.!to-indigo-700]="first"
              [class.!text-white]="first"
            >
              <div class="mb-4 flex items-center justify-between">
                <span
                  class="text-xs font-extrabold uppercase tracking-wider"
                  [class.text-slate-500]="!first"
                  >{{ metric.labelKey | t }}</span
                ><span class="material-symbols-rounded" [class.text-violet-600]="!first"
                  >monitoring</span
                >
              </div>
              <strong class="block text-4xl font-black">{{ metric.value }}</strong
              ><span class="mt-2 block text-xs" [class.text-slate-500]="!first">{{
                metric.noteKey | t
              }}</span>
            </article>
          }
        </section>
        <section class="odv-card overflow-hidden">
          <div
            class="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-700 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h2 class="m-0 text-xl font-black">Operasyon kayıtları</h2>
              <div class="mt-3 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
                <button
                  type="button"
                  class="rounded-lg px-3 py-2 text-xs font-bold"
                  [class.bg-white]="!archived()"
                  [class.shadow-sm]="!archived()"
                  (click)="archived.set(false)"
                >
                  Aktif {{ activeCount() }}</button
                ><button
                  type="button"
                  class="rounded-lg px-3 py-2 text-xs font-bold"
                  [class.bg-white]="archived()"
                  [class.shadow-sm]="archived()"
                  (click)="archived.set(true)"
                >
                  Arşiv {{ archivedCount() }}
                </button>
              </div>
            </div>
            <label class="relative block md:w-80"
              ><span class="sr-only">Kayıtlarda ara</span
              ><span
                class="material-symbols-rounded pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
                >search</span
              ><input
                class="odv-input ps-10"
                type="search"
                placeholder="Ad, kod veya lokasyon ara…"
                [value]="search()"
                (input)="search.set($any($event.target).value)"
            /></label>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[720px]">
              <thead>
                <tr>
                  <th class="odv-th">Kayıt</th>
                  <th class="odv-th">Kod</th>
                  <th class="odv-th">Lokasyon</th>
                  <th class="odv-th">Durum</th>
                  <th class="odv-th">Güncellendi</th>
                  <th class="odv-th"><span class="sr-only">İşlem</span></th>
                </tr>
              </thead>
              <tbody>
                @for (row of filtered(); track row.id) {
                  <tr class="hover:bg-violet-50/40 dark:hover:bg-slate-800">
                    <td class="odv-td font-bold">{{ row.name }}</td>
                    <td class="odv-td font-mono text-xs text-slate-500">{{ row.code }}</td>
                    <td class="odv-td text-slate-500">{{ row.location }}</td>
                    <td class="odv-td">
                      <span
                        [class]="
                          row.status === 'active' ? 'odv-badge-success' : 'odv-badge-warning'
                        "
                        >{{ row.status === 'active' ? 'Aktif' : 'Aksiyon gerekli' }}</span
                      >
                    </td>
                    <td class="odv-td text-slate-500">{{ row.updated }}</td>
                    <td class="odv-td text-end">
                      <button
                        class="odv-icon-btn"
                        type="button"
                        aria-label="Kaydı aç"
                        (click)="openDetail(row)"
                      >
                        <span class="material-symbols-rounded directional-icon">arrow_forward</span>
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="p-12 text-center text-sm text-slate-500">
                      Bu filtrede kayıt bulunamadı.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    } @else if (view === 'domain') {
      <div class="space-y-6">
        <app-page-header
          [eyebrow]="product.name"
          [title]="domain.title"
          [description]="domain.description"
        >
          <button actions type="button" class="odv-btn-primary" (click)="openCreate()">
            <span class="material-symbols-rounded">add</span>Yeni kayıt
          </button>
        </app-page-header>
        <section class="grid gap-4 sm:grid-cols-3" aria-label="İş alanı özeti">
          <article class="odv-card p-5">
            <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500"
              >Toplam kayıt</span
            >
            <strong class="mt-3 block text-3xl font-black">{{ 24 + domainIndex }}</strong>
            <span class="mt-1 block text-xs text-slate-500">Bu iş alanındaki güncel kayıtlar</span>
          </article>
          <article class="odv-card p-5">
            <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500"
              >Aksiyon gerekli</span
            >
            <strong class="mt-3 block text-3xl font-black text-amber-600">{{
              2 + domainIndex
            }}</strong>
            <span class="mt-1 block text-xs text-slate-500">Son tarihi yaklaşan işlemler</span>
          </article>
          <article class="odv-card p-5">
            <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500"
              >Tamamlanma</span
            >
            <strong class="mt-3 block text-3xl font-black text-emerald-600"
              >%{{ 94 - domainIndex }}</strong
            >
            <span class="mt-1 block text-xs text-slate-500">Güncel uygunluk oranı</span>
          </article>
        </section>
        <section class="odv-card overflow-hidden">
          <div
            class="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center"
          >
            <label class="relative flex-1">
              <span class="sr-only">{{ domain.title }} kayıtlarında ara</span>
              <span
                class="material-symbols-rounded pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
                >search</span
              >
              <input
                class="odv-input ps-10"
                type="search"
                [placeholder]="domain.title + ' içinde ara…'"
                [value]="search()"
                (input)="search.set($any($event.target).value)"
              />
            </label>
            <select
              class="odv-input !w-auto"
              aria-label="Durum filtresi"
              [value]="statusFilter()"
              (change)="statusFilter.set($any($event.target).value)"
            >
              <option value="all">Tüm durumlar</option>
              <option value="active">Aktif</option>
              <option value="pending">Aksiyon gerekli</option>
            </select>
          </div>
          <div class="overflow-x-auto custom-scroll">
            <table class="w-full min-w-[720px]">
              <thead>
                <tr>
                  <th class="odv-th">{{ domain.title }}</th>
                  <th class="odv-th">Referans</th>
                  <th class="odv-th">Lokasyon</th>
                  <th class="odv-th">Durum</th>
                  <th class="odv-th">Son işlem</th>
                  <th class="odv-th"><span class="sr-only">İşlem</span></th>
                </tr>
              </thead>
              <tbody>
                @for (row of domainRows(); track row.id; let index = $index) {
                  <tr class="hover:bg-violet-50/40 dark:hover:bg-slate-800">
                    <td class="odv-td">
                      <div class="flex items-center gap-3">
                        <span
                          class="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                          ><span class="material-symbols-rounded">{{ domain.icon }}</span></span
                        ><strong>{{ row.name }}</strong>
                      </div>
                    </td>
                    <td class="odv-td font-mono text-xs text-slate-500">{{ row.code }}</td>
                    <td class="odv-td text-slate-500">{{ row.location }}</td>
                    <td class="odv-td">
                      <span
                        [class]="
                          row.status === 'active' ? 'odv-badge-success' : 'odv-badge-warning'
                        "
                        >{{ row.status === 'active' ? 'Aktif' : 'Aksiyon gerekli' }}</span
                      >
                    </td>
                    <td class="odv-td text-slate-500">{{ row.updated }}</td>
                    <td class="odv-td text-end">
                      <button type="button" class="odv-btn-soft" (click)="openDetail(row)">
                        Detayı aç
                      </button>
                    </td>
                  </tr>
                  @if (selectedModule() === index) {
                    <tr>
                      <td
                        colspan="6"
                        class="bg-violet-50/50 px-6 py-4 text-sm text-slate-600 dark:bg-violet-500/5 dark:text-slate-300"
                      >
                        <strong>{{ row.name }}</strong> kaydının görevleri, belgeleri ve denetim izi
                        MainAPI üzerinden bu alanda yönetilir.
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
          <footer
            class="border-t border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-700"
          >
            Toplam <strong>{{ domainRows().length }}</strong> kayıt gösteriliyor.
          </footer>
        </section>
      </div>
    } @else if (view === 'activity') {
      <div class="space-y-6">
        <app-page-header
          eyebrow="Denetim İzi"
          title="Aktiviteler"
          description="Ekip ve sistem tarafından gerçekleştirilen son işlemler."
        />
        <section class="odv-card p-6">
          <div class="space-y-1">
            @for (item of activities; track item.time) {
              <article
                class="grid grid-cols-[auto_1fr_auto] gap-4 border-b border-slate-100 py-5 last:border-0 dark:border-slate-700"
              >
                <span
                  class="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                  ><span class="material-symbols-rounded">{{ item.icon }}</span></span
                >
                <div>
                  <strong class="block text-sm">{{ item.title }}</strong>
                  <p class="mb-0 mt-1 text-xs text-slate-500">{{ item.detail }}</p>
                </div>
                <time class="text-xs font-semibold text-slate-400">{{ item.time }}</time>
              </article>
            }
          </div>
        </section>
      </div>
    } @else {
      <div class="space-y-6">
        <app-page-header
          eyebrow="Yapılandırma"
          title="Ayarlar"
          description="Çalışma alanı, bildirim ve entegrasyon tercihlerini yönetin."
        />
        <div class="grid gap-5 xl:grid-cols-[1fr_.8fr]">
          <section class="odv-card p-6">
            <h2 class="mt-0 text-lg font-black">Çalışma alanı</h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <label
                ><span class="mb-1.5 block text-xs font-bold">Şirket adı</span
                ><input class="odv-input" value="Odivon Demo İşletmesi" /></label
              ><label
                ><span class="mb-1.5 block text-xs font-bold">Varsayılan bölge</span
                ><select class="odv-input">
                  <option>Türkiye</option>
                  <option>Avrupa Birliği</option>
                </select></label
              ><label class="sm:col-span-2"
                ><span class="mb-1.5 block text-xs font-bold">API adresi</span
                ><input class="odv-input font-mono text-xs" [value]="apiBaseUrl" readonly
              /></label>
            </div>
            <button type="button" class="odv-btn-primary mt-5" (click)="saved.set(true)">
              <span class="material-symbols-rounded">save</span>Ayarları kaydet
            </button>
            @if (saved()) {
              <span class="ms-3 text-xs font-bold text-emerald-600">Değişiklikler kaydedildi.</span>
            }
          </section>
          <section class="odv-card p-6">
            <h2 class="mt-0 text-lg font-black">Bildirimler</h2>
            @for (option of notificationOptions; track option.label) {
              <label
                class="flex items-center justify-between border-b border-slate-100 py-4 last:border-0 dark:border-slate-700"
                ><span
                  ><strong class="block text-sm">{{ option.label }}</strong
                  ><small class="text-slate-500">{{ option.note }}</small></span
                ><input type="checkbox" class="size-5 accent-violet-600" [checked]="option.enabled"
              /></label>
            }
          </section>
        </div>
      </div>
    }
    <app-slide-over
      [open]="drawerOpen()"
      [dirty]="!selectedRecord() && draftDirty()"
      [wide]="true"
      [icon]="selectedRecord() ? domain.icon : 'add_circle'"
      [eyebrow]="selectedRecord() ? 'Kayıt Detayı' : product.name"
      [title]="drawerTitle()"
      [description]="drawerDescription()"
      [submitLabel]="selectedRecord() ? 'Düzenlemeye geç' : 'Kaydı oluştur'"
      (closed)="closeDrawer()"
      (submitted)="handleDrawerSubmit()"
    >
      @if (selectedRecord(); as record) {
        <div
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div class="bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-950 p-6 text-white">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="flex items-center gap-4">
                <span
                  class="grid size-14 place-items-center rounded-2xl bg-white/10 text-violet-200 ring-1 ring-white/15"
                  ><span class="material-symbols-rounded !text-3xl">{{ domain.icon }}</span></span
                >
                <div>
                  <span class="text-[10px] font-bold uppercase tracking-[.18em] text-violet-300">{{
                    record.code
                  }}</span>
                  <h3 class="mb-1 mt-1 text-xl font-black">{{ record.name }}</h3>
                  <p class="m-0 text-xs text-slate-300">{{ record.location }}</p>
                </div>
              </div>
              <span
                [class]="record.status === 'active' ? 'odv-badge-success' : 'odv-badge-warning'"
                >{{ record.status === 'active' ? 'Aktif ve uyumlu' : 'Aksiyon gerekli' }}</span
              >
            </div>
          </div>
          <div
            class="grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-4"
          >
            <div class="p-4">
              <span class="block text-[10px] font-bold uppercase text-slate-400">Uyum skoru</span
              ><strong class="mt-1 block text-xl text-emerald-600">%94</strong>
            </div>
            <div class="p-4">
              <span class="block text-[10px] font-bold uppercase text-slate-400">Açık görev</span
              ><strong class="mt-1 block text-xl">3</strong>
            </div>
            <div class="p-4">
              <span class="block text-[10px] font-bold uppercase text-slate-400">Belge</span
              ><strong class="mt-1 block text-xl">8</strong>
            </div>
            <div class="p-4">
              <span class="block text-[10px] font-bold uppercase text-slate-400">Son işlem</span
              ><strong class="mt-1 block text-sm">{{ record.updated }}</strong>
            </div>
          </div>
        </div>
        <section class="odv-card p-5">
          <div class="mb-4 flex items-center gap-2">
            <span class="material-symbols-rounded text-violet-600">info</span>
            <h3 class="m-0 text-sm font-black">Kayıt bilgileri</h3>
          </div>
          <dl class="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {{ formLabels.categoryLabel }}
              </dt>
              <dd class="m-0 mt-1 font-bold">{{ formLabels.categories[0] }}</dd>
            </div>
            <div>
              <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sorumlu</dt>
              <dd class="m-0 mt-1 font-bold">Ayşe Yılmaz</dd>
            </div>
            <div>
              <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {{ formLabels.primaryLabel }}
              </dt>
              <dd class="m-0 mt-1 font-bold">{{ formLabels.primaryPlaceholder }}</dd>
            </div>
            <div>
              <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {{ formLabels.secondaryLabel }}
              </dt>
              <dd class="m-0 mt-1 font-bold">{{ formLabels.secondaryPlaceholder }}</dd>
            </div>
          </dl>
        </section>
        <section class="odv-card p-5">
          <div class="mb-4 flex items-center gap-2">
            <span class="material-symbols-rounded text-violet-600">history</span>
            <h3 class="m-0 text-sm font-black">Denetim izi</h3>
          </div>
          <div class="space-y-4">
            @for (item of activities.slice(0, 3); track item.time) {
              <div class="flex gap-3">
                <span
                  class="mt-1 size-2 shrink-0 rounded-full bg-violet-500 ring-4 ring-violet-100 dark:ring-violet-950"
                ></span>
                <div>
                  <strong class="block text-xs">{{ item.title }}</strong
                  ><span class="text-[11px] text-slate-500"
                    >{{ item.detail }} · {{ item.time }}</span
                  >
                </div>
              </div>
            }
          </div>
        </section>
      } @else {
        <div
          class="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 dark:border-violet-900 dark:from-violet-950/40 dark:to-indigo-950/30"
        >
          <div class="flex gap-3">
            <span class="material-symbols-rounded text-violet-600">auto_awesome</span>
            <div>
              <strong class="block text-sm text-violet-950 dark:text-violet-100"
                >{{ domain.title }} kaydı oluşturuyorsunuz</strong
              >
              <p class="mb-0 mt-1 text-xs leading-5 text-violet-700 dark:text-violet-300">
                Zorunlu alanlar işaretlidir. Teknik bilgiler daha sonra denetim kayıtlarıyla
                ilişkilendirilebilir.
              </p>
            </div>
          </div>
        </div>
        <section class="odv-card p-5 sm:p-6">
          <div
            class="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800"
          >
            <span
              class="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950"
              ><span class="material-symbols-rounded">badge</span></span
            >
            <div>
              <h3 class="m-0 text-sm font-black">Temel bilgiler</h3>
              <p class="mb-0 mt-0.5 text-[11px] text-slate-500">
                Kaydın kimlik ve organizasyon bilgileri
              </p>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="sm:col-span-2"
              ><span class="mb-1.5 block text-xs font-bold"
                >Kayıt adı <b class="text-rose-500">*</b></span
              ><input
                class="odv-input"
                [formField]="draftForm.name"
                placeholder="Açıklayıcı bir kayıt adı girin"
                autocomplete="off"
              />
              @if (draftForm.name().touched() && draftForm.name().invalid()) {
                <span class="mt-1 block text-xs text-rose-600"
                  >En az 3 karakterlik kayıt adı zorunludur.</span
                >
              }
            </label>
            <label
              ><span class="mb-1.5 block text-xs font-bold"
                >Referans kodu <b class="text-rose-500">*</b></span
              ><input
                class="odv-input font-mono"
                [formField]="draftForm.code"
                placeholder="Örn. ODV-2026-001"
                autocomplete="off"
            /></label>
            <label
              ><span class="mb-1.5 block text-xs font-bold">{{ formLabels.categoryLabel }}</span
              ><select class="odv-input" [formField]="draftForm.category">
                @for (option of formLabels.categories; track option) {
                  <option [value]="option">{{ option }}</option>
                }
              </select></label
            >
            <label
              ><span class="mb-1.5 block text-xs font-bold"
                >Lokasyon / tesis <b class="text-rose-500">*</b></span
              ><input
                class="odv-input"
                [formField]="draftForm.location"
                placeholder="Şube, bina veya üretim tesisi"
                autocomplete="off"
            /></label>
            <label
              ><span class="mb-1.5 block text-xs font-bold">Departman</span
              ><input
                class="odv-input"
                [formField]="draftForm.department"
                placeholder="Örn. Teknik Operasyon"
                autocomplete="off"
            /></label>
          </div>
        </section>
        <section class="odv-card p-5 sm:p-6">
          <div
            class="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800"
          >
            <span
              class="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950"
              ><span class="material-symbols-rounded">tune</span></span
            >
            <div>
              <h3 class="m-0 text-sm font-black">Teknik ve mevzuat bilgileri</h3>
              <p class="mb-0 mt-0.5 text-[11px] text-slate-500">
                Ürüne özgü izlenebilirlik alanları
              </p>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label
              ><span class="mb-1.5 block text-xs font-bold"
                >{{ formLabels.primaryLabel }} <b class="text-rose-500">*</b></span
              ><input
                class="odv-input"
                [formField]="draftForm.primaryValue"
                [placeholder]="formLabels.primaryPlaceholder"
                autocomplete="off"
            /></label>
            <label
              ><span class="mb-1.5 block text-xs font-bold">{{ formLabels.secondaryLabel }}</span
              ><input
                class="odv-input"
                [formField]="draftForm.secondaryValue"
                [placeholder]="formLabels.secondaryPlaceholder"
                autocomplete="off"
            /></label>
            <label
              ><span class="mb-1.5 block text-xs font-bold">Üretici / sağlayıcı</span
              ><input
                class="odv-input"
                [formField]="draftForm.manufacturer"
                placeholder="Firma veya üretici adı"
                autocomplete="organization"
            /></label>
            <label
              ><span class="mb-1.5 block text-xs font-bold">Seri / belge numarası</span
              ><input
                class="odv-input font-mono"
                [formField]="draftForm.serialNumber"
                placeholder="Seri, sertifika veya belge no"
                autocomplete="off"
            /></label>
          </div>
        </section>
        <section class="odv-card p-5 sm:p-6">
          <div
            class="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800"
          >
            <span
              class="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950"
              ><span class="material-symbols-rounded">event</span></span
            >
            <div>
              <h3 class="m-0 text-sm font-black">Sorumluluk ve planlama</h3>
              <p class="mb-0 mt-0.5 text-[11px] text-slate-500">
                Görev, öncelik ve son tarih bilgileri
              </p>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label
              ><span class="mb-1.5 block text-xs font-bold">Sorumlu kişi</span
              ><input
                class="odv-input"
                [formField]="draftForm.owner"
                placeholder="Ad soyad veya ekip"
                autocomplete="off"
            /></label>
            <label
              ><span class="mb-1.5 block text-xs font-bold"
                >Son tarih <b class="text-rose-500">*</b></span
              ><input class="odv-input" type="date" [formField]="draftForm.dueDate"
            /></label>
            <label
              ><span class="mb-1.5 block text-xs font-bold">Öncelik</span
              ><select class="odv-input" [formField]="draftForm.priority">
                <option value="normal">Normal</option>
                <option value="high">Yüksek</option>
                <option value="critical">Kritik</option>
              </select></label
            >
            <label
              ><span class="mb-1.5 block text-xs font-bold">Başlangıç durumu</span
              ><select class="odv-input" [formField]="draftForm.status">
                <option value="draft">Taslak</option>
                <option value="active">Aktif</option>
                <option value="pending">İnceleme bekliyor</option>
              </select></label
            >
          </div>
        </section>
        <section class="odv-card p-5 sm:p-6">
          <div class="mb-4 flex items-center gap-3">
            <span
              class="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950"
              ><span class="material-symbols-rounded">attachment</span></span
            >
            <div>
              <h3 class="m-0 text-sm font-black">Kanıt ve açıklamalar</h3>
              <p class="mb-0 mt-0.5 text-[11px] text-slate-500">
                Denetim izi için referans ve ek bilgiler
              </p>
            </div>
          </div>
          <label
            ><span class="mb-1.5 block text-xs font-bold">Harici referans</span
            ><input
              class="odv-input"
              [formField]="draftForm.reference"
              placeholder="İş emri, mevzuat veya dosya referansı"
              autocomplete="off"
          /></label>
          <label class="mt-4 block"
            ><span class="mb-1.5 block text-xs font-bold">Açıklama ve notlar</span
            ><textarea
              class="odv-input min-h-28 resize-y"
              [formField]="draftForm.notes"
              placeholder="Kayıtla ilgili ayrıntıları, istisnaları ve takip notlarını yazın"
            ></textarea>
          </label>
          <div
            class="mt-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/40"
          >
            <span class="material-symbols-rounded text-3xl text-slate-400">cloud_upload</span
            ><strong class="mt-2 block text-xs">Belge, fotoğraf veya sertifika ekleyin</strong
            ><span class="mt-1 block text-[11px] text-slate-400"
              >PDF, PNG veya JPG · en fazla 10 MB</span
            >
            <input
              #evidenceInput
              type="file"
              class="sr-only"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              (change)="onFilesSelected($event)"
            />
            <button type="button" class="odv-btn-soft mt-3" (click)="evidenceInput.click()">
              Dosya seç
            </button>
            @if (evidenceFiles().length) {
              <div class="mt-4 flex flex-wrap justify-center gap-2">
                @for (file of evidenceFiles(); track file) {
                  <span
                    class="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300"
                    ><span class="material-symbols-rounded !text-base text-emerald-500"
                      >check_circle</span
                    >{{ file }}</span
                  >
                }
              </div>
            }
          </div>
        </section>
      }
    </app-slide-over>
  `,
})
export class WorkspacePage {
  private readonly route = inject(ActivatedRoute);
  readonly product = PRODUCT;
  readonly view = this.route.snapshot.data['view'] as
    'overview' | 'domain' | 'activity' | 'settings';
  readonly section = this.route.snapshot.data['section'] as string;
  readonly domain =
    PRODUCT_NAVIGATION.find((item) => item.key === this.section) ?? PRODUCT_NAVIGATION[0];
  readonly domainIndex = Math.max(
    0,
    PRODUCT_NAVIGATION.findIndex((item) => item.key === this.section),
  );
  readonly apiBaseUrl = environment.apiBaseUrl;
  readonly search = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'pending'>('all');
  readonly archived = signal(false);
  readonly drawerOpen = signal(false);
  readonly selectedModule = signal(-1);
  readonly saved = signal(false);
  readonly selectedRecord = signal<RecordRow | null>(null);
  readonly evidenceFiles = signal<string[]>([]);
  readonly formLabels = this.resolveFormLabels();
  readonly draftModel = signal({
    name: '',
    code: '',
    category: this.formLabels.categories[0],
    location: '',
    department: '',
    primaryValue: '',
    secondaryValue: '',
    manufacturer: '',
    serialNumber: '',
    owner: '',
    dueDate: '',
    priority: 'normal',
    status: 'draft',
    reference: '',
    notes: '',
  });
  readonly draftForm = form(this.draftModel, (p) => {
    required(p.name);
    minLength(p.name, 3);
    required(p.code);
    required(p.location);
    required(p.primaryValue);
    required(p.dueDate);
  });
  readonly drawerTitle = computed(
    () => this.selectedRecord()?.name ?? `Yeni ${this.domain.title} Kaydı`,
  );
  readonly drawerDescription = computed(() =>
    this.selectedRecord()
      ? 'Teknik bilgiler, görevler, belgeler ve denetim geçmişi.'
      : this.domain.description,
  );
  readonly draftDirty = computed(() => {
    const value = this.draftModel();
    return Boolean(
      value.name ||
      value.location ||
      value.department ||
      value.primaryValue ||
      value.secondaryValue ||
      value.manufacturer ||
      value.serialNumber ||
      value.owner ||
      value.dueDate ||
      value.reference ||
      value.notes,
    );
  });
  readonly rows = signal<RecordRow[]>(this.seedRows());
  readonly domainRows = computed(() => {
    const status = this.statusFilter();
    return this.filtered().filter(
      (row) => !row.archived && (status === 'all' || row.status === status),
    );
  });
  readonly activeCount = computed(() => this.rows().filter((r) => !r.archived).length);
  readonly archivedCount = computed(() => this.rows().filter((r) => r.archived).length);
  readonly filtered = computed(() => {
    const q = this.search().trim().toLocaleLowerCase('tr');
    return this.rows().filter(
      (r) =>
        r.archived === this.archived() &&
        (!q || `${r.name} ${r.code} ${r.location}`.toLocaleLowerCase('tr').includes(q)),
    );
  });
  readonly activities = [
    {
      icon: 'fact_check',
      title: 'Kontrol kaydı tamamlandı',
      detail: 'Saha ekibi kanıt dosyalarını yükledi.',
      time: '10 dk önce',
    },
    {
      icon: 'person_add',
      title: 'Yeni ekip üyesi davet edildi',
      detail: 'Kalite yöneticisi rolü atandı.',
      time: '1 saat önce',
    },
    {
      icon: 'warning',
      title: 'Yaklaşan kontrol uyarısı',
      detail: '3 kayıt için son tarih 7 gün içinde.',
      time: '3 saat önce',
    },
    {
      icon: 'sync',
      title: 'MainAPI senkronizasyonu',
      detail: 'Tüm kayıtlar başarıyla eşitlendi.',
      time: 'Bugün 08:42',
    },
  ];
  readonly notificationOptions = [
    { label: 'Kritik uyarılar', note: 'Yüksek öncelikli riskleri anında bildir', enabled: true },
    { label: 'Haftalık özet', note: 'Her pazartesi operasyon özeti gönder', enabled: true },
    { label: 'Ürün güncellemeleri', note: 'Yeni özellik ve sürüm notları', enabled: false },
  ];
  openCreate(): void {
    this.selectedRecord.set(null);
    this.resetDraft();
    this.drawerOpen.set(true);
  }

  openDetail(row: RecordRow): void {
    this.selectedRecord.set(row);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.selectedRecord.set(null);
    this.resetDraft();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.evidenceFiles.set(Array.from(input.files ?? []).map((file) => file.name));
  }

  handleDrawerSubmit(): void {
    const selected = this.selectedRecord();
    if (selected) {
      this.draftModel.update((value) => ({
        ...value,
        name: selected.name,
        code: selected.code,
        location: selected.location,
        status: selected.status,
      }));
      this.selectedRecord.set(null);
      return;
    }
    submit(this.draftForm, async () => {
      const value = this.draftModel();
      this.rows.update((rows) => [
        {
          id: Date.now(),
          name: value.name,
          code: value.code,
          location: value.location,
          status: value.status === 'active' ? 'active' : 'pending',
          updated: new Date().toLocaleDateString('tr-TR'),
          archived: false,
        },
        ...rows,
      ]);
      this.closeDrawer();
    });
  }

  private resetDraft(): void {
    this.evidenceFiles.set([]);
    this.draftModel.set({
      name: '',
      code: `${PRODUCT.key.toUpperCase()}-${Date.now().toString().slice(-6)}`,
      category: this.formLabels.categories[0],
      location: '',
      department: '',
      primaryValue: '',
      secondaryValue: '',
      manufacturer: '',
      serialNumber: '',
      owner: '',
      dueDate: '',
      priority: 'normal',
      status: 'draft',
      reference: '',
      notes: '',
    });
    this.draftForm().reset();
  }

  private resolveFormLabels(): DomainFormLabels {
    const key = `${PRODUCT.key}:${this.domain.key}`;
    const labels: Record<string, DomainFormLabels> = {
      'fgas:equipment': {
        primaryLabel: 'Soğutucu akışkan',
        primaryPlaceholder: 'Örn. R-410A',
        secondaryLabel: 'Şarj miktarı',
        secondaryPlaceholder: 'Örn. 12,5 kg',
        categoryLabel: 'Ekipman türü',
        categories: ['Split klima', 'Chiller', 'Soğuk oda', 'Isı pompası'],
      },
      'fgas:leak-checks': {
        primaryLabel: 'Kontrol yöntemi',
        primaryPlaceholder: 'Elektronik kaçak detektörü',
        secondaryLabel: 'Ölçüm / sonuç',
        secondaryPlaceholder: 'Kaçak bulunmadı',
        categoryLabel: 'Kontrol türü',
        categories: ['Periyodik kontrol', 'Onarım sonrası', 'Devreye alma', 'Takip kontrolü'],
      },
      'fgas:gas-movements': {
        primaryLabel: 'Gaz türü',
        primaryPlaceholder: 'Örn. R-32',
        secondaryLabel: 'Miktar',
        secondaryPlaceholder: 'Örn. 4,2 kg',
        categoryLabel: 'Hareket türü',
        categories: ['Dolum', 'Geri kazanım', 'Transfer', 'Bertaraf'],
      },
      'fgas:technicians': {
        primaryLabel: 'Sertifika numarası',
        primaryPlaceholder: 'FGAS-TR-000123',
        secondaryLabel: 'Geçerlilik tarihi',
        secondaryPlaceholder: '31.12.2028',
        categoryLabel: 'Yetkinlik seviyesi',
        categories: ['Kategori I', 'Kategori II', 'Kategori III', 'Kategori IV'],
      },
      'fgas:inspections': {
        primaryLabel: 'Denetim kapsamı',
        primaryPlaceholder: 'Ekipman ve gaz hareketleri',
        secondaryLabel: 'Rapor numarası',
        secondaryPlaceholder: 'RPT-2026-001',
        categoryLabel: 'Denetim türü',
        categories: ['İç denetim', 'Müşteri denetimi', 'Resmî denetim', 'Hazırlık kontrolü'],
      },
      'fire-safe:equipment': {
        primaryLabel: 'Ekipman standardı',
        primaryPlaceholder: 'Örn. EN 3-7',
        secondaryLabel: 'Kapasite / sınıf',
        secondaryPlaceholder: '6 kg ABC',
        categoryLabel: 'Ekipman türü',
        categories: ['Yangın söndürücü', 'Sprinkler', 'Alarm paneli', 'Yangın pompası'],
      },
      'fire-safe:periodic-checks': {
        primaryLabel: 'Kontrol standardı',
        primaryPlaceholder: 'Örn. TS EN 12845',
        secondaryLabel: 'Kontrol sonucu',
        secondaryPlaceholder: 'Uygun / şartlı uygun',
        categoryLabel: 'Kontrol türü',
        categories: ['Aylık kontrol', 'Üç aylık bakım', 'Yıllık test', 'Performans testi'],
      },
      'fire-safe:nonconformities': {
        primaryLabel: 'Risk tanımı',
        primaryPlaceholder: 'Tespit edilen uygunsuzluk',
        secondaryLabel: 'Düzeltici faaliyet',
        secondaryPlaceholder: 'Planlanan aksiyon',
        categoryLabel: 'Risk seviyesi',
        categories: ['Düşük', 'Orta', 'Yüksek', 'Kritik'],
      },
      'fire-safe:emergency-plans': {
        primaryLabel: 'Plan kapsamı',
        primaryPlaceholder: 'Bina / kat / bölge',
        secondaryLabel: 'Toplanma alanı',
        secondaryPlaceholder: 'Alan kodu ve konumu',
        categoryLabel: 'Plan türü',
        categories: ['Tahliye planı', 'Yangın planı', 'Kurtarma planı', 'Tatbikat planı'],
      },
      'fire-safe:reports': {
        primaryLabel: 'Denetim kapsamı',
        primaryPlaceholder: 'Lokasyon ve sistemler',
        secondaryLabel: 'Rapor referansı',
        secondaryPlaceholder: 'FS-RPT-2026-001',
        categoryLabel: 'Rapor türü',
        categories: ['Uygunluk raporu', 'Bakım raporu', 'Tatbikat raporu', 'Risk değerlendirmesi'],
      },
      'food-label:products': {
        primaryLabel: 'GTIN / barkod',
        primaryPlaceholder: '8680000000000',
        secondaryLabel: 'Net miktar',
        secondaryPlaceholder: '350 g',
        categoryLabel: 'Ürün kategorisi',
        categories: ['Atıştırmalık', 'Süt ürünü', 'İçecek', 'Takviye edici gıda'],
      },
      'food-label:recipes': {
        primaryLabel: 'Porsiyon gramajı',
        primaryPlaceholder: 'Örn. 45 g',
        secondaryLabel: 'Reçete versiyonu',
        secondaryPlaceholder: 'v2.1',
        categoryLabel: 'Reçete durumu',
        categories: ['Taslak reçete', 'Pilot üretim', 'Onaylı reçete', 'Revizyon'],
      },
      'food-label:allergens': {
        primaryLabel: 'Alerjen kaynağı',
        primaryPlaceholder: 'Örn. badem unu',
        secondaryLabel: 'Beyan metni',
        secondaryPlaceholder: 'Eser miktarda içerebilir',
        categoryLabel: 'Alerjen grubu',
        categories: ['Gluten', 'Süt', 'Yumurta', 'Sert kabuklu meyveler'],
      },
      'food-label:nutrition': {
        primaryLabel: 'Enerji',
        primaryPlaceholder: 'Örn. 425 kcal / 100 g',
        secondaryLabel: 'Porsiyon',
        secondaryPlaceholder: 'Örn. 40 g',
        categoryLabel: 'Hesaplama yöntemi',
        categories: [
          'Reçeteden hesaplama',
          'Laboratuvar analizi',
          'Tedarikçi verisi',
          'Karma yöntem',
        ],
      },
      'food-label:approvals': {
        primaryLabel: 'Hedef pazar',
        primaryPlaceholder: 'Türkiye / AB / UK',
        secondaryLabel: 'Etiket versiyonu',
        secondaryPlaceholder: 'LBL-v3.2',
        categoryLabel: 'Onay türü',
        categories: ['Mevzuat kontrolü', 'Kalite onayı', 'Pazarlama onayı', 'Nihai yayın'],
      },
      'diet:clients': {
        primaryLabel: 'Danışan numarası / hedef',
        primaryPlaceholder: 'Örn. CL-2048 · performans artışı',
        secondaryLabel: 'Klinik not / hassasiyet',
        secondaryPlaceholder: 'Örn. laktoz intoleransı',
        categoryLabel: 'Program türü',
        categories: ['Kilo yönetimi', 'Sporcu beslenmesi', 'Klinik beslenme', 'Koruyucu sağlık'],
      },
      'diet:plans': {
        primaryLabel: 'Enerji ve makro hedefi',
        primaryPlaceholder: 'Örn. 2100 kcal · P150/K220/Y70',
        secondaryLabel: 'Plan dönemi / öğün düzeni',
        secondaryPlaceholder: 'Örn. 4 hafta · 3+2 öğün',
        categoryLabel: 'Plan durumu',
        categories: ['Taslak', 'Danışan onayında', 'Aktif', 'Revizyon gerekli'],
      },
      'diet:measurements': {
        primaryLabel: 'Ölçüm ve birim',
        primaryPlaceholder: 'Örn. vücut ağırlığı · 78,4 kg',
        secondaryLabel: 'Ölçüm yöntemi / koşulu',
        secondaryPlaceholder: 'Örn. BIA · açlık',
        categoryLabel: 'Ölçüm grubu',
        categories: ['Antropometri', 'Vücut kompozisyonu', 'Laboratuvar', 'Performans'],
      },
      'diet:consultations': {
        primaryLabel: 'Görüşme türü ve bulgu',
        primaryPlaceholder: 'Örn. haftalık takip · açlık kontrolü iyi',
        secondaryLabel: 'Sonraki aksiyon',
        secondaryPlaceholder: 'Örn. akşam ara öğününü güncelle',
        categoryLabel: 'Görüşme kanalı',
        categories: ['Klinik', 'Video görüşme', 'Telefon', 'Mesaj takibi'],
      },
      'diet:reports': {
        primaryLabel: 'Rapor dönemi / sonuç',
        primaryPlaceholder: 'Örn. Ekim 2026 · hedefin %82’si',
        secondaryLabel: 'Paylaşım kapsamı',
        secondaryPlaceholder: 'Örn. danışan ve hekim',
        categoryLabel: 'Rapor türü',
        categories: ['İlerleme raporu', 'Klinik özet', 'Program sonu', 'Kurumsal rapor'],
      },
    };
    return (
      labels[key] ?? {
        primaryLabel: 'Teknik değer',
        primaryPlaceholder: 'Değer girin',
        secondaryLabel: 'İkincil değer',
        secondaryPlaceholder: 'Ek bilgi',
        categoryLabel: 'Kategori',
        categories: ['Genel'],
      }
    );
  }

  private seedRows(): RecordRow[] {
    const names = [
      'Elif Kaya – Performans Programı',
      'Mert Yıldız – Kilo Yönetimi',
      'Selin Aras – Klinik Takip',
      'Arşiv Danışan Kaydı DT-07',
    ];
    return names.map((name, index) => ({
      id: index + 1,
      name,
      code: `${PRODUCT.key.toUpperCase()}-${1001 + index}`,
      location: ['İstanbul / Merkez', 'Ankara / Fabrika', 'İzmir / Depo', 'Bursa / Arşiv'][index],
      status: index === 1 ? 'pending' : 'active',
      updated: ['25.10.2026', '24.10.2026', '22.10.2026', '12.09.2026'][index],
      archived: index === 3,
    }));
  }
}
