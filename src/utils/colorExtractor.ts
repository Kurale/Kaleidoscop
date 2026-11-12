import { ColorPalette } from '../types/kaleidoscope';

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => clampByte(c).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [200, 200, 200];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === min) return 0;
  const l = (max + min) / 2;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

/**
 * Extracts a harmonious 5-color palette and dark optical backdrop from an uploaded image.
 */
export async function extractPaletteFromImage(
  file: File,
  colorCount = 5
): Promise<ColorPalette> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Не удалось загрузить изображение'));
      el.src = imageUrl;
    });

    const sampleSize = 72;
    const canvas = document.createElement('canvas');
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Контекст 2D недоступен');
    }

    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
    const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

    const pixels: [number, number, number][] = [];
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 120) continue;
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    if (pixels.length === 0) {
      throw new Error('Изображение не содержит видимых пикселей');
    }

    // K-means clustering with deterministic spread initialization
    const k = Math.min(colorCount + 2, pixels.length);
    const centroids: [number, number, number][] = [];
    const step = Math.max(1, Math.floor(pixels.length / k));
    for (let i = 0; i < k; i++) {
      centroids.push([...pixels[(i * step) % pixels.length]]);
    }

    for (let iter = 0; iter < 10; iter++) {
      const sums: [number, number, number, number][] = Array.from(
        { length: k },
        () => [0, 0, 0, 0]
      );

      for (let p = 0; p < pixels.length; p++) {
        const [r, g, b] = pixels[p];
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let c = 0; c < k; c++) {
          const dr = r - centroids[c][0];
          const dg = g - centroids[c][1];
          const db = b - centroids[c][2];
          const dist = dr * dr + dg * dg + db * db;
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = c;
          }
        }
        sums[bestIdx][0] += r;
        sums[bestIdx][1] += g;
        sums[bestIdx][2] += b;
        sums[bestIdx][3] += 1;
      }

      for (let c = 0; c < k; c++) {
        if (sums[c][3] > 0) {
          centroids[c] = [
            sums[c][0] / sums[c][3],
            sums[c][1] / sums[c][3],
            sums[c][2] / sums[c][3],
          ];
        }
      }
    }

    // Score clusters by vibrancy and distinctness, keep top `colorCount`
    const sorted = [...centroids].sort((a, b) => {
      const scoreA =
        getSaturation(a[0], a[1], a[2]) * 1.4 +
        (getLuminance(a[0], a[1], a[2]) > 35 ? 0.5 : 0);
      const scoreB =
        getSaturation(b[0], b[1], b[2]) * 1.4 +
        (getLuminance(b[0], b[1], b[2]) > 35 ? 0.5 : 0);
      return scoreB - scoreA;
    });

    // Darkest cluster informs a subtle deep optical backdrop
    const darkest = [...centroids].sort(
      (a, b) => getLuminance(a[0], a[1], a[2]) - getLuminance(b[0], b[1], b[2])
    )[0];
    const background = rgbToHex(
      Math.min(22, darkest[0] * 0.2),
      Math.min(22, darkest[1] * 0.2),
      Math.min(28, darkest[2] * 0.25)
    );

    const chosen = sorted.slice(0, colorCount).map((c) => rgbToHex(c[0], c[1], c[2]));
    const baseName = file.name.replace(/\.[^.]+$/, '').slice(0, 26) || 'Из фото';

    return {
      id: `custom-img-${Date.now()}`,
      name: baseName,
      colors: chosen,
      background,
      isCustom: true,
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

/**
 * Parses HEX strings, Coolors URLs, or JSON palette files into a ColorPalette.
 */
export function parsePaletteText(input: string, fallbackName = 'Импорт'): ColorPalette | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const hexes = parsed
          .filter((c): c is string => typeof c === 'string')
          .map((c) => normalizeHex(c))
          .filter((c): c is string => Boolean(c));
        if (hexes.length >= 2) {
          return {
            id: `custom-${Date.now()}`,
            name: fallbackName,
            colors: hexes.slice(0, 8),
            background: '#080A0F',
            isCustom: true,
          };
        }
      } else if (parsed && Array.isArray(parsed.colors)) {
        const hexes = parsed.colors
          .filter((c: unknown): c is string => typeof c === 'string')
          .map((c: string) => normalizeHex(c))
          .filter((c: string | null): c is string => Boolean(c));
        if (hexes.length >= 2) {
          return {
            id: `custom-${Date.now()}`,
            name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : fallbackName,
            colors: hexes.slice(0, 8),
            background: normalizeHex(parsed.background) ?? '#080A0F',
            isCustom: true,
          };
        }
      }
    } catch {
      // Fallback to regex extraction
    }
  }

  // Coolors.co URL format: https://coolors.co/ff595e-ffca3a-8ac926-1982c4-6a4c93
  const coolorsMatch = trimmed.match(/coolors\.co\/(?:palette\/)?([0-9a-fA-F-]{11,})/);
  if (coolorsMatch) {
    const parts = coolorsMatch[1]
      .split('-')
      .map((part) => normalizeHex('#' + part))
      .filter((c): c is string => Boolean(c));
    if (parts.length >= 2) {
      return {
        id: `custom-${Date.now()}`,
        name: fallbackName,
        colors: parts.slice(0, 8),
        background: '#080A0F',
        isCustom: true,
      };
    }
  }

  // Generic hex matches
  const matches = trimmed.match(/#?[0-9a-fA-F]{6}\b|#?[0-9a-fA-F]{3}\b/g);
  if (matches) {
    const unique: string[] = [];
    for (const m of matches) {
      const hex = normalizeHex(m);
      if (hex && !unique.includes(hex)) {
        unique.push(hex);
      }
    }
    if (unique.length >= 2) {
      return {
        id: `custom-${Date.now()}`,
        name: fallbackName,
        colors: unique.slice(0, 8),
        background: '#080A0F',
        isCustom: true,
      };
    }
  }

  return null;
}

export function normalizeHex(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  if (!s.startsWith('#')) s = '#' + s;
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const r = s[1];
    const g = s[2];
    const b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(s)) {
    return s.toUpperCase();
  }
  return null;
}
