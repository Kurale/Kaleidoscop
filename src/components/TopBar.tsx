import React from 'react';
import {
  Download,
  PanelRightClose,
  PanelRightOpen,
  Shuffle,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { RESOLUTION_PRESETS } from '../data/presets';
import { RecordingState, ResolutionPreset } from '../types/kaleidoscope';

interface TopBarProps {
  activePreset: ResolutionPreset;
  onSelectPreset: (preset: ResolutionPreset) => void;
  onShake: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onQuickExportPng: () => void;
  onOpenExportTab: () => void;
  recording: RecordingState;
  onStopRecording: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activePreset,
  onSelectPreset,
  onShake,
  soundEnabled,
  onToggleSound,
  sidebarOpen,
  onToggleSidebar,
  onQuickExportPng,
  onOpenExportTab,
  recording,
  onStopRecording,
}) => {
  return (
    <header className="h-14 shrink-0 border-b border-white/[0.08] bg-[#101319] px-4 lg:px-6 flex items-center justify-between gap-4 select-none">
      {/* Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="text-[#D4A853] shrink-0"
        >
          <polygon
            points="12,2 20.66,7 20.66,17 12,22 3.34,17 3.34,7"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <polygon
            points="12,5.5 17.6,8.75 17.6,15.25 12,18.5 6.4,15.25 6.4,8.75"
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity="0.55"
          />
          <circle cx="12" cy="12" r="1.75" fill="currentColor" />
        </svg>
        <span className="font-display text-2xl font-semibold tracking-wide text-[#F4F3EF] whitespace-nowrap">
          Калейдоскоп
        </span>
      </div>

      {/* Center Format Selector */}
      <div className="hidden md:flex items-center gap-3 min-w-0">
        <label htmlFor="topbar-preset-select" className="text-xs text-[#8E95A5] whitespace-nowrap">
          Формат кадра
        </label>
        <select
          id="topbar-preset-select"
          value={activePreset.id}
          onChange={(e) => {
            const found = RESOLUTION_PRESETS.find((p) => p.id === e.target.value);
            if (found) onSelectPreset(found);
          }}
          className="bg-[#171B23] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs font-medium text-[#ECEEF2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853] cursor-pointer"
        >
          <optgroup label="Соцсети">
            {RESOLUTION_PRESETS.filter((p) => p.category === 'social').map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.width}×{p.height})
              </option>
            ))}
          </optgroup>
          <optgroup label="Десктоп">
            {RESOLUTION_PRESETS.filter((p) => p.category === 'desktop').map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.width}×{p.height})
              </option>
            ))}
          </optgroup>
          <optgroup label="Произвольный">
            {RESOLUTION_PRESETS.filter((p) => p.category === 'custom').map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        </select>
        <span className="font-mono-num text-xs text-[#8E95A5] whitespace-nowrap">
          {activePreset.width} × {activePreset.height} · {activePreset.aspectLabel}
        </span>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {recording.isRecording && (
          <button
            type="button"
            onClick={onStopRecording}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#991B1B] hover:bg-[#B91C1C] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="font-mono-num">
              Запись {recording.elapsedSeconds.toFixed(1)}с
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onShake}
          title="Встряхнуть кристаллы"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171B23] hover:bg-[#1F2430] border border-white/[0.08] text-xs font-medium text-[#E5E7EB] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4A853]"
        >
          <Shuffle className="w-3.5 h-3.5 text-[#D4A853]" />
          <span>Встряхнуть</span>
        </button>

        <button
          type="button"
          onClick={onToggleSound}
          title={soundEnabled ? 'Выключить звук' : 'Включить звук оптики'}
          aria-label={soundEnabled ? 'Выключить звук' : 'Включить звук'}
          className="p-2 rounded-lg bg-[#171B23] hover:bg-[#1F2430] border border-white/[0.08] text-[#B8BECB] hover:text-white transition-colors shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4A853]"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-[#D4A853]" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          onClick={onQuickExportPng}
          title="Быстрый снимок PNG"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171B23] hover:bg-[#1F2430] border border-white/[0.08] text-xs font-medium text-[#E5E7EB] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4A853]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>PNG</span>
        </button>

        <button
          type="button"
          onClick={onOpenExportTab}
          className="px-3.5 py-1.5 rounded-lg bg-[#D4A853] hover:bg-[#E2B967] text-[#0B0D11] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-white"
        >
          Экспорт
        </button>

        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Скрыть панель' : 'Открыть панель'}
          aria-label={sidebarOpen ? 'Скрыть панель настроек' : 'Открыть панель настроек'}
          className="p-2 rounded-lg bg-[#171B23] hover:bg-[#1F2430] border border-white/[0.08] text-[#B8BECB] hover:text-white transition-colors shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4A853]"
        >
          {sidebarOpen ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <PanelRightOpen className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
};
