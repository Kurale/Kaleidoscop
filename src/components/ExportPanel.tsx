import React, { useMemo } from 'react';
import {
  Camera,
  Check,
  Film,
  Monitor,
  Sliders,
  Smartphone,
  Square,
} from 'lucide-react';
import { formatAspectRatio, RESOLUTION_PRESETS } from '../data/presets';
import {
  RecordingState,
  ResolutionPreset,
  VideoDurationOption,
} from '../types/kaleidoscope';
import { detectBestVideoFormat } from '../utils/exporter';

interface ExportPanelProps {
  activePreset: ResolutionPreset;
  onSelectPreset: (preset: ResolutionPreset) => void;
  onUpdateCustomSize: (width: number, height: number) => void;
  onExportPng: () => void;
  isExportingPng: boolean;
  videoDuration: VideoDurationOption;
  onChangeVideoDuration: (dur: VideoDurationOption) => void;
  videoFps: 30 | 60;
  onChangeVideoFps: (fps: 30 | 60) => void;
  capVideo1080p: boolean;
  onToggleCapVideo1080p: (val: boolean) => void;
  recording: RecordingState;
  onStartRecording: () => void;
  onStopRecording: () => void;
  exportError: string | null;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  activePreset,
  onSelectPreset,
  onUpdateCustomSize,
  onExportPng,
  isExportingPng,
  videoDuration,
  onChangeVideoDuration,
  videoFps,
  onChangeVideoFps,
  capVideo1080p,
  onToggleCapVideo1080p,
  recording,
  onStartRecording,
  onStopRecording,
  exportError,
}) => {
  const bestFormat = useMemo(() => detectBestVideoFormat(), []);

  const socialPresets = RESOLUTION_PRESETS.filter(
    (p) => p.category === 'social'
  );
  const desktopPresets = RESOLUTION_PRESETS.filter(
    (p) => p.category === 'desktop'
  );
  const customPreset = RESOLUTION_PRESETS.find((p) => p.category === 'custom');

  const isLargeVideo =
    activePreset.width > 2000 || activePreset.height > 2000;

  const progressPercent =
    recording.isRecording && recording.targetSeconds
      ? Math.min(100, (recording.elapsedSeconds / recording.targetSeconds) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Social Media Presets */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#A0A7B7]">
          <Smartphone className="w-3.5 h-3.5 text-[#D4A853]" />
          <span>Пресеты для соцсетей</span>
        </div>
        <div className="space-y-1.5">
          {socialPresets.map((p) => {
            const active = activePreset.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={recording.isRecording}
                onClick={() => onSelectPreset(p)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer disabled:opacity-50 ${
                  active
                    ? 'bg-[#1C212D] border-[#D4A853]/70 text-[#F4F3EF]'
                    : 'bg-[#141821] border-white/[0.06] text-[#B8BECB] hover:border-white/[0.14] hover:text-white'
                }`}
              >
                <span className="text-xs font-medium truncate">{p.name}</span>
                <span className="font-mono-num text-[11px] text-[#8E95A5] shrink-0">
                  {p.width}×{p.height} · {p.aspectLabel}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Desktop Presets */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#A0A7B7]">
          <Monitor className="w-3.5 h-3.5 text-[#D4A853]" />
          <span>Пресеты для десктопа</span>
        </div>
        <div className="space-y-1.5">
          {desktopPresets.map((p) => {
            const active = activePreset.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={recording.isRecording}
                onClick={() => onSelectPreset(p)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer disabled:opacity-50 ${
                  active
                    ? 'bg-[#1C212D] border-[#D4A853]/70 text-[#F4F3EF]'
                    : 'bg-[#141821] border-white/[0.06] text-[#B8BECB] hover:border-white/[0.14] hover:text-white'
                }`}
              >
                <span className="text-xs font-medium truncate">{p.name}</span>
                <span className="font-mono-num text-[11px] text-[#8E95A5] shrink-0">
                  {p.width}×{p.height} · {p.aspectLabel}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Custom Resolution */}
      {customPreset && (
        <section className="space-y-2.5">
          <button
            type="button"
            disabled={recording.isRecording}
            onClick={() => onSelectPreset(customPreset)}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer disabled:opacity-50 ${
              activePreset.category === 'custom'
                ? 'bg-[#1C212D] border-[#D4A853]/70 text-[#F4F3EF]'
                : 'bg-[#141821] border-white/[0.06] text-[#B8BECB] hover:border-white/[0.14] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-[#D4A853]" />
              <span className="text-xs font-medium">Своё разрешение</span>
            </div>
            {activePreset.category === 'custom' && (
              <Check className="w-3.5 h-3.5 text-[#D4A853]" />
            )}
          </button>

          {activePreset.category === 'custom' && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="space-y-1">
                <span className="block text-[11px] text-[#8E95A5]">
                  Ширина (px)
                </span>
                <input
                  type="number"
                  min={320}
                  max={4096}
                  step={10}
                  value={activePreset.width}
                  onChange={(e) => {
                    const val = Math.max(
                      320,
                      Math.min(4096, parseInt(e.target.value || '1080', 10))
                    );
                    onUpdateCustomSize(val, activePreset.height);
                  }}
                  className="w-full bg-[#0D1016] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-mono-num text-white focus:outline-none focus:border-[#D4A853]"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-[11px] text-[#8E95A5]">
                  Высота (px)
                </span>
                <input
                  type="number"
                  min={320}
                  max={4096}
                  step={10}
                  value={activePreset.height}
                  onChange={(e) => {
                    const val = Math.max(
                      320,
                      Math.min(4096, parseInt(e.target.value || '1080', 10))
                    );
                    onUpdateCustomSize(activePreset.width, val);
                  }}
                  className="w-full bg-[#0D1016] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-mono-num text-white focus:outline-none focus:border-[#D4A853]"
                />
              </label>
              <div className="col-span-2 text-[11px] font-mono-num text-[#8E95A5]">
                Соотношение сторон:{' '}
                {formatAspectRatio(activePreset.width, activePreset.height)}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="h-px bg-white/[0.07]" />

      {/* Export PNG */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#A0A7B7]">Изображение PNG</span>
          <span className="font-mono-num text-[#8E95A5]">
            {activePreset.width} × {activePreset.height}
          </span>
        </div>
        <button
          type="button"
          disabled={isExportingPng || recording.isRecording}
          onClick={onExportPng}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#1C222E] hover:bg-[#252D3D] border border-white/[0.1] text-xs font-semibold text-[#F4F3EF] transition-colors cursor-pointer disabled:opacity-50"
        >
          <Camera className="w-4 h-4 text-[#D4A853]" />
          <span>
            {isExportingPng ? 'Сохранение PNG...' : 'Скачать кадр в PNG'}
          </span>
        </button>
      </section>

      <div className="h-px bg-white/[0.07]" />

      {/* Export Video */}
      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#A0A7B7]">Видеофайл</span>
          <span className="font-mono-num text-[11px] text-[#8E95A5]">
            {bestFormat.label}
          </span>
        </div>

        {/* Duration options */}
        <div className="space-y-1.5">
          <span className="block text-[11px] text-[#8E95A5]">
            Длительность записи
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                { value: 5, label: '5 с' },
                { value: 10, label: '10 с' },
                { value: 15, label: '15 с' },
                { value: 'manual', label: 'Стоп' },
              ] as { value: VideoDurationOption; label: string }[]
            ).map((d) => (
              <button
                key={String(d.value)}
                type="button"
                disabled={recording.isRecording}
                onClick={() => onChangeVideoDuration(d.value)}
                className={`py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                  videoDuration === d.value
                    ? 'bg-[#D4A853] text-[#0B0D11] font-semibold'
                    : 'bg-[#141821] text-[#A0A7B7] border border-white/[0.06] hover:text-white'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* FPS options */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-[#D1D5DB]">Частота кадров</span>
          <div className="flex items-center gap-1 p-0.5 bg-[#0D1016] rounded-lg border border-white/[0.06]">
            {([30, 60] as const).map((fps) => (
              <button
                key={fps}
                type="button"
                disabled={recording.isRecording}
                onClick={() => onChangeVideoFps(fps)}
                className={`px-2.5 py-1 rounded-md font-mono-num text-xs transition-colors cursor-pointer disabled:opacity-50 ${
                  videoFps === fps
                    ? 'bg-[#1E2431] text-white'
                    : 'text-[#8E95A5] hover:text-white'
                }`}
              >
                {fps} fps
              </button>
            ))}
          </div>
        </div>

        {isLargeVideo && (
          <label className="flex items-start gap-2.5 py-1 cursor-pointer">
            <input
              type="checkbox"
              disabled={recording.isRecording}
              checked={capVideo1080p}
              onChange={(e) => onToggleCapVideo1080p(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#D4A853] rounded cursor-pointer"
            />
            <span className="text-[11px] text-[#9CA3AF] leading-snug">
              Ограничить видео до 1080p для плавной кодировки (PNG остаётся в
              полном {activePreset.width}×{activePreset.height})
            </span>
          </label>
        )}

        {recording.isRecording ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={onStopRecording}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#991B1B] hover:bg-[#B91C1C] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="font-mono-num">
                Остановить ({recording.elapsedSeconds.toFixed(1)}с
                {recording.targetSeconds
                  ? ` / ${recording.targetSeconds}с`
                  : ''}
                )
              </span>
            </button>
            {recording.targetSeconds && (
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#D4A853] transition-[width] duration-150"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onStartRecording}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#D4A853] hover:bg-[#E2B967] text-[#0B0D11] text-xs font-semibold transition-colors cursor-pointer"
          >
            <Film className="w-4 h-4" />
            <span>Записать видео</span>
          </button>
        )}

        {exportError && (
          <p className="text-xs text-[#F87171] leading-relaxed">
            {exportError}
          </p>
        )}
      </section>
    </div>
  );
};
