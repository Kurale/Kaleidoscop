export type KaleidoscopeMode =
  | 'stained-glass'
  | 'nebula'
  | 'sacred-geometry'
  | 'brush';

export type PlaybackMode = 'auto' | 'manual';

export type ApertureStyle = 'full-bleed' | 'circular';

export type SymmetryStyle = 'mirror' | 'pinwheel';

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
  background: string;
  isCustom?: boolean;
}

export type PresetCategory = 'social' | 'desktop' | 'custom';

export interface ResolutionPreset {
  id: string;
  name: string;
  category: PresetCategory;
  width: number;
  height: number;
  aspectLabel: string;
}

export interface OpticalConfig {
  mode: KaleidoscopeMode;
  playbackMode: PlaybackMode;
  isPlaying: boolean;
  segments: number; // Even numbers: 4, 6, 8, 10, 12, 16, 20, 24
  symmetryStyle: SymmetryStyle;
  radialRingMirror: boolean;
  apertureStyle: ApertureStyle;
  zoom: number; // 0.6 to 2.4
  rotationSpeed: number; // -2.0 to 2.0
  turbulence: number; // 0.0 to 2.0
  complexity: number; // 0.3 to 1.5
  glowIntensity: number; // 0.0 to 1.0
  manualAngle: number; // radians
  brushSize: number; // 4 to 48
  brushFade: boolean;
  brushColorIndex: number; // -1 means cycle palette automatically
}

export type VideoDurationOption = 5 | 10 | 15 | 'manual';

export interface RecordingState {
  isRecording: boolean;
  elapsedSeconds: number;
  targetSeconds: number | null;
  mimeType: string;
}
