import React, { useEffect, useRef, useState } from 'react';
import {
  Hand,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  Undo2,
} from 'lucide-react';
import { KaleidoscopeEngine } from '../engine/kaleidoscopeEngine';
import {
  ColorPalette,
  OpticalConfig,
  PlaybackMode,
  ResolutionPreset,
} from '../types/kaleidoscope';

interface KaleidoscopeViewportProps {
  engine: KaleidoscopeEngine;
  config: OpticalConfig;
  palette: ColorPalette;
  preset: ResolutionPreset;
  onUpdateConfig: (patch: Partial<OpticalConfig>) => void;
  onShake: () => void;
  exportCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  isRecording: boolean;
}

const SEGMENT_STEPS = [4, 6, 8, 10, 12, 16, 20, 24];

export const KaleidoscopeViewport: React.FC<KaleidoscopeViewportProps> = ({
  engine,
  config,
  palette,
  preset,
  onUpdateConfig,
  onShake,
  exportCanvasRef,
  isRecording,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [frameBox, setFrameBox] = useState({ width: 640, height: 640 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs to keep the 60fps loop completely isolated from React re-renders
  const configRef = useRef(config);
  const paletteRef = useRef(palette);
  configRef.current = config;
  paletteRef.current = palette;

  const isDraggingRef = useRef(false);
  const isDrawingRef = useRef(false);
  const lastAngleRef = useRef(0);

  // Compute exact fitted aspect-ratio container inside the studio stage
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const recompute = () => {
      const rect = el.getBoundingClientRect();
      const padX = 32;
      const padY = 88; // Leave room for bottom floating transport bar
      const availW = Math.max(240, rect.width - padX);
      const availH = Math.max(240, rect.height - padY);

      const targetAspect = preset.width / Math.max(1, preset.height);
      let w = availW;
      let h = w / targetAspect;
      if (h > availH) {
        h = availH;
        w = h * targetAspect;
      }

      setFrameBox({
        width: Math.max(180, Math.floor(w)),
        height: Math.max(180, Math.floor(h)),
      });
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [preset.width, preset.height]);

  // Sync canvas backing resolution to frameBox with DPR cap for crisp 60fps preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const backingW = Math.max(200, Math.round(frameBox.width * dpr));
    const backingH = Math.max(200, Math.round(frameBox.height * dpr));
    if (canvas.width !== backingW || canvas.height !== backingH) {
      canvas.width = backingW;
      canvas.height = backingH;
    }
  }, [frameBox.width, frameBox.height]);

  // Isolated 60fps animation loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      const curConfig = configRef.current;
      const curPalette = paletteRef.current;

      engine.step(rawDt, curConfig);

      const previewCanvas = canvasRef.current;
      if (previewCanvas) {
        engine.renderToCanvas(previewCanvas, curConfig, curPalette);
      }

      const expCanvas = exportCanvasRef.current;
      if (expCanvas) {
        engine.renderToCanvas(expCanvas, curConfig, curPalette);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [engine, exportCanvasRef]);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Pointer helpers
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, cx: 0, cy: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y, cx: canvas.width / 2, cy: canvas.height / 2 };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const { x, y, cx, cy } = getCanvasCoords(e);

    if (config.mode === 'brush' && e.button === 0 && !e.shiftKey) {
      isDrawingRef.current = true;
      engine.beginBrushStroke(x, y, canvas.width, canvas.height, config, palette);
      return;
    }

    isDraggingRef.current = true;
    lastAngleRef.current = Math.atan2(y - cy, x - cx);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y, cx, cy } = getCanvasCoords(e);

    // Subtle attraction influence in non-brush modes
    const nx = (x - cx) / Math.max(1, cx);
    const ny = (y - cy) / Math.max(1, cy);
    engine.setPointerInfluence(nx, ny, true);

    if (isDrawingRef.current && config.mode === 'brush') {
      engine.continueBrushStroke(x, y, canvas.width, canvas.height, config, palette);
      return;
    }

    if (isDraggingRef.current) {
      const curAngle = Math.atan2(y - cy, x - cx);
      let delta = curAngle - lastAngleRef.current;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      lastAngleRef.current = curAngle;

      if (config.playbackMode === 'manual') {
        engine.addManualAngularImpulse(delta);
      } else {
        engine.addManualAngularImpulse(delta * 0.85);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    if (isDrawingRef.current) {
      engine.endBrushStroke();
    }
    isDrawingRef.current = false;
    isDraggingRef.current = false;
  };

  const handlePointerLeave = () => {
    engine.setPointerInfluence(0, 0, false);
    if (isDrawingRef.current) {
      engine.endBrushStroke();
    }
    isDrawingRef.current = false;
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const step = -Math.sign(e.deltaY) * 0.08;
    const nextZoom = Math.max(0.6, Math.min(2.4, Number((config.zoom + step).toFixed(2))));
    onUpdateConfig({ zoom: nextZoom });
  };

  const cycleSegments = (dir: -1 | 1) => {
    const idx = SEGMENT_STEPS.indexOf(config.segments);
    const cur = idx === -1 ? 3 : idx;
    const nextIdx = Math.max(0, Math.min(SEGMENT_STEPS.length - 1, cur + dir));
    onUpdateConfig({ segments: SEGMENT_STEPS[nextIdx] });
  };

  const setPlaybackMode = (mode: PlaybackMode) => {
    onUpdateConfig({
      playbackMode: mode,
      isPlaying: mode === 'auto' ? true : config.isPlaying,
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-w-0 min-h-0 flex flex-col items-center justify-center bg-[#0B0D11] overflow-hidden select-none"
    >
      {/* Subtle studio optical framing box matching exact preset aspect ratio */}
      <div
        className="relative flex items-center justify-center shadow-[0_24px_80px_rgba(0,0,0,0.75)] rounded-sm overflow-hidden border border-white/[0.08] mb-12"
        style={{
          width: `${frameBox.width}px`,
          height: `${frameBox.height}px`,
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onWheel={handleWheel}
          className={`w-full h-full block touch-none ${
            config.mode === 'brush' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
          }`}
        />

        {/* Quiet corner caption with preset resolution & hint */}
        <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2 text-[11px] font-mono-num text-white/60 bg-black/50 px-2 py-0.5 rounded">
          <span>
            {preset.width}×{preset.height}
          </span>
          <span aria-hidden="true">·</span>
          <span>{preset.aspectLabel}</span>
          {isRecording && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#F87171] font-semibold">REC</span>
            </>
          )}
        </div>

        {/* Interactive hint for brush / manual mode */}
        <div className="pointer-events-none absolute bottom-2.5 right-3 text-[11px] text-white/45">
          {config.mode === 'brush'
            ? 'Рисуйте по холсту · Shift + перетаскивание для поворота'
            : 'Перетаскивайте для вращения · Колёсико для масштаба'}
        </div>
      </div>

      {/* Sleek Bottom Studio Transport Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#131720] border border-white/[0.1] shadow-2xl max-w-[95vw] overflow-x-auto">
        {/* Play / Pause */}
        <button
          type="button"
          onClick={() => onUpdateConfig({ isPlaying: !config.isPlaying })}
          title={config.isPlaying ? 'Пауза' : 'Воспроизвести'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4A853] hover:bg-[#E2B967] text-[#0B0D11] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {config.isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Пауза</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Пуск</span>
            </>
          )}
        </button>

        {/* Auto / Manual Segmented Toggle */}
        <div className="flex items-center bg-[#0B0D11] p-0.5 rounded-lg border border-white/[0.06] shrink-0">
          <button
            type="button"
            onClick={() => setPlaybackMode('auto')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              config.playbackMode === 'auto'
                ? 'bg-[#202634] text-[#F4F3EF]'
                : 'text-[#8E95A5] hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3 text-[#D4A853]" />
            <span>Авто</span>
          </button>
          <button
            type="button"
            onClick={() => setPlaybackMode('manual')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              config.playbackMode === 'manual'
                ? 'bg-[#202634] text-[#F4F3EF]'
                : 'text-[#8E95A5] hover:text-white'
            }`}
          >
            <Hand className="w-3 h-3 text-[#D4A853]" />
            <span>Ручной</span>
          </button>
        </div>

        <div className="h-4 w-px bg-white/[0.08] mx-0.5 shrink-0" />

        {/* Mirror Count Stepper */}
        <div className="flex items-center gap-1 px-1.5 shrink-0">
          <button
            type="button"
            onClick={() => cycleSegments(-1)}
            disabled={config.segments <= SEGMENT_STEPS[0]}
            aria-label="Уменьшить число зеркал"
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-semibold text-[#B8BECB] hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
          >
            −
          </button>
          <span className="font-mono-num text-xs text-[#E5E7EB] min-w-[54px] text-center whitespace-nowrap">
            {config.segments} зерк.
          </span>
          <button
            type="button"
            onClick={() => cycleSegments(1)}
            disabled={config.segments >= SEGMENT_STEPS[SEGMENT_STEPS.length - 1]}
            aria-label="Увеличить число зеркал"
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-semibold text-[#B8BECB] hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
          >
            +
          </button>
        </div>

        <div className="h-4 w-px bg-white/[0.08] mx-0.5 shrink-0" />

        {config.mode === 'brush' ? (
          <>
            <button
              type="button"
              onClick={() => engine.undoBrush()}
              title="Отменить штрих"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#D1D5DB] hover:text-white hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Отмена</span>
            </button>
            <button
              type="button"
              onClick={() => engine.clearBrush()}
              title="Очистить холст"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#D1D5DB] hover:text-white hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Очистить</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onShake}
            title="Встряхнуть узор"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#D1D5DB] hover:text-white hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#D4A853]" />
            <span className="hidden sm:inline">Встряхнуть</span>
          </button>
        )}

        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'}
          aria-label="Полноэкранный режим"
          className="p-1.5 rounded-lg text-[#B8BECB] hover:text-white hover:bg-white/[0.06] transition-colors shrink-0 cursor-pointer"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
