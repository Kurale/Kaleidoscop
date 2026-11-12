import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Aperture, Download, Palette } from 'lucide-react';
import { ExportPanel } from './components/ExportPanel';
import { KaleidoscopeViewport } from './components/KaleidoscopeViewport';
import { OpticsPanel } from './components/OpticsPanel';
import { PalettePanel } from './components/PalettePanel';
import { TopBar } from './components/TopBar';
import {
  BUILTIN_PALETTES,
  loadCustomPalettes,
  saveCustomPalettes,
} from './data/palettes';
import { formatAspectRatio, RESOLUTION_PRESETS } from './data/presets';
import { KaleidoscopeEngine } from './engine/kaleidoscopeEngine';
import {
  ColorPalette,
  OpticalConfig,
  RecordingState,
  ResolutionPreset,
  VideoDurationOption,
} from './types/kaleidoscope';
import {
  detectBestVideoFormat,
  exportCanvasToPng,
  triggerBlobDownload,
} from './utils/exporter';
import { soundFx } from './utils/soundFx';

type InspectorTab = 'optics' | 'palette' | 'export';

const INITIAL_CONFIG: OpticalConfig = {
  mode: 'stained-glass',
  playbackMode: 'auto',
  isPlaying: true,
  segments: 12,
  symmetryStyle: 'mirror',
  radialRingMirror: false,
  apertureStyle: 'full-bleed',
  zoom: 1.0,
  rotationSpeed: 0.45,
  turbulence: 0.9,
  complexity: 1.0,
  glowIntensity: 0.55,
  manualAngle: 0,
  brushSize: 14,
  brushFade: false,
  brushColorIndex: -1,
};

