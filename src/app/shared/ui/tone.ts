import { Tone } from '../../domain/diet.models';

export function toneClass(tone: Tone): string {
  return `odv-tone-${tone}`;
}

export const TONE_ICON_BG: Record<Tone, string> = {
  primary: 'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300',
  positive: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300',
  danger: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300',
  info: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300',
  neutral: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
};
