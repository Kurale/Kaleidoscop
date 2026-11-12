import React, { useRef, useState } from 'react';
import {
  BookmarkPlus,
  Download,
  FileCode2,
  ImagePlus,
  Plus,
  Shuffle,
  Trash2,
} from 'lucide-react';
import { ColorPalette } from '../types/kaleidoscope';
import {
  extractPaletteFromImage,
  parsePaletteText,
} from '../utils/colorExtractor';
import { triggerBlobDownload } from '../utils/exporter';

interface PalettePanelProps {
  palettes: ColorPalette[];
  activePalette: ColorPalette;
  onSelectPalette: (palette: ColorPalette) => void;
  onUpdateActivePalette: (palette: ColorPalette) => void;
  onSaveCustomPalette: (palette: ColorPalette) => void;
  onDeleteCustomPalette: (id: string) => void;
}

export const PalettePanel: React.FC<PalettePanelProps> = ({
  palettes,
  activePalette,
  onSelectPalette,
  onUpdateActivePalette,
  onSaveCustomPalette,
  onDeleteCustomPalette,
}) => {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [hexInput, setHexInput] = useState('');
  const [customName, setCustomName] = useState('');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'ok' | 'error';
    text: string;
  } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsExtracting(true);
    setStatusMessage(null);
    try {
      const extracted = await extractPaletteFromImage(file, 5);
      onSaveCustomPalette(extracted);
      onSelectPalette(extracted);
      setStatusMessage({
        type: 'ok',
        text: `Палитра «${extracted.name}» извлечена из изображения`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Не удалось извлечь цвета из изображения',
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePaletteFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setStatusMessage(null);
    try {
      const text = await file.text();
      const baseName = file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Файл';
      const parsed = parsePaletteText(text, baseName);
      if (!parsed) {
        setStatusMessage({
          type: 'error',
          text: 'Файл не содержит минимум 2 корректных HEX-цвета',
        });
        return;
      }
      onSaveCustomPalette(parsed);
      onSelectPalette(parsed);
      setStatusMessage({
        type: 'ok',
        text: `Загружена палитра «${parsed.name}»`,
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Ошибка чтения файла палитры',
      });
    }
  };

  const handleParseHexInput = () => {
    const parsed = parsePaletteText(
      hexInput,
      customName.trim() || 'Пользовательская'
    );
    if (!parsed) {
      setStatusMessage({
        type: 'error',
        text: 'Введите минимум 2 HEX-цвета (например #D4A853, #1E7A8C) или ссылку Coolors',
      });
      return;
    }
    onSaveCustomPalette(parsed);
    onSelectPalette(parsed);
    setHexInput('');
    setCustomName('');
    setStatusMessage({
      type: 'ok',
      text: `Палитра «${parsed.name}» добавлена`,
    });
  };

  const updateColorAt = (index: number, hex: string) => {
    const nextColors = [...activePalette.colors];
    nextColors[index] = hex.toUpperCase();
    onUpdateActivePalette({ ...activePalette, colors: nextColors });
  };

  const addColorSwatch = () => {
    if (activePalette.colors.length >= 8) return;
    const randomHex =
      '#' +
      Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, '0')
        .toUpperCase();
    onUpdateActivePalette({
      ...activePalette,
      colors: [...activePalette.colors, randomHex],
    });
  };

  const removeColorAt = (index: number) => {
    if (activePalette.colors.length <= 2) return;
    const nextColors = activePalette.colors.filter((_, i) => i !== index);
    onUpdateActivePalette({ ...activePalette, colors: nextColors });
  };

  const shuffleColors = () => {
    const next = [...activePalette.colors];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    onUpdateActivePalette({ ...activePalette, colors: next });
  };

  const saveCurrentAsNew = () => {
    const name =
      customName.trim() || `${activePalette.name} (копия)`.slice(0, 28);
    const saved: ColorPalette = {
      id: `custom-${Date.now()}`,
      name,
      colors: [...activePalette.colors],
      background: activePalette.background,
      isCustom: true,
    };
    onSaveCustomPalette(saved);
    onSelectPalette(saved);
    setCustomName('');
    setStatusMessage({
      type: 'ok',
      text: `Сохранена в коллекцию: «${saved.name}»`,
    });
  };

  const exportPaletteJson = () => {
    const payload = JSON.stringify(
      {
        name: activePalette.name,
        background: activePalette.background,
        colors: activePalette.colors,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    triggerBlobDownload(blob, `${activePalette.id}.json`);
  };

  return (
    <div className="space-y-6">
      {/* Preset & Custom Palettes List */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[#A0A7B7]">
            Коллекция палитр
          </h3>
          <span className="font-mono-num text-[11px] text-[#7D8596]">
            {palettes.length} шт.
          </span>
        </div>

        <div className="space-y-1.5">
          {palettes.map((pal) => {
            const isActive = pal.id === activePalette.id;
            return (
              <div
                key={pal.id}
                className={`group flex items-center justify-between gap-2 p-2 rounded-lg border transition-colors ${
                  isActive
                    ? 'bg-[#1C212D] border-[#D4A853]/70'
                    : 'bg-[#141821] border-white/[0.06] hover:border-white/[0.14]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectPalette(pal)}
                  className="flex-1 flex items-center justify-between gap-2 min-w-0 text-left cursor-pointer"
                >
                  <span className="text-xs font-medium text-[#E5E7EB] truncate">
                    {pal.name}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {pal.colors.slice(0, 6).map((hex, i) => (
                      <span
                        key={`${pal.id}-${i}`}
                        className="w-3.5 h-5 first:rounded-l-sm last:rounded-r-sm"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </button>
                {pal.isCustom && (
                  <button
                    type="button"
                    onClick={() => onDeleteCustomPalette(pal.id)}
                    title="Удалить палитру"
                    aria-label={`Удалить палитру ${pal.name}`}
                    className="p-1 rounded text-[#7D8596] hover:text-[#F87171] transition-colors shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="h-px bg-white/[0.07]" />

      {/* Active Swatch Editor */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[#A0A7B7]">
            Редактор цветов
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={shuffleColors}
              title="Перемешать порядок цветов"
              className="p-1.5 rounded-md bg-[#171B23] hover:bg-[#1F2430] border border-white/[0.06] text-[#B8BECB] hover:text-white cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={exportPaletteJson}
              title="Скачать палитру JSON"
              className="p-1.5 rounded-md bg-[#171B23] hover:bg-[#1F2430] border border-white/[0.06] text-[#B8BECB] hover:text-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Swatches grid */}
        <div className="flex items-center flex-wrap gap-2">
          {activePalette.colors.map((hex, idx) => (
            <div key={idx} className="relative group">
              <label className="block w-9 h-9 rounded-lg border border-white/20 overflow-hidden cursor-pointer shadow-sm">
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => updateColorAt(idx, e.target.value)}
                  className="opacity-0 w-full h-full cursor-pointer"
                  aria-label={`Цвет ${idx + 1}: ${hex}`}
                />
                <span
                  className="pointer-events-none block w-full h-full -mt-9"
                  style={{ backgroundColor: hex }}
                />
              </label>
              {activePalette.colors.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeColorAt(idx)}
                  aria-label="Удалить цвет"
                  className="opacity-0 group-hover:opacity-100 absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#11141B] border border-white/20 text-[10px] text-white flex items-center justify-center transition-opacity cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {activePalette.colors.length < 8 && (
            <button
              type="button"
              onClick={addColorSwatch}
              title="Добавить цвет"
              aria-label="Добавить цвет"
              className="w-9 h-9 rounded-lg border border-dashed border-white/20 hover:border-[#D4A853] flex items-center justify-center text-[#8E95A5] hover:text-[#D4A853] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Backdrop Color + Save */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2.5 text-xs text-[#D1D5DB] cursor-pointer">
            <span className="relative block w-6 h-6 rounded border border-white/20 overflow-hidden">
              <input
                type="color"
                value={activePalette.background}
                onChange={(e) =>
                  onUpdateActivePalette({
                    ...activePalette,
                    background: e.target.value.toUpperCase(),
                  })
                }
                className="opacity-0 w-full h-full cursor-pointer"
              />
              <span
                className="pointer-events-none block w-full h-full -mt-6"
                style={{ backgroundColor: activePalette.background }}
              />
            </span>
            <span>Фон камеры</span>
          </label>

          <button
            type="button"
            onClick={saveCurrentAsNew}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#171B23] hover:bg-[#1F2430] border border-white/[0.08] text-xs font-medium text-[#E5E7EB] cursor-pointer"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-[#D4A853]" />
            <span>Сохранить</span>
          </button>
        </div>
      </section>

      <div className="h-px bg-white/[0.07]" />

      {/* Load Custom Palettes */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-[#A0A7B7]">
          Загрузить свою палитру
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isExtracting}
            onClick={() => imageInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg bg-[#141821] hover:bg-[#1C212D] border border-white/[0.08] hover:border-[#D4A853]/60 text-xs font-medium text-[#E5E7EB] transition-colors cursor-pointer disabled:opacity-50"
          >
            <ImagePlus className="w-4 h-4 text-[#D4A853]" />
            <span>{isExtracting ? 'Анализ...' : 'Из фото'}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg bg-[#141821] hover:bg-[#1C212D] border border-white/[0.08] hover:border-[#D4A853]/60 text-xs font-medium text-[#E5E7EB] transition-colors cursor-pointer"
          >
            <FileCode2 className="w-4 h-4 text-[#D4A853]" />
            <span>JSON / HEX файл</span>
          </button>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleImageUpload}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.txt,.hex,.css"
          onChange={handlePaletteFileUpload}
          className="hidden"
        />

        {/* Paste HEX or Coolors URL */}
        <div className="space-y-2 pt-1">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Название палитры (необязательно)"
            className="w-full bg-[#0D1016] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-[#F2F2F0] placeholder:text-[#6B7280] focus:outline-none focus:border-[#D4A853]"
          />
          <textarea
            rows={2}
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            placeholder="Вставьте HEX-коды (#D4A853, #1E7A8C...) или ссылку Coolors.co"
            className="w-full bg-[#0D1016] border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono-num text-[#F2F2F0] placeholder:text-[#6B7280] placeholder:font-sans focus:outline-none focus:border-[#D4A853] resize-none"
          />
          <button
            type="button"
            onClick={handleParseHexInput}
            disabled={!hexInput.trim()}
            className="w-full py-2 px-3 rounded-lg bg-[#1F2533] hover:bg-[#272F40] disabled:opacity-40 text-xs font-semibold text-[#F4F3EF] transition-colors cursor-pointer"
          >
            Применить HEX-палитру
          </button>
        </div>

        {statusMessage && (
          <p
            className={`text-xs leading-relaxed ${
              statusMessage.type === 'ok'
                ? 'text-[#34D399]'
                : 'text-[#F87171]'
            }`}
          >
            {statusMessage.text}
          </p>
        )}
      </section>
    </div>
  );
};
