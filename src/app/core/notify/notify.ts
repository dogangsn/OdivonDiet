import { Injectable, signal } from '@angular/core';
import { toast } from 'ngx-sonner';

export type ConfirmTone = 'primary' | 'danger';

export interface ConfirmOptions {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  /** `danger` geri alınamayan ya da veri kaybettiren işlemler içindir. */
  tone?: ConfirmTone;
  /** Material Symbols ikon adı. */
  icon?: string;
}

export interface ConfirmRequest extends Required<Omit<ConfirmOptions, 'text'>> {
  text?: string;
  resolve: (value: boolean) => void;
}

/**
 * Uygulama genelindeki bildirimler. Kısa geri bildirimler sonner toast'ı,
 * onay gerektiren işlemler modern onay penceresi ile gösterilir.
 */
@Injectable({ providedIn: 'root' })
export class Notify {
  /** `odv-confirm-host` tarafından gösterilen aktif onay isteği. */
  readonly pending = signal<ConfirmRequest | null>(null);

  success(title: string, description?: string): void {
    toast.success(title, { description });
  }

  error(title: string, description?: string): void {
    toast.error(title, { description });
  }

  info(title: string, description?: string): void {
    toast.info(title, { description });
  }

  warning(title: string, description?: string): void {
    toast.warning(title, { description });
  }

  confirm(options: ConfirmOptions): Promise<boolean> {
    // Açık bir onay varsa vazgeçilmiş sayılır.
    this.pending()?.resolve(false);
    const tone = options.tone ?? 'primary';
    return new Promise<boolean>((resolve) => {
      this.pending.set({
        title: options.title,
        text: options.text,
        confirmText: options.confirmText ?? 'Onayla',
        cancelText: options.cancelText ?? 'Vazgeç',
        tone,
        icon: options.icon ?? (tone === 'danger' ? 'warning' : 'help'),
        resolve: (value) => {
          this.pending.set(null);
          resolve(value);
        },
      });
    });
  }
}
