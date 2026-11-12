import { ResolutionPreset } from '../types/kaleidoscope';

export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  // Соцсети
  {
    id: 'ig-square',
    name: 'Пост Instagram / Telegram',
    category: 'social',
    width: 1080,
    height: 1080,
    aspectLabel: '1:1',
  },
  {
    id: 'reels-vertical',
    name: 'Reels / TikTok / Shorts',
    category: 'social',
    width: 1080,
    height: 1920,
    aspectLabel: '9:16',
  },
  {
    id: 'ig-portrait',
    name: 'Instagram Портрет',
    category: 'social',
    width: 1080,
    height: 1350,
    aspectLabel: '4:5',
  },
  {
    id: 'social-cover',
    name: 'Обложка YouTube / VK',
    category: 'social',
    width: 1280,
    height: 720,
    aspectLabel: '16:9',
  },

  // Десктоп
  {
    id: 'desktop-fhd',
    name: 'Full HD Обои',
    category: 'desktop',
    width: 1920,
    height: 1080,
    aspectLabel: '16:9',
  },
  {
    id: 'desktop-qhd',
    name: '2K QHD Дисплей',
    category: 'desktop',
    width: 2560,
    height: 1440,
    aspectLabel: '16:9',
  },
  {
    id: 'desktop-4k',
    name: '4K UHD Экран',
    category: 'desktop',
    width: 3840,
    height: 2160,
    aspectLabel: '16:9',
  },
  {
    id: 'desktop-ultrawide',
    name: 'Ultrawide Монитор',
    category: 'desktop',
    width: 2560,
    height: 1080,
    aspectLabel: '21:9',
  },

  // Свой размер
  {
    id: 'custom-res',
    name: 'Свой формат',
    category: 'custom',
    width: 1600,
    height: 1200,
    aspectLabel: '4:3',
  },
];

export function formatAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const d = gcd(w, h);
  const rw = w / d;
  const rh = h / d;
  if (rw <= 32 && rh <= 32) {
    return `${rw}:${rh}`;
  }
  return (w / h).toFixed(2) + ':1';
}
