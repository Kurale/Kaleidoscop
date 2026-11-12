import React from 'react';
import {
  Brush,
  Compass,
  Droplets,
  Gem,
  Hand,
  RotateCcw,
  Sparkles,
  Undo2,
} from 'lucide-react';
import {
  ApertureStyle,
  ColorPalette,
  KaleidoscopeMode,
  OpticalConfig,
  SymmetryStyle,
} from '../types/kaleidoscope';

interface OpticsPanelProps {
  config: OpticalConfig;
  palette: ColorPalette;
  onUpdateConfig: (patch: Partial<OpticalConfig>) => void;
  onUndoBrush: () => void;
  onClearBrush: () => void;
}

const MODES: {
  id: KaleidoscopeMode;
  label: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'stained-glass',
    label: 'Витраж',
    desc: 'Самоцветы и грани',
    icon: Gem,
  },
  {
    id: 'nebula',
    label: 'Туманность',
    desc: 'Жидкие потоки',
    icon: Droplets,
  },
  {
    id: 'sacred-geometry',
    label: 'Геометрия',
    desc: 'Орбиты и мандалы',
    icon: Compass,
  },
  {
    id: 'brush',
    label: 'Кисть',
    desc: 'Свободный рисунок',
    icon: Brush,
  },
];

const SEGMENT_OPTIONS = [4, 6, 8, 10, 12, 16, 20, 24];

