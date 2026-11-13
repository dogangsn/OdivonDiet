import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { DietApiService, PracticeSettings } from '../../core/api/diet-api.service';
import { AuthStore } from '../../core/auth/auth-store';
import { SubscriptionStore } from '../../core/billing/subscription-store';
import { DietStore } from '../../core/data/diet-store';
import { loadWorkspacePart, saveWorkspacePart } from '../../core/data/workspace';
import { Notify } from '../../core/notify/notify';
import { ClinicStaffRole, STAFF_ROLES, staffRoleById } from '../../domain/staff-rbac';
import { Avatar } from '../../shared/ui/avatar';
import { PageHeader } from '../../shared/ui/page-header';

interface StoredSettings {
  readonly sessionDurationMin: 30 | 45 | 60;
  readonly notifications: {
    readonly reminder: boolean;
    readonly overdue: boolean;
    readonly weekly: boolean;
    readonly portalMessage: boolean;
  };
}

@Component({
  selector: 'app-settings-page',
  imports: [PageHeader, FormsModule, Avatar],
  template: `
    <div class="animate-fade-up space-y-6">
      <app-page-header
        eyebrow="Sistem"
        title="Ayarlar"
        description="Muayenehane bilgileri, bildirimler, MainAPI senkronizasyonu ve KVKK veri güvenliği."
      >
        <div actions class="flex flex-wrap items-center gap-2">
          <button type="button" class="odv-btn odv-btn-ghost" (click)="exportWorkspaceJson()">
            <span class="material-symbols-rounded text-[18px]" aria-hidden="true">download</span>
            KVKK Veri Yedeği İndir (JSON)
          </button>
          <button type="button" class="odv-btn odv-btn-primary" (click)="saveSettings()">
            <span class="material-symbols-rounded text-[18px]" aria-hidden="true">save</span>
            Ayarları Kaydet
          </button>
        </div>
      </app-page-header>

      <div class="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section class="odv-card space-y-5 p-5 sm:p-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="odv-section-title">Muayenehane ve Uzman Profili</h2>
              <p class="text-xs text-slate-500">
                Raporlarda, danışan portalında ve beslenme reçetelerinde görünen klinik bilgileriniz.
              </p>
            </div>
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
              [class]="
                auth.session()?.demo
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              "
            >
              <span class="size-2 rounded-full bg-current"></span>
              {{ auth.session()?.demo ? 'Demo Oturumu' : 'Canlı Klinik Oturumu' }}
            </span>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="odv-label">Diyetisyen Adı & Unvanı</span>
              <input
                class="odv-input"
                [value]="dietitianName()"
                (input)="dietitianName.set(val($event))"
                placeholder="Örn. Uzm. Dyt. Deniz Arslan"
              />
            </label>
            <label class="block">
              <span class="odv-label">Muayenehane / Klinik Adı</span>
              <input
                class="odv-input"
                [value]="practiceName()"
                (input)="practiceName.set(val($event))"
                placeholder="Örn. Sağlıklı Yaşam Kliniği"
              />
            </label>
            <label class="block">
              <span class="odv-label">Klinik Uzmanlık Branşı</span>
              <input
                class="odv-input"
                [value]="specialty()"
                (input)="specialty.set(val($event))"
                placeholder="Örn. Obezite & Metabolik Beslenme"
              />
            </label>
            <label class="block">
              <span class="odv-label">Oda / Uzman Sicil No</span>
              <input
                class="odv-input font-mono text-xs"
                [value]="licenseNo()"
                (input)="licenseNo.set(val($event))"
                placeholder="Örn. TR-DYT-10482"
              />
            </label>
            <label class="block">
              <span class="odv-label">Varsayılan Görüşme Süresi</span>
              <select
                class="odv-input"
                [value]="sessionDurationMin()"
                (change)="setDuration(val($event))"
              >
                <option value="30">30 dakika</option>
                <option value="45">45 dakika</option>
                <option value="60">60 dakika</option>
              </select>
            </label>
            <label class="block">
              <span class="odv-label">Ölçü Birimi</span>
              <select class="odv-input" disabled>
                <option selected>Metrik (kg, cm, kcal)</option>
              </select>
            </label>
            <label class="block sm:col-span-2">
              <span class="odv-label">MainAPI Veri Katmanı Adresi</span>
              <div class="flex items-center gap-2">
                <input class="odv-input font-mono text-xs" [value]="apiBaseUrl" readonly />
                <span
                  class="shrink-0 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  {{ syncStatusLabel() }}
                </span>
              </div>
            </label>
          </div>
        </section>

        <div class="space-y-6">
          <section class="odv-card p-5 sm:p-6">
            <h2 class="odv-section-title mb-2">Bildirimler</h2>
            @for (option of notifications(); track option.key; let i = $index) {
              <label
                class="flex items-center justify-between gap-4 border-b border-slate-100 py-3.5 last:border-0 dark:border-slate-800"
              >
                <span>
                  <strong class="block text-sm">{{ option.label }}</strong>
                  <span class="text-xs text-slate-500">{{ option.note }}</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  class="size-5 accent-violet-600"
                  [checked]="option.enabled"
                  (change)="toggle(i)"
                />
              </label>
            }
          </section>

          <section class="odv-card space-y-4 p-5 sm:p-6">
            <div class="flex items-start gap-3">
              <span
                class="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
              >
                <span class="material-symbols-rounded" aria-hidden="true">shield_lock</span>
              </span>
              <div class="flex-1">
                <h2 class="odv-section-title">Veri güvenliği ve KVKK Uyumluluğu</h2>
                <p class="mt-1 text-xs leading-5 text-slate-500">
                  Danışan sağlık verileri 6698 sayılı KVKK Madde 6 kapsamında özel nitelikli kişisel
                  veridir. Her danışan için açık rıza zaman damgası tutulur; rızası olmayan
                  danışanlar panelde uyarı olarak gösterilir.
                </p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                class="odv-btn odv-btn-ghost text-xs"
                (click)="showKvkkModal.set(!showKvkkModal())"
              >
                <span class="material-symbols-rounded text-[16px]" aria-hidden="true">policy</span>
                {{ showKvkkModal() ? 'KVKK Metnini Gizle' : 'KVKK Aydınlatma & Açık Rıza Metnini Gör' }}
              </button>
            </div>

            @if (showKvkkModal()) {
              <div
                class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
              >
                <strong class="block text-slate-900 dark:text-white">
                  6698 Sayılı KVKK Kapsamında Özel Nitelikli Sağlık Verisi Aydınlatma ve Açık Rıza
                  Protokolü
                </strong>
                <p class="mt-1.5">
                  1. <strong>Veri Sorumlusu:</strong> {{ practiceName() || 'Klinik / Muayenehane' }}
                  ({{ dietitianName() || 'Sorumlu Diyetisyen' }}).
                </p>
                <p class="mt-1">
                  2. <strong>İşlenen Veriler:</strong> Antropometrik ölçümler, InBody/BIA vücut
                  kompozisyonu, kan tahlili biyobelirteçleri, besin alerjileri, kronik tanı ve ilaç
                  bilgileri yalnızca tıbbi beslenme tedavisi ve diyet planlaması amacıyla işlenir.
                </p>
                <p class="mt-1">
                  3. <strong>Veri Güvenliği & Erişim:</strong> Veriler yalnızca danışanın kendisi
                  (Danışan Portalı) ve sorumlu diyetisyeni tarafından görüntülenebilir; üçüncü
                  taraflarla reklam veya pazarlama amacıyla paylaşılmaz.
                </p>
              </div>
            }
          </section>
        </div>
      </div>

      <!-- KLİNİK EKİP, KULLANICI AÇMA & ROL YETKİLENDİRME (RBAC) STÜDYOSU -->
      <section
        class="odv-card space-y-5 p-5 sm:p-6"
        aria-label="Klinik kullanıcı açma ve rol yetkilendirme yönetimi"
      >
        <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <span class="odv-eyebrow text-violet-600">RBAC · Kullanıcı & Yetki Yönetimi</span>
            <h2 class="odv-section-title mt-0.5">
              Klinik Ekip Hesapları, Kullanıcı Açma ve Ekran Yetkilendirme
            </h2>
            <p class="mt-0.5 text-xs text-slate-500">
              Kliniğinizdeki uzman diyetisyen, stajyer/asistan ve ön büro/sekreterya personeli için hesap
              açın; paket koltuk limitinizi ve rol bazlı ekran kilitlerini yönetin.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="odv-badge odv-tone-info tabular">
              Aktif Koltuk: {{ auth.activeStaffCount() }} / {{ seatLimitLabel() }}
            </span>
            <span class="odv-badge odv-tone-primary">
              Sizin Aktif Rolünüz: {{ activeRoleDef().label }}
            </span>
          </div>
        </div>

        <!-- Canlı Rol Simülatörü (Ekran Engellemeyi Anında Test Et) -->
        <div
          class="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/20"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <strong class="block text-xs font-extrabold text-violet-950 dark:text-violet-100">
                Canlı Rol Yetkisi & Ekran Kilitleme Testi (Simülatör)
              </strong>
              <span class="text-[11px] text-slate-600 dark:text-slate-300">
                Farklı bir rol seçtiğinizde sol menüdeki kilit ikonları (<span class="font-mono">lock</span>) ve ekran engellemeleri anında devreye girer.
              </span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              @for (r of staffRoles; track r.id) {
                <button
                  type="button"
                  (click)="switchActiveRole(r.id)"
                  class="rounded-xl px-3 py-1.5 text-xs font-bold transition"
                  [class]="
                    auth.staffRole() === r.id
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-violet-100 dark:bg-slate-800 dark:text-slate-200'
                  "
                >
                  {{ r.label }}
                </button>
              }
            </div>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <!-- Sol: Yeni Kullanıcı Açma Formu -->
          <form
            class="space-y-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50"
            (submit)="createStaffUser($event)"
          >
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-extrabold">Yeni Klinik Kullanıcısı Aç</h3>
              <span class="text-[11px] font-semibold text-slate-400">Koltuk kontrolü aktif</span>
            </div>

            <label class="block">
              <span class="odv-label">Ad Soyad & Unvan <b class="text-rose-500">*</b></span>
              <input
                class="odv-input"
                [(ngModel)]="newStaffName"
                name="staffName"
                placeholder="Örn. Dyt. Selin Yılmaz / Sekreter Ayşe K."
                required
              />
            </label>

            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block">
                <span class="odv-label">Kurumsal E-posta <b class="text-rose-500">*</b></span>
                <input
                  class="odv-input"
                  type="email"
                  [(ngModel)]="newStaffEmail"
                  name="staffEmail"
                  placeholder="selin@klinik.com"
                  required
                />
              </label>
              <label class="block">
                <span class="odv-label">Geçici Giriş Şifresi</span>
                <input
                  class="odv-input font-mono text-xs"
                  type="text"
                  [(ngModel)]="newStaffPassword"
                  name="staffPass"
                  placeholder="Odivon2026!"
                />
              </label>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block">
                <span class="odv-label">Yetki Rolü (RBAC)</span>
                <select class="odv-input" [(ngModel)]="newStaffRole" name="staffRole">
                  @for (r of staffRoles; track r.id) {
                    <option [ngValue]="r.id">{{ r.label }}</option>
                  }
                </select>
              </label>
              <label class="block">
                <span class="odv-label">Klinik Birim / Görev</span>
                <input
                  class="odv-input"
                  [(ngModel)]="newStaffSpecialty"
                  name="staffSpec"
                  placeholder="Örn. Sporcu Beslenmesi / Ön Büro"
                />
              </label>
            </div>

            <button type="submit" class="odv-btn-primary w-full justify-center">
              <span class="material-symbols-rounded !text-base">person_add</span>
              Kullanıcı Hesabını Aç ve Yetkilendir
            </button>

            <p class="text-[11px] text-slate-500">
              Paket koltuk limitiniz dolduğunda yeni kullanıcı açılması engellenir;
              <a href="/billing" class="font-bold text-violet-600 underline">Abonelik</a>
              sayfasından 5 kullanıcılı Klinik Pakete geçebilirsiniz.
            </p>
          </form>

          <!-- Sağ: Açılan Kullanıcılar ve Rol/Durum Yönetimi -->
          <div class="space-y-4">
            <h3 class="text-sm font-extrabold">
              Kayıtlı Klinik Kullanıcıları ({{ auth.staffMembers().length }})
            </h3>

            <ul class="space-y-2.5">
              @for (member of auth.staffMembers(); track member.id) {
                <li
                  class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div class="flex items-center gap-3">
                    <app-avatar [name]="member.name" size="sm" />
                    <div>
                      <div class="flex flex-wrap items-center gap-1.5">
                        <strong class="text-sm">{{ member.name }}</strong>
                        <span
                          class="odv-badge text-[10px]"
                          [class]="member.active ? 'odv-tone-positive' : 'odv-tone-danger'"
                        >
                          {{ member.active ? 'Aktif' : 'Pasif (Giriş Engelli)' }}
                        </span>
                      </div>
                      <p class="text-xs text-slate-500">
                        {{ member.email }} · {{ member.specialty }}
                      </p>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center gap-2">
                    <label class="sr-only" [attr.for]="'role-sel-' + member.id">Kullanıcı rolü</label>
                    <select
                      [id]="'role-sel-' + member.id"
                      class="odv-input !w-auto !py-1.5 text-xs font-semibold"
                      [ngModel]="member.role"
                      (ngModelChange)="changeMemberRole(member.id, $event)"
                    >
                      @for (r of staffRoles; track r.id) {
                        <option [ngValue]="r.id">{{ r.label }}</option>
                      }
                    </select>

                    <button
                      type="button"
                      class="odv-btn-ghost !min-h-8 !px-2.5 text-xs"
                      (click)="toggleMemberActive(member.id, member.name, member.active)"
                    >
                      {{ member.active ? 'Pasife Al' : 'Aktifleştir' }}
                    </button>

                    @if (auth.staffMembers().length > 1) {
                      <button
                        type="button"
                        class="odv-icon-btn !size-8 text-rose-500"
                        aria-label="Kullanıcıyı sil"
                        (click)="deleteMember(member.id, member.name)"
                      >
                        <span class="material-symbols-rounded !text-base">delete</span>
                      </button>
                    }
                  </div>
                </li>
              }
            </ul>

            <!-- Rol Yetki Matrisi Özeti -->
            <div class="grid gap-2 sm:grid-cols-2">
              @for (r of staffRoles; track r.id) {
                <div class="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                  <div class="flex items-center justify-between">
                    <strong class="font-extrabold text-slate-800 dark:text-white">{{ r.label }}</strong>
                    <span class="odv-badge odv-tone-neutral text-[10px]">
                      {{ r.allowedPaths.length }} ekran açık
                    </span>
                  </div>
                  <p class="mt-1 text-[11px] leading-relaxed text-slate-500">{{ r.description }}</p>
                </div>
              }
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
})
export class SettingsPage {
  readonly auth = inject(AuthStore);
  readonly subs = inject(SubscriptionStore);
  readonly diet = inject(DietStore);
  private readonly api = inject(DietApiService, { optional: true });
  private readonly notify = inject(Notify);
  readonly apiBaseUrl = environment.apiBaseUrl;
  readonly staffRoles = STAFF_ROLES;

  newStaffName = '';
  newStaffEmail = '';
  newStaffPassword = '';
  newStaffRole: ClinicStaffRole = 'dietitian';
  newStaffSpecialty = 'Klinik Beslenme Uzmanı';

  readonly activeRoleDef = computed(() => staffRoleById(this.auth.staffRole()));
  readonly seatLimitLabel = computed(() => {
    const seats = this.subs.state()?.plan.seats;
    return seats ? `${seats} Koltuk (${this.subs.state()?.plan.name})` : '5 Koltuk (Demo/Klinik)';
  });

  private readonly stored = loadWorkspacePart<StoredSettings>(this.diet.workspace(), 'settings');

  readonly dietitianName = signal(this.auth.session()?.name ?? '');
  readonly practiceName = signal(this.auth.session()?.practice ?? '');
  readonly specialty = signal(this.auth.session()?.specialty ?? 'Obezite & Metabolik Beslenme');
  readonly licenseNo = signal(this.auth.session()?.licenseNo ?? '');
  readonly sessionDurationMin = signal<30 | 45 | 60>(this.stored?.sessionDurationMin ?? 45);
  readonly showKvkkModal = signal(false);

  readonly syncStatusLabel = computed(() => {
    if (this.auth.session()?.demo) return 'Yerel Demo';
    const status = this.diet.syncStatus();
    if (status === 'syncing') return 'Senkronize ediliyor…';
    if (status === 'synced') return 'MainAPI Senkronize';
    if (status === 'offline') return 'Çevrimdışı Önbellek';
    return 'Hazır';
  });

  readonly notifications = signal([
    {
      key: 'reminder',
      label: 'Randevu hatırlatmaları',
      note: 'Görüşmeden 1 saat önce bildir',
      enabled: this.stored?.notifications.reminder ?? true,
    },
    {
      key: 'overdue',
      label: 'Geciken ölçümler',
      note: '14 günü geçen ölçümleri bildir',
      enabled: this.stored?.notifications.overdue ?? true,
    },
    {
      key: 'weekly',
      label: 'Haftalık özet',
      note: 'Her pazartesi ilerleme özeti gönder',
      enabled: this.stored?.notifications.weekly ?? false,
    },
    {
      key: 'portalMessage',
      label: 'Danışan portalı mesaj ve talepleri',
      note: 'Yeni öğün fotoğrafı veya randevu talebinde anında bildir',
      enabled: this.stored?.notifications.portalMessage ?? true,
    },
  ]);

  val(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  setDuration(raw: string): void {
    const num = Number(raw);
    if (num === 30 || num === 45 || num === 60) {
      this.sessionDurationMin.set(num);
    }
  }

  toggle(index: number): void {
    this.notifications.update((list) =>
      list.map((item, i) => (i === index ? { ...item, enabled: !item.enabled } : item)),
    );
  }

  saveSettings(): void {
    const name = this.dietitianName().trim() || (this.auth.session()?.name ?? 'Odivon Uzmanı');
    const practice = this.practiceName().trim();
    const specialty = this.specialty().trim();
    const licenseNo = this.licenseNo().trim();

    this.auth.updateProfile({ name, practice, specialty, licenseNo });

    const list = this.notifications();
    const notifMap = {
      reminder: list.find((n) => n.key === 'reminder')?.enabled ?? true,
      overdue: list.find((n) => n.key === 'overdue')?.enabled ?? true,
      weekly: list.find((n) => n.key === 'weekly')?.enabled ?? false,
      portalMessage: list.find((n) => n.key === 'portalMessage')?.enabled ?? true,
    };

    saveWorkspacePart(this.diet.workspace(), 'settings', {
      sessionDurationMin: this.sessionDurationMin(),
      notifications: notifMap,
    } satisfies StoredSettings);

    if (this.api && !this.auth.session()?.demo) {
      const payload: PracticeSettings = {
        dietitianName: name,
        practiceName: practice,
        specialty,
        licenseNo,
        sessionDurationMin: this.sessionDurationMin(),
        unitSystem: 'metric',
        notifications: notifMap,
      };
      this.api.savePracticeSettings(payload).subscribe();
    }

    this.notify.success('Klinik ve bildirim ayarlarınız kaydedildi.');
  }

  exportWorkspaceJson(): void {
    const payload = {
      exportedAt: new Date().toISOString(),
      clinic: {
        dietitian: this.dietitianName(),
        practice: this.practiceName(),
        specialty: this.specialty(),
        licenseNo: this.licenseNo(),
      },
      clients: this.diet.clients(),
      measurements: this.diet.measurements(),
      plans: this.diet.plans(),
      consultations: this.diet.consultations(),
      labs: this.diet.labs(),
      medications: this.diet.medications(),
      supplements: this.diet.supplements(),
      glp1Profiles: this.diet.glp1Profiles(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    if (typeof URL.createObjectURL !== 'function') return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `odivondiet-klinik-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.notify.success('Klinik veri yedeği (JSON) indirildi.');
  }

  switchActiveRole(role: ClinicStaffRole): void {
    this.auth.setStaffRole(role);
    const def = staffRoleById(role);
    this.notify.info(
      `Aktif rol değiştirildi: ${def.label}`,
      `Sol menüdeki kilit ikonları ve ekran erişim yetkileri bu role göre güncellendi.`,
    );
  }

  createStaffUser(event: Event): void {
    event.preventDefault();
    const name = this.newStaffName.trim();
    const email = this.newStaffEmail.trim().toLowerCase();
    if (!name || !email.includes('@')) {
      this.notify.warning('Eksik bilgi', 'Kullanıcı adı ve geçerli bir e-posta adresi girin.');
      return;
    }
    if (this.auth.staffMembers().some((m) => m.email.toLowerCase() === email)) {
      this.notify.warning('E-posta kullanımda', 'Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var.');
      return;
    }
    if (!this.subs.canAddStaffSeat(this.auth.activeStaffCount())) {
      const plan = this.subs.state()?.plan;
      this.notify.warning(
        'Paket kullanıcı (koltuk) limitine ulaştınız',
        `${plan?.name ?? 'Mevcut'} paketiniz ${plan?.seats ?? 1} diyetisyen/personel hesabına izin veriyor. 5 kullanıcılı Klinik Pakete geçin.`,
      );
      return;
    }
    const created = this.auth.addStaffMember({
      name,
      email,
      role: this.newStaffRole,
      specialty: this.newStaffSpecialty,
      tempPassword: this.newStaffPassword || 'Odivon2026!',
    });
    this.newStaffName = '';
    this.newStaffEmail = '';
    this.newStaffPassword = '';
    this.notify.success(
      'Yeni kullanıcı açıldı ve yetkilendirildi',
      `${created.name} (${staffRoleById(created.role).label}) artık ${created.email} ile giriş yapabilir.`,
    );
  }

  changeMemberRole(id: string, role: ClinicStaffRole): void {
    this.auth.updateStaffMemberRole(id, role);
    this.notify.success('Kullanıcı rolü güncellendi', staffRoleById(role).label);
  }

  toggleMemberActive(id: string, name: string, currentlyActive: boolean): void {
    this.auth.toggleStaffMemberActive(id);
    if (currentlyActive) {
      this.notify.warning('Kullanıcı pasife alındı', `${name} artık panele giriş yapamaz.`);
    } else {
      this.notify.success('Kullanıcı aktifleştirildi', `${name} tekrar panele giriş yapabilir.`);
    }
  }

  deleteMember(id: string, name: string): void {
    this.auth.removeStaffMember(id);
    this.notify.info('Kullanıcı silindi', name);
  }
}