export default function App() {
  const engine = useMemo(() => new KaleidoscopeEngine(), []);

  const [config, setConfig] = useState<OpticalConfig>(INITIAL_CONFIG);
  const [customPalettes, setCustomPalettes] = useState<ColorPalette[]>(() =>
    loadCustomPalettes()
  );
  const [activePalette, setActivePalette] = useState<ColorPalette>(
    BUILTIN_PALETTES[0]
  );

  const [activePreset, setActivePreset] = useState<ResolutionPreset>(
    RESOLUTION_PRESETS.find((p) => p.id === 'desktop-fhd') ??
      RESOLUTION_PRESETS[0]
  );

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 900 : true
  );
  const [activeTab, setActiveTab] = useState<InspectorTab>('optics');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Export & Recording states
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [videoDuration, setVideoDuration] = useState<VideoDurationOption>(10);
  const [videoFps, setVideoFps] = useState<30 | 60>(60);
  const [capVideo1080p, setCapVideo1080p] = useState<boolean>(true);
  const [exportError, setExportError] = useState<string | null>(null);
  const [recording, setRecording] = useState<RecordingState>({
    isRecording: false,
    elapsedSeconds: 0,
    targetSeconds: null,
    mimeType: 'video/webm',
  });

  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  const allPalettes = useMemo(
    () => [...BUILTIN_PALETTES, ...customPalettes],
    [customPalettes]
  );

  const updateConfig = useCallback((patch: Partial<OpticalConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleShake = useCallback(() => {
    engine.shake(1.0);
    soundFx.playShakeChimes();
  }, [engine]);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundFx.enabled = next;
      if (next) {
        soundFx.playShakeChimes();
      }
      return next;
    });
  }, []);

  const handleSaveCustomPalette = useCallback((palette: ColorPalette) => {
    setCustomPalettes((prev) => {
      const filtered = prev.filter((p) => p.id !== palette.id);
      const next = [palette, ...filtered];
      saveCustomPalettes(next);
      return next;
    });
  }, []);

  const handleDeleteCustomPalette = useCallback(
    (id: string) => {
      setCustomPalettes((prev) => {
        const next = prev.filter((p) => p.id !== id);
        saveCustomPalettes(next);
        return next;
      });
      if (activePalette.id === id) {
        setActivePalette(BUILTIN_PALETTES[0]);
      }
    },
    [activePalette.id]
  );

  const handleUpdateActivePalette = useCallback((updated: ColorPalette) => {
    setActivePalette(updated);
    if (updated.isCustom) {
      setCustomPalettes((prev) => {
        const idx = prev.findIndex((p) => p.id === updated.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = updated;
        saveCustomPalettes(next);
        return next;
      });
    }
  }, []);

  const handleUpdateCustomSize = useCallback(
    (width: number, height: number) => {
      setActivePreset({
        id: 'custom-res',
        name: 'Свой формат',
        category: 'custom',
        width,
        height,
        aspectLabel: formatAspectRatio(width, height),
      });
    },
    []
  );

  // PNG Export at exact preset resolution
  const handleExportPng = useCallback(async () => {
    setIsExportingPng(true);
    setExportError(null);
    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = activePreset.width;
      offscreen.height = activePreset.height;
      engine.renderToCanvas(offscreen, config, activePalette);
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 19);
      await exportCanvasToPng(
        offscreen,
        `kaleidoscope-${activePreset.width}x${activePreset.height}-${timestamp}.png`
      );
      soundFx.playShutterClick();
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Ошибка при сохранении PNG'
      );
    } finally {
      setIsExportingPng(false);
    }
  }, [activePreset.width, activePreset.height, engine, config, activePalette]);

  const stopRecording = useCallback(() => {
    if (recordTimerRef.current !== null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    }
  }, []);

  const startRecording = useCallback(() => {
    setExportError(null);
    if (typeof MediaRecorder === 'undefined') {
      setExportError(
        'Ваш браузер не поддерживает запись видео через MediaRecorder.'
      );
      return;
    }

    // Determine target recording dimensions
    let targetW = activePreset.width;
    let targetH = activePreset.height;
    if (capVideo1080p && Math.max(targetW, targetH) > 1920) {
      const ratio = 1920 / Math.max(targetW, targetH);
      targetW = Math.round((targetW * ratio) / 2) * 2;
      targetH = Math.round((targetH * ratio) / 2) * 2;
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = targetW;
    offscreen.height = targetH;
    engine.renderToCanvas(offscreen, config, activePalette);
    exportCanvasRef.current = offscreen;

    const format = detectBestVideoFormat();
    try {
      const stream = offscreen.captureStream(videoFps);
      const recorder = new MediaRecorder(stream, {
        mimeType: format.mimeType,
        videoBitsPerSecond: targetW * targetH > 1500000 ? 14_000_000 : 8_000_000,
      });

      recordedChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        exportCanvasRef.current = null;
        if (recordTimerRef.current !== null) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        const blob = new Blob(recordedChunksRef.current, {
          type: format.mimeType,
        });
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19);
        triggerBlobDownload(
          blob,
          `kaleidoscope-${targetW}x${targetH}-${timestamp}.${format.extension}`
        );
        soundFx.playShutterClick();
        setRecording({
          isRecording: false,
          elapsedSeconds: 0,
          targetSeconds: null,
          mimeType: format.mimeType,
        });
      };

      recorder.onerror = () => {
        exportCanvasRef.current = null;
        setExportError('Произошла ошибка при кодировании видеопотока.');
        setRecording({
          isRecording: false,
          elapsedSeconds: 0,
          targetSeconds: null,
          mimeType: format.mimeType,
        });
      };

      recorderRef.current = recorder;
      recorder.start(250);

      const targetSeconds = videoDuration === 'manual' ? null : videoDuration;
      const startTime = performance.now();

      setRecording({
        isRecording: true,
        elapsedSeconds: 0,
        targetSeconds,
        mimeType: format.mimeType,
      });

      recordTimerRef.current = window.setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        setRecording((prev) => ({ ...prev, elapsedSeconds: elapsed }));
        if (targetSeconds !== null && elapsed >= targetSeconds) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      exportCanvasRef.current = null;
      setExportError(
        err instanceof Error
          ? err.message
          : 'Не удалось запустить запись видео'
      );
    }
  }, [
    activePreset.width,
    activePreset.height,
    capVideo1080p,
    engine,
    config,
    activePalette,
    videoFps,
    videoDuration,
    stopRecording,
  ]);

  // Cleanup recorder on unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current !== null) {
        window.clearInterval(recordTimerRef.current);
      }
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    };
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setConfig((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        handleShake();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (config.mode === 'brush') {
          e.preventDefault();
          engine.undoBrush();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleShake, config.mode, engine]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0B0D11] text-[#F2F2F0]">
      <TopBar
        activePreset={activePreset}
        onSelectPreset={setActivePreset}
        onShake={handleShake}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
        onQuickExportPng={handleExportPng}
        onOpenExportTab={() => {
          setSidebarOpen(true);
          setActiveTab('export');
        }}
        recording={recording}
        onStopRecording={stopRecording}
      />

      <main className="relative flex-1 flex min-h-0 overflow-hidden">
        <KaleidoscopeViewport
          engine={engine}
          config={config}
          palette={activePalette}
          preset={activePreset}
          onUpdateConfig={updateConfig}
          onShake={handleShake}
          exportCanvasRef={exportCanvasRef}
          isRecording={recording.isRecording}
        />

        {sidebarOpen && (
          <aside className="fixed inset-x-0 bottom-0 top-14 z-30 sm:static sm:inset-auto sm:w-[348px] shrink-0 border-l border-white/[0.08] bg-[#11141B] flex flex-col min-h-0">
            {/* Inspector Navigation Tabs */}
            <div className="p-3 border-b border-white/[0.08] shrink-0">
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#0B0D11] rounded-lg border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setActiveTab('optics')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'optics'
                      ? 'bg-[#1D2330] text-[#F4F3EF]'
                      : 'text-[#8E95A5] hover:text-white'
                  }`}
                >
                  <Aperture className="w-3.5 h-3.5 text-[#D4A853]" />
                  <span>Оптика</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('palette')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'palette'
                      ? 'bg-[#1D2330] text-[#F4F3EF]'
                      : 'text-[#8E95A5] hover:text-white'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5 text-[#D4A853]" />
                  <span>Палитра</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('export')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'export'
                      ? 'bg-[#1D2330] text-[#F4F3EF]'
                      : 'text-[#8E95A5] hover:text-white'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-[#D4A853]" />
                  <span>Экспорт</span>
                </button>
              </div>
            </div>

            {/* Scrollable Inspector Content */}
            <div className="flex-1 overflow-y-auto studio-scroll p-4">
              {activeTab === 'optics' && (
                <OpticsPanel
                  config={config}
                  palette={activePalette}
                  onUpdateConfig={updateConfig}
                  onUndoBrush={() => engine.undoBrush()}
                  onClearBrush={() => engine.clearBrush()}
                />
              )}

              {activeTab === 'palette' && (
                <PalettePanel
                  palettes={allPalettes}
                  activePalette={activePalette}
                  onSelectPalette={setActivePalette}
                  onUpdateActivePalette={handleUpdateActivePalette}
                  onSaveCustomPalette={handleSaveCustomPalette}
                  onDeleteCustomPalette={handleDeleteCustomPalette}
                />
              )}

              {activeTab === 'export' && (
                <ExportPanel
                  activePreset={activePreset}
                  onSelectPreset={setActivePreset}
                  onUpdateCustomSize={handleUpdateCustomSize}
                  onExportPng={handleExportPng}
                  isExportingPng={isExportingPng}
                  videoDuration={videoDuration}
                  onChangeVideoDuration={setVideoDuration}
                  videoFps={videoFps}
                  onChangeVideoFps={setVideoFps}
                  capVideo1080p={capVideo1080p}
                  onToggleCapVideo1080p={setCapVideo1080p}
                  recording={recording}
                  onStartRecording={startRecording}
                  onStopRecording={stopRecording}
                  exportError={exportError}
                />
              )}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