export const OpticsPanel: React.FC<OpticsPanelProps> = ({
  config,
  palette,
  onUpdateConfig,
  onUndoBrush,
  onClearBrush,
}) => {
  const angleDegrees = Math.round(((config.manualAngle * 180) / Math.PI) % 360);

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-semibold text-[#A0A7B7]">Режим узора</h3>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = config.mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onUpdateConfig({ mode: m.id })}
                className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#1C212D] border-[#D4A853]/70 text-[#F4F3EF]'
                    : 'bg-[#141821] border-white/[0.06] text-[#A0A7B7] hover:border-white/[0.14] hover:text-[#E5E7EB]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={`w-4 h-4 ${
                      active ? 'text-[#D4A853]' : 'text-[#8E95A5]'
                    }`}
                  />
                  <span className="text-xs font-semibold">{m.label}</span>
                </div>
                <span className="text-[11px] text-[#7D8596] leading-tight">
                  {m.desc}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="h-px bg-white/[0.07]" />

      {/* Mirror & Optical Symmetry */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-[#A0A7B7]">
          Зеркальные отражения
        </h3>

        {/* Segments count */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#D1D5DB]">Число зеркал</span>
            <span className="font-mono-num text-[#D4A853]">
              {config.segments} сегм.
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {SEGMENT_OPTIONS.map((seg) => (
              <button
                key={seg}
                type="button"
                onClick={() => onUpdateConfig({ segments: seg })}
                className={`py-1.5 rounded-md font-mono-num text-xs transition-colors cursor-pointer ${
                  config.segments === seg
                    ? 'bg-[#D4A853] text-[#0B0D11] font-semibold'
                    : 'bg-[#141821] text-[#A0A7B7] border border-white/[0.06] hover:text-white'
                }`}
              >
                {seg}
              </button>
            ))}
          </div>
        </div>

        {/* Symmetry Style */}
        <div className="space-y-2">
          <span className="block text-xs text-[#D1D5DB]">Тип симметрии</span>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0D1016] rounded-lg border border-white/[0.06]">
            {(
              [
                { id: 'mirror', label: 'Зеркальная' },
                { id: 'pinwheel', label: 'Вращение' },
              ] as { id: SymmetryStyle; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateConfig({ symmetryStyle: opt.id })}
                className={`py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  config.symmetryStyle === opt.id
                    ? 'bg-[#1E2431] text-white'
                    : 'text-[#8E95A5] hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Aperture Style */}
        <div className="space-y-2">
          <span className="block text-xs text-[#D1D5DB]">Оптическая рамка</span>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0D1016] rounded-lg border border-white/[0.06]">
            {(
              [
                { id: 'full-bleed', label: 'Полный кадр' },
                { id: 'circular', label: 'Круглый окуляр' },
              ] as { id: ApertureStyle; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateConfig({ apertureStyle: opt.id })}
                className={`py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  config.apertureStyle === opt.id
                    ? 'bg-[#1E2431] text-white'
                    : 'text-[#8E95A5] hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Radial Double-Ring Mirror Toggle */}
        <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
          <div>
            <span className="block text-xs font-medium text-[#E5E7EB]">
              Кольцевое отражение
            </span>
            <span className="block text-[11px] text-[#7D8596]">
              Внешний отражённый венец мандалы
            </span>
          </div>
          <input
            type="checkbox"
            checked={config.radialRingMirror}
            onChange={(e) =>
              onUpdateConfig({ radialRingMirror: e.target.checked })
            }
            className="w-4 h-4 accent-[#D4A853] rounded cursor-pointer"
          />
        </label>
      </section>

      <div className="h-px bg-white/[0.07]" />

      {/* Playback & Motion */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-[#A0A7B7]">
          Проигрывание и динамика
        </h3>

        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0D1016] rounded-lg border border-white/[0.06]">
          <button
            type="button"
            onClick={() =>
              onUpdateConfig({ playbackMode: 'auto', isPlaying: true })
            }
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              config.playbackMode === 'auto'
                ? 'bg-[#1E2431] text-white'
                : 'text-[#8E95A5] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4A853]" />
            <span>Авто-режим</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdateConfig({ playbackMode: 'manual' })}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              config.playbackMode === 'manual'
                ? 'bg-[#1E2431] text-white'
                : 'text-[#8E95A5] hover:text-white'
            }`}
          >
            <Hand className="w-3.5 h-3.5 text-[#D4A853]" />
            <span>Ручной</span>
          </button>
        </div>

        {config.playbackMode === 'auto' ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#D1D5DB]">Скорость вращения</span>
              <span className="font-mono-num text-[#B8BECB]">
                {config.rotationSpeed.toFixed(2)}×
              </span>
            </div>
            <input
              type="range"
              min={-2.0}
              max={2.0}
              step={0.05}
              value={config.rotationSpeed}
              onChange={(e) =>
                onUpdateConfig({ rotationSpeed: parseFloat(e.target.value) })
              }
              className="studio-slider"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#D1D5DB]">Угол поворота</span>
              <span className="font-mono-num text-[#B8BECB]">
                {angleDegrees < 0 ? angleDegrees + 360 : angleDegrees}°
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.PI * 2}
              step={0.01}
              value={config.manualAngle}
              onChange={(e) =>
                onUpdateConfig({ manualAngle: parseFloat(e.target.value) })
              }
              className="studio-slider"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#D1D5DB]">Масштаб линзы</span>
            <span className="font-mono-num text-[#B8BECB]">
              {config.zoom.toFixed(2)}×
            </span>
          </div>
          <input
            type="range"
            min={0.6}
            max={2.4}
            step={0.02}
            value={config.zoom}
            onChange={(e) =>
              onUpdateConfig({ zoom: parseFloat(e.target.value) })
            }
            className="studio-slider"
          />
        </div>

        {config.mode !== 'brush' && (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#D1D5DB]">Турбулентность</span>
                <span className="font-mono-num text-[#B8BECB]">
                  {Math.round(config.turbulence * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={config.turbulence}
                onChange={(e) =>
                  onUpdateConfig({ turbulence: parseFloat(e.target.value) })
                }
                className="studio-slider"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#D1D5DB]">Сложность узора</span>
                <span className="font-mono-num text-[#B8BECB]">
                  {Math.round(config.complexity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.35}
                max={1.5}
                step={0.05}
                value={config.complexity}
                onChange={(e) =>
                  onUpdateConfig({ complexity: parseFloat(e.target.value) })
                }
                className="studio-slider"
              />
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#D1D5DB]">Оптическое свечение</span>
            <span className="font-mono-num text-[#B8BECB]">
              {Math.round(config.glowIntensity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={config.glowIntensity}
            onChange={(e) =>
              onUpdateConfig({ glowIntensity: parseFloat(e.target.value) })
            }
            className="studio-slider"
          />
        </div>
      </section>

      {/* Brush Settings when in Brush Mode */}
      {config.mode === 'brush' && (
        <>
          <div className="h-px bg-white/[0.07]" />
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-[#A0A7B7]">
              Параметры кисти
            </h3>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#D1D5DB]">Размер кисти</span>
                <span className="font-mono-num text-[#B8BECB]">
                  {config.brushSize} px
                </span>
              </div>
              <input
                type="range"
                min={4}
                max={48}
                step={1}
                value={config.brushSize}
                onChange={(e) =>
                  onUpdateConfig({ brushSize: parseInt(e.target.value, 10) })
                }
                className="studio-slider"
              />
            </div>

            <div className="space-y-2">
              <span className="block text-xs text-[#D1D5DB]">Цвет штриха</span>
              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ brushColorIndex: -1 })}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                    config.brushColorIndex === -1
                      ? 'bg-[#1E2431] border-[#D4A853] text-white'
                      : 'bg-[#141821] border-white/[0.08] text-[#A0A7B7] hover:text-white'
                  }`}
                >
                  Авто-смена
                </button>
                {palette.colors.map((hex, idx) => (
                  <button
                    key={`${hex}-${idx}`}
                    type="button"
                    aria-label={`Выбрать цвет ${hex}`}
                    onClick={() => onUpdateConfig({ brushColorIndex: idx })}
                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                      config.brushColorIndex === idx
                        ? 'border-white scale-110'
                        : 'border-white/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
              <div>
                <span className="block text-xs font-medium text-[#E5E7EB]">
                  Плавное затухание
                </span>
                <span className="block text-[11px] text-[#7D8596]">
                  Штрихи постепенно растворяются
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.brushFade}
                onChange={(e) =>
                  onUpdateConfig({ brushFade: e.target.checked })
                }
                className="w-4 h-4 accent-[#D4A853] rounded cursor-pointer"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onUndoBrush}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#171B23] hover:bg-[#1F2430] border border-white/[0.08] text-xs font-medium text-[#E5E7EB] cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Отменить</span>
              </button>
              <button
                type="button"
                onClick={onClearBrush}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#171B23] hover:bg-[#1F2430] border border-white/[0.08] text-xs font-medium text-[#E5E7EB] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Очистить</span>
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
