import { Component, computed, input } from '@angular/core';

export interface TrendPoint {
  readonly date: string;
  readonly value: number;
}

const W = 640;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

/** Lightweight SVG line chart for weight and body measurements. */
@Component({
  selector: 'app-trend-chart',
  host: { class: 'block' },
  template: `
    @if (points().length > 1) {
      <svg
        [attr.viewBox]="'0 0 ' + width + ' ' + height"
        class="h-auto w-full overflow-visible"
        role="img"
        [attr.aria-label]="summary()"
      >
        <defs>
          <linearGradient [attr.id]="gradientId" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#8b5cf6" stop-opacity=".28" />
            <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0" />
          </linearGradient>
        </defs>
        @for (tick of geometry().yTicks; track tick.value) {
          <line
            [attr.x1]="pad.left"
            [attr.x2]="width - pad.right"
            [attr.y1]="tick.y"
            [attr.y2]="tick.y"
            class="stroke-slate-100 dark:stroke-slate-800"
            stroke-width="1"
          />
          <text
            [attr.x]="pad.left - 8"
            [attr.y]="tick.y + 4"
            text-anchor="end"
            class="fill-slate-400 text-[11px] tabular"
          >
            {{ tick.value }}
          </text>
        }
        @if (geometry().targetY !== null) {
          <line
            [attr.x1]="pad.left"
            [attr.x2]="width - pad.right"
            [attr.y1]="geometry().targetY"
            [attr.y2]="geometry().targetY"
            class="stroke-emerald-500"
            stroke-width="1.5"
            stroke-dasharray="5 5"
          />
          <text
            [attr.x]="width - pad.right"
            [attr.y]="geometry().targetY! - 6"
            text-anchor="end"
            class="fill-emerald-600 text-[11px] font-bold dark:fill-emerald-400"
          >
            Hedef {{ target() }} {{ unit() }}
          </text>
        }
        <path [attr.d]="geometry().area" [attr.fill]="'url(#' + gradientId + ')'" />
        <path
          [attr.d]="geometry().line"
          fill="none"
          class="stroke-violet-500"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        @for (dot of geometry().dots; track dot.x; let last = $last) {
          <circle
            [attr.cx]="dot.x"
            [attr.cy]="dot.y"
            [attr.r]="last ? 5 : 3.5"
            class="fill-white stroke-violet-500 dark:fill-slate-900"
            stroke-width="2"
          >
            <title>{{ dot.label }}: {{ dot.value }} {{ unit() }}</title>
          </circle>
          <text
            [attr.x]="dot.x"
            [attr.y]="height - 8"
            text-anchor="middle"
            class="fill-slate-400 text-[10px]"
          >
            {{ dot.label }}
          </text>
        }
      </svg>
    } @else {
      <p class="py-10 text-center text-xs text-slate-500">Grafik için en az iki ölçüm gerekir.</p>
    }
  `,
})
export class TrendChart {
  private static seq = 0;
  readonly points = input.required<readonly TrendPoint[]>();
  readonly target = input<number | null>(null);
  readonly unit = input('kg');
  readonly width = W;
  readonly height = H;
  readonly pad = PAD;
  readonly gradientId = `trend-${++TrendChart.seq}`;

  readonly summary = computed(() => {
    const pts = this.points();
    if (!pts.length) return 'Veri yok';
    return `Ölçüm grafiği: ${pts[0].value} ${this.unit()} değerinden ${pts.at(-1)!.value} ${this.unit()} değerine.`;
  });

  readonly geometry = computed(() => {
    const pts = this.points();
    const target = this.target();
    const values = pts.map((p) => p.value).concat(target ?? []);
    let min = Math.min(...values);
    let max = Math.max(...values);
    const spread = Math.max(max - min, 2);
    min = Math.floor(min - spread * 0.15);
    max = Math.ceil(max + spread * 0.15);
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const t0 = new Date(pts[0]?.date ?? 0).getTime();
    const t1 = new Date(pts.at(-1)?.date ?? 0).getTime();
    const x = (date: string) =>
      PAD.left + (t1 === t0 ? innerW / 2 : ((new Date(date).getTime() - t0) / (t1 - t0)) * innerW);
    const y = (value: number) => PAD.top + (1 - (value - min) / (max - min)) * innerH;
    const fmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
    const dots = pts.map((p) => ({
      x: round(x(p.date)),
      y: round(y(p.value)),
      value: p.value,
      label: fmt.format(new Date(p.date)),
    }));
    const line = dots.map((d, i) => `${i ? 'L' : 'M'}${d.x},${d.y}`).join(' ');
    const baseY = PAD.top + innerH;
    const area = dots.length ? `${line} L${dots.at(-1)!.x},${baseY} L${dots[0].x},${baseY} Z` : '';
    const steps = 4;
    const yTicks = Array.from({ length: steps + 1 }, (_, i) => {
      const value = Math.round(min + ((max - min) * i) / steps);
      return { value, y: round(y(value)) };
    }).filter((tick, i, all) => all.findIndex((t) => t.value === tick.value) === i);
    return { dots, line, area, yTicks, targetY: target === null ? null : round(y(target)) };
  });
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
