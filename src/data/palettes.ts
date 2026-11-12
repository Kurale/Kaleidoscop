import { ColorPalette } from '../types/kaleidoscope';

export const BUILTIN_PALETTES: ColorPalette[] = [
  {
    id: 'murano-glass',
    name: 'Муранское стекло',
    colors: ['#D4A853', '#C83E4D', '#1E7A8C', '#2B4C7E', '#F3E5C0'],
    background: '#080A0F',
  },
  {
    id: 'aurora-borealis',
    name: 'Северное сияние',
    colors: ['#4AF2C5', '#2AB7CA', '#5A5DE8', '#A663CC', '#E0FBFC'],
    background: '#050814',
  },
  {
    id: 'sapphire-amber',
    name: 'Сапфир и янтарь',
    colors: ['#1D4ED8', '#EAB308', '#38BDF8', '#B45309', '#FEF3C7'],
    background: '#070A12',
  },
  {
    id: 'botanical-emerald',
    name: 'Ботанический витраж',
    colors: ['#10B981', '#84CC16', '#E11D48', '#F59E0B', '#D1FAE5'],
    background: '#060E0A',
  },
  {
    id: 'coral-dusk',
    name: 'Коралловый закат',
    colors: ['#FF5E5B', '#D946EF', '#FB923C', '#FDE047', '#FFE4E6'],
    background: '#11070E',
  },
  {
    id: 'monochrome-optics',
    name: 'Монохромная оптика',
    colors: ['#FFFFFF', '#CBD5E1', '#64748B', '#94A3B8', '#E2E8F0'],
    background: '#050507',
  },
];

const CUSTOM_PALETTES_KEY = 'kaleidoscope_custom_palettes_v1';

export function loadCustomPalettes(): ColorPalette[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PALETTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        Array.isArray(p.colors) &&
        p.colors.length >= 2
    );
  } catch {
    return [];
  }
}

export function saveCustomPalettes(palettes: ColorPalette[]): void {
  try {
    localStorage.setItem(CUSTOM_PALETTES_KEY, JSON.stringify(palettes));
  } catch {
    // Ignore storage quota errors
  }
}
