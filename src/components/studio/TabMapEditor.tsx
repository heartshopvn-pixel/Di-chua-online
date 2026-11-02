import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Crosshair,
  Download,
  Gift,
  ImagePlus,
  Maximize2,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  CustomAssetsConfig,
  GameConfig,
  GridConfig,
  HudLayoutConfig,
  KneelSlot,
} from '../../types/game';
import { FONT_FAMILY_OPTIONS } from '../../config/constants';
import { OfferingModelArt } from '../stage/OfferingModelArt';

interface TabMapEditorProps {
  config: GameConfig;
  vipSlots: KneelSlot[];
  normalSlots: KneelSlot[];
  customAssets: CustomAssetsConfig;
  onUpdateConfig: (patch: Partial<GameConfig>) => void;
  onUpdateGrid: (patch: Partial<GridConfig>) => void;
  onUpdateHudLayout: (patch: Partial<HudLayoutConfig>) => void;
  onUploadAsset: (key: keyof CustomAssetsConfig, file: File) => void;
  onResetAsset: (key: keyof CustomAssetsConfig) => void;
  onSaveBackupJson: () => void;
  onLoadBackupJson: (rawJsonText: string) => { ok: boolean; message: string };
  lotusDonorsCount?: number;
  onClearLotusDonors?: () => void;
}

function buildLightweightConfigForPreview(config: GameConfig): GameConfig {
  return {
    ...config,
    bgmTracks: (config.bgmTracks || []).map((t) =>
      t.url && t.url.startsWith('data:')
        ? { ...t, url: '__KEEP_BROWSER_AUDIO_DATA__' }
        : t
    ),
    bellMp3Url:
      config.bellMp3Url && config.bellMp3Url.startsWith('data:')
        ? '__KEEP_BROWSER_AUDIO_DATA__'
        : config.bellMp3Url,
    woodenFishMp3Url:
      config.woodenFishMp3Url && config.woodenFishMp3Url.startsWith('data:')
        ? '__KEEP_BROWSER_AUDIO_DATA__'
        : config.woodenFishMp3Url,
  };
}

export const TabMapEditor: React.FC<TabMapEditorProps> = React.memo(({
  config,
  vipSlots,
  normalSlots,
  customAssets,
  onUpdateConfig,
  onUpdateGrid,
  onUpdateHudLayout,
  onUploadAsset,
  onResetAsset,
  onSaveBackupJson,
  onLoadBackupJson,
  lotusDonorsCount = 0,
  onClearLotusDonors,
}) => {
  const [copiedJson, setCopiedJson] = useState(false);
  const [pasteJsonText, setPasteJsonText] = useState('');
  const [jsonStatus, setJsonStatus] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const vipSlotCoordsKey = useMemo(
    () => vipSlots.map((s) => `${s.id}:${s.x},${s.y},${s.side}`).join('|'),
    [vipSlots]
  );
  const normalSlotCoordsKey = useMemo(
    () =>
      normalSlots
        .map((s) => `${s.id}:${s.x},${s.y},${s.side},${s.row ?? ''},${s.col ?? ''}`)
        .join('|'),
    [normalSlots]
  );

  const exportJsonString = useMemo(() => {
    const cleanConfig = buildLightweightConfigForPreview(config);
    return JSON.stringify(
      {
        config: cleanConfig,
        incenseBurner: config.incenseBurner,
        offeringTrayPos: config.offeringTrayPos,
        monkZone: config.monkZone,
        redPrayZones: config.redPrayZones,
        hudLayout: config.hudLayout,
        grid: config.grid,
        vipSlots: vipSlots.map((s) => ({ id: s.id, x: s.x, y: s.y, side: s.side })),
        normalSlots: normalSlots.map((s) => ({
          id: s.id,
          x: s.x,
          y: s.y,
          side: s.side,
          row: s.row,
          col: s.col,
        })),
      },
      null,
      2
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, vipSlotCoordsKey, normalSlotCoordsKey]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(exportJsonString);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  const handleLoadJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const res = onLoadBackupJson(reader.result);
        setJsonStatus({ ok: res.ok, text: res.message });
        setTimeout(() => setJsonStatus(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleApplyPastedJson = () => {
    if (!pasteJsonText.trim()) return;
    const res = onLoadBackupJson(pasteJsonText);
    setJsonStatus({ ok: res.ok, text: res.message });
    if (res.ok) setPasteJsonText('');
    setTimeout(() => setJsonStatus(null), 4000);
  };

  const hud = config.hudLayout;

  return (
    <div className="space-y-4">
      {/* 1. Chỉnh Sửa Trực Tiếp Trên Màn Hình */}
      <section className="p-3 rounded-xl bg-stone-900/75 border border-stone-800 space-y-2">
        <h2 className="text-xs font-bold text-stone-200">
          Chỉnh Sửa Trực Tiếp Trên Sân
        </h2>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() =>
              onUpdateHudLayout({ editLayoutMode: !config.hudLayout.editLayoutMode })
            }
            className={`py-2 px-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
              config.hudLayout.editLayoutMode
                ? 'bg-amber-400 text-stone-950'
                : 'bg-stone-950 hover:bg-stone-800 text-stone-200 border border-stone-800'
            }`}
          >
            <Move className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {config.hudLayout.editLayoutMode ? 'Đang sửa Bảng' : 'Sửa Bảng'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdateConfig({ showZoneBounds: !config.showZoneBounds })
            }
            className={`py-2 px-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
              config.showZoneBounds
                ? 'bg-fuchsia-400 text-stone-950'
                : 'bg-stone-950 hover:bg-stone-800 text-stone-200 border border-stone-800'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {config.showZoneBounds ? 'Đang hiện Vùng' : 'Vùng di chuyển'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateConfig({ showWaypoints: !config.showWaypoints })}
            className={`py-2 px-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
              config.showWaypoints
                ? 'bg-emerald-400 text-stone-950'
                : 'bg-stone-950 hover:bg-stone-800 text-stone-200 border border-stone-800'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {config.showWaypoints ? 'Đang hiện Vòng' : 'Vòng vị trí'}
            </span>
          </button>
        </div>
      </section>

      {/* 2. Bảng Hoa Sen (BXH Số Tim / Hoa Sen) */}
      <section className="p-3 rounded-xl bg-stone-900/75 border border-pink-500/35 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold text-pink-200">
              Bảng Hoa Sen ({lotusDonorsCount} phật tử)
            </h2>
          </div>
          {onClearLotusDonors && (
            <button
              type="button"
              onClick={onClearLotusDonors}
              className="px-2 py-1 rounded bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-[10px] font-bold text-rose-200 flex items-center gap-1 cursor-pointer transition shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Làm mới BXH</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {[3, 4, 5, 8, 10].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() =>
                  onUpdateHudLayout({ lotusLeaderboardMaxRanks: preset })
                }
                className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition ${
                  (hud.lotusLeaderboardMaxRanks ?? 5) === preset
                    ? 'bg-pink-400 text-stone-950 font-bold'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                }`}
              >
                Top {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={hud.lotusLeaderboardMaxRanks ?? 5}
              onChange={(e) =>
                onUpdateHudLayout({
                  lotusLeaderboardMaxRanks: Math.max(
                    1,
                    Math.min(20, parseInt(e.target.value, 10) || 5)
                  ),
                })
              }
              className="w-20 accent-pink-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
            />
            <span className="text-[11px] font-mono font-bold text-pink-300 w-12 text-right">
              Top {hud.lotusLeaderboardMaxRanks ?? 5}
            </span>
          </div>
        </div>

        {/* Cỡ chữ Floating Text +Số Hoa Sen khi dâng lễ vật */}
        <div className="pt-1.5 border-t border-stone-800/80 flex items-center justify-between gap-2">
          <span className="text-[11px] text-stone-300 font-medium">
            Size chữ +tim dâng lễ:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onUpdateHudLayout({
                  lotusFloatingScoreFontSize: Math.max(
                    8,
                    (hud.lotusFloatingScoreFontSize ?? 12) - 1
                  ),
                })
              }
              className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center justify-center cursor-pointer"
            >
              -
            </button>
            <input
              type="range"
              min={8}
              max={24}
              step={1}
              value={hud.lotusFloatingScoreFontSize ?? 12}
              onChange={(e) =>
                onUpdateHudLayout({
                  lotusFloatingScoreFontSize: Math.max(
                    8,
                    Math.min(24, parseInt(e.target.value, 10) || 12)
                  ),
                })
              }
              className="w-20 accent-pink-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() =>
                onUpdateHudLayout({
                  lotusFloatingScoreFontSize: Math.min(
                    24,
                    (hud.lotusFloatingScoreFontSize ?? 12) + 1
                  ),
                })
              }
              className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center justify-center cursor-pointer"
            >
              +
            </button>
            <span className="text-[11px] font-mono font-bold text-pink-300 w-9 text-right">
              {hud.lotusFloatingScoreFontSize ?? 12}px
            </span>
          </div>
        </div>
      </section>

      {/* 3. Ẩn / Hiện, Cỡ Chữ, Độ Mờ Nền & Tiêu Đề Các Bảng */}
      <section className="p-3 rounded-xl bg-stone-900/75 border border-stone-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-stone-200">
            Hiển Thị, Cỡ Chữ & Độ Mờ Nền Bảng
          </h2>
          <span className="text-[10px] text-amber-300 font-mono">0% = Mất nền</span>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {(
            [
              {
                visKey: 'showNoticeBoardBox',
                fontKey: 'noticeBoardFontSize',
                opKey: 'noticeBoardOpacity',
                defaultFont: 10,
                defaultOp: config.hudLayout.hudOpacity ?? 0.88,
                label: 'Bảng Thông Báo',
              },
              {
                visKey: 'showGrandEventBox',
                fontKey: 'grandEventFontSize',
                opKey: 'grandEventOpacity',
                defaultFont: 10,
                defaultOp: config.hudLayout.hudOpacity ?? 0.88,
                label: 'Bảng Đại Lễ',
              },
              {
                visKey: 'showLotusLeaderboardBox',
                fontKey: 'lotusLeaderboardFontSize',
                opKey: 'lotusLeaderboardOpacity',
                defaultFont: 10,
                defaultOp: config.hudLayout.hudOpacity ?? 0.88,
                label: 'Bảng Hoa Sen',
              },
              {
                visKey: 'showGuideBox',
                fontKey: 'guideFontSize',
                opKey: 'guideOpacity',
                defaultFont: 9,
                defaultOp: config.hudLayout.hudOpacity ?? 0.88,
                label: 'Bảng Hướng Dẫn',
              },
              {
                visKey: 'showPilgrimCountBox',
                fontKey: 'pilgrimCountFontSize',
                opKey: 'pilgrimCountOpacity',
                defaultFont: 10,
                defaultOp: config.hudLayout.hudOpacity ?? 0.88,
                label: 'Bảng Đếm Phật Tử',
              },
              {
                visKey: 'showToastBox',
                fontKey: 'toastFontSize',
                opKey: 'toastOpacity',
                defaultFont: 10,
                defaultOp: config.hudLayout.hudOpacity ?? 0.88,
                label: 'Thông Báo Trôi',
              },
              {
                visKey: 'showTempleSign',
                fontKey: null,
                opKey: 'templeSignOpacity',
                defaultFont: 10,
                defaultOp: 1,
                label: 'Bảng Tên Chùa (PNG)',
              },
            ] as const
          ).map(({ visKey, fontKey, opKey, defaultFont, defaultOp, label }) => {
            const visible = config.hudLayout[visKey] !== false;
            const currentSize = fontKey
              ? (config.hudLayout[fontKey] ?? defaultFont)
              : defaultFont;
            const curOp =
              typeof config.hudLayout[opKey] === 'number'
                ? (config.hudLayout[opKey] as number)
                : defaultOp;
            const opPercent = Math.round(curOp * 100);

            return (
              <div
                key={visKey}
                className={`px-2.5 py-2 rounded-lg border space-y-1.5 transition ${
                  visible
                    ? 'bg-stone-950/85 border-emerald-500/35'
                    : 'bg-stone-950/40 border-stone-800/80 opacity-65'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateHudLayout({ [visKey]: !visible })}
                    className={`px-2 py-1 rounded-md border text-[10.5px] font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                      visible
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                        : 'bg-stone-900 border-stone-700 text-stone-400'
                    }`}
                  >
                    <span className="text-[9.5px] font-mono px-1 py-0.2 rounded bg-stone-950/80">
                      {visible ? 'HIỆN' : 'ẨN'}
                    </span>
                    <span className="truncate">{label}</span>
                  </button>

                  {fontKey ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-stone-400">Cỡ:</span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateHudLayout({
                            [fontKey]: Math.max(7, currentSize - 1),
                          })
                        }
                        className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 flex items-center justify-center text-stone-200 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="range"
                        min={7}
                        max={24}
                        step={1}
                        value={currentSize}
                        onChange={(e) =>
                          onUpdateHudLayout({
                            [fontKey]: parseInt(e.target.value, 10) || defaultFont,
                          })
                        }
                        className="w-16 accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateHudLayout({
                            [fontKey]: Math.min(24, currentSize + 1),
                          })
                        }
                        className="w-5 h-5 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 flex items-center justify-center text-amber-300 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-right text-[10.5px] font-mono font-bold text-amber-300 tabular-nums">
                        {currentSize}px
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-stone-500 italic">PNG</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800/70">
                  <span className="text-[10px] text-stone-400">Độ mờ nền:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onUpdateHudLayout({ [opKey]: 0 })}
                      className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono cursor-pointer transition ${
                        opPercent === 0
                          ? 'bg-amber-400 text-stone-950 font-bold'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                      }`}
                    >
                      0%
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={curOp}
                      onChange={(e) =>
                        onUpdateHudLayout({
                          [opKey]: parseFloat(e.target.value),
                        })
                      }
                      className="w-24 accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                    />
                    <span className="w-9 text-right text-[10.5px] font-mono font-bold text-amber-300 tabular-nums">
                      {opPercent}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pop-up người mới vào */}
        <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-stone-200">
            Pop-up: Người mới vào
          </span>
          <button
            type="button"
            onClick={() =>
              onUpdateHudLayout({
                showNewPilgrimToast:
                  config.hudLayout.showNewPilgrimToast === false,
              })
            }
            className={`px-2.5 py-1 rounded border text-[10.5px] font-bold cursor-pointer transition shrink-0 ${
              config.hudLayout.showNewPilgrimToast !== false
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-stone-900 border-stone-700 text-stone-400'
            }`}
          >
            {config.hudLayout.showNewPilgrimToast !== false ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
          </button>
        </div>

        {/* Đổi tên tiêu đề các bảng */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="text-[10.5px] text-stone-400 block mb-1">
              Tiêu đề Bảng Đại Lễ:
            </label>
            <input
              type="text"
              value={config.hudLayout.grandEventTitle || 'Sự kiện Đại Lễ'}
              onChange={(e) =>
                onUpdateHudLayout({ grandEventTitle: e.target.value })
              }
              className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-[10.5px] text-stone-400 block mb-1">
              Tiêu đề Đếm Phật tử:
            </label>
            <input
              type="text"
              value={config.hudLayout.pilgrimCountTitle || 'Phật tử'}
              onChange={(e) =>
                onUpdateHudLayout({ pilgrimCountTitle: e.target.value })
              }
              className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-[10.5px] text-stone-400 block mb-1">
              Tiêu đề Bảng Hoa Sen:
            </label>
            <input
              type="text"
              value={config.hudLayout.lotusLeaderboardTitle || 'Bảng Hoa Sen'}
              onChange={(e) =>
                onUpdateHudLayout({ lotusLeaderboardTitle: e.target.value })
              }
              className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-[10.5px] text-stone-400 block mb-1">
              Tiêu đề Bảng Hướng Dẫn:
            </label>
            <input
              type="text"
              value={config.hudLayout.guideTitle}
              onChange={(e) => onUpdateHudLayout({ guideTitle: e.target.value })}
              className="w-full px-2 py-1 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </section>

      {/* 4. Chỗ Ngồi, Nhân Vật & Bong Bóng Chat */}
      <section className="p-3 rounded-xl bg-stone-900/75 border border-stone-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-stone-200">
            Chỗ Ngồi, Nhân Vật & Bong Bóng Chat
          </h2>
          <span className="text-[11px] font-mono font-bold text-emerald-400">
            {vipSlots.length + normalSlots.length} chỗ ({vipSlots.length} VIP + {normalSlots.length} thường)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StepperCard
            label="Hàng ghế thường (Dọc)"
            value={config.grid.rows}
            min={1}
            onChange={(val) => onUpdateGrid({ rows: val })}
          />

          <StepperCard
            label="Ghế ngang / hàng"
            value={config.grid.cols}
            min={1}
            onChange={(val) => onUpdateGrid({ cols: val })}
          />

          <StepperCard
            label="Tổng ghế VIP"
            value={config.grid.vipCount}
            min={0}
            onChange={(val) => onUpdateGrid({ vipCount: val })}
          />

          <StepperCard
            label="Số hàng ghế VIP"
            value={config.grid.vipRows ?? 1}
            min={1}
            onChange={(val) => onUpdateGrid({ vipRows: val })}
          />
        </div>

        <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800">
          <div className="flex justify-between text-[11px] text-stone-300 mb-1">
            <span>Kích thước nhân vật</span>
            <span className="text-amber-300 font-mono tabular-nums font-bold">
              {Math.round((config.characterScale ?? 1) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={1.8}
            step={0.05}
            value={config.characterScale ?? 1}
            onChange={(e) =>
              onUpdateConfig({ characterScale: parseFloat(e.target.value) })
            }
            className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
          />
        </div>

        <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800 space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-stone-200">
              <span className="font-semibold text-amber-200">Thẻ tên</span>
              <span className="text-amber-300 font-mono font-bold">
                {Math.round((config.nameTagScale ?? 1) * 100)}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <select
                value={config.nameTagFontFamily || 'Inter, system-ui, sans-serif'}
                onChange={(e) =>
                  onUpdateConfig({ nameTagFontFamily: e.target.value })
                }
                className="px-2 py-1 rounded bg-stone-900 border border-stone-700 text-[11px] text-stone-200 focus:outline-none"
              >
                {FONT_FAMILY_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <input
                type="range"
                min={0.6}
                max={2.0}
                step={0.05}
                value={config.nameTagScale ?? 1}
                onChange={(e) =>
                  onUpdateConfig({ nameTagScale: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-1 pt-1.5 border-t border-stone-800">
            <div className="flex items-center justify-between text-[11px] text-stone-200">
              <span className="font-semibold text-amber-200">Bong bóng chat</span>
              <span className="text-amber-300 font-mono font-bold">
                {Math.round((config.chatBubbleScale ?? 1) * 100)}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <select
                value={config.chatBubbleFontFamily || 'Inter, system-ui, sans-serif'}
                onChange={(e) =>
                  onUpdateConfig({ chatBubbleFontFamily: e.target.value })
                }
                className="px-2 py-1 rounded bg-stone-900 border border-stone-700 text-[11px] text-stone-200 focus:outline-none"
              >
                {FONT_FAMILY_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <input
                type="range"
                min={0.6}
                max={2.0}
                step={0.05}
                value={config.chatBubbleScale ?? 1}
                onChange={(e) =>
                  onUpdateConfig({ chatBubbleScale: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800">
          <div className="flex justify-between text-[11px] text-stone-300 mb-1">
            <span>Thời gian hiện bong bóng chat</span>
            <span className="text-amber-300 font-mono tabular-nums font-bold">
              {(config.chatBubbleDurationSec ?? 12) >= 60
                ? 'Luôn hiện'
                : `${config.chatBubbleDurationSec ?? 12}s`}
            </span>
          </div>
          <input
            type="range"
            min={2}
            max={60}
            step={1}
            value={config.chatBubbleDurationSec ?? 12}
            onChange={(e) =>
              onUpdateConfig({
                chatBubbleDurationSec: parseInt(e.target.value, 10) || 12,
              })
            }
            className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
          />
        </div>
      </section>

      {/* 5. Model Quà Dâng Lễ */}
      <section className="p-3 rounded-xl bg-stone-900/75 border border-stone-800 space-y-2">
        <h2 className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5 text-amber-400" />
          <span>Model Quà Dâng Lễ</span>
        </h2>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-950 border border-amber-400/50 flex items-center justify-center shrink-0">
              <OfferingModelArt
                type="incense"
                customAssets={customAssets}
                className="w-6 h-6"
              />
            </div>
            <div className="flex-1 min-w-0">
              <AssetUploadRow
                label="Nhang Trầm (Comment)"
                hasCustom={Boolean(customAssets.offeringIncenseUrl)}
                onSelectFile={(f) => onUploadAsset('offeringIncenseUrl', f)}
                onReset={() => onResetAsset('offeringIncenseUrl')}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-950 border border-amber-400/50 flex items-center justify-center shrink-0">
              <OfferingModelArt
                type="rose"
                customAssets={customAssets}
                className="w-6 h-6"
              />
            </div>
            <div className="flex-1 min-w-0">
              <AssetUploadRow
                label="Hoa Sen Hồng (1 Xu)"
                hasCustom={Boolean(customAssets.offeringRoseUrl)}
                onSelectFile={(f) => onUploadAsset('offeringRoseUrl', f)}
                onReset={() => onResetAsset('offeringRoseUrl')}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-950 border border-amber-400/50 flex items-center justify-center shrink-0">
              <OfferingModelArt
                type="lotus"
                customAssets={customAssets}
                className="w-6 h-6"
              />
            </div>
            <div className="flex-1 min-w-0">
              <AssetUploadRow
                label="Hoa Sen Vàng (5 Xu)"
                hasCustom={Boolean(customAssets.offeringLotusUrl)}
                onSelectFile={(f) => onUploadAsset('offeringLotusUrl', f)}
                onReset={() => onResetAsset('offeringLotusUrl')}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-950 border border-amber-400/50 flex items-center justify-center shrink-0">
              <OfferingModelArt
                type="tray"
                customAssets={customAssets}
                className="w-6 h-6"
              />
            </div>
            <div className="flex-1 min-w-0">
              <AssetUploadRow
                label="Mâm Hoa Quả (10+ Xu)"
                hasCustom={Boolean(customAssets.offeringTrayUrl)}
                onSelectFile={(f) => onUploadAsset('offeringTrayUrl', f)}
                onReset={() => onResetAsset('offeringTrayUrl')}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 6. Ảnh PNG & Spritesheet */}
      <section className="p-3 rounded-xl bg-stone-900/75 border border-stone-800 space-y-2">
        <h2 className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Ảnh PNG & Spritesheet</span>
        </h2>

        <div className="space-y-1.5">
          <AssetUploadRow
            label="1. Bảng tên chùa (PNG)"
            hasCustom={Boolean(customAssets.templeSignPngUrl)}
            onSelectFile={(f) => onUploadAsset('templeSignPngUrl', f)}
            onReset={() => onResetAsset('templeSignPngUrl')}
          />

          <AssetUploadRow
            label="2a. Spritesheet Khách Nữ (10 frames)"
            hasCustom={Boolean(customAssets.pilgrimFemaleSpritesheetUrl)}
            onSelectFile={(f) => onUploadAsset('pilgrimFemaleSpritesheetUrl', f)}
            onReset={() => onResetAsset('pilgrimFemaleSpritesheetUrl')}
          />

          <AssetUploadRow
            label="2b. Spritesheet Khách Nam (10 frames)"
            hasCustom={Boolean(customAssets.pilgrimMaleSpritesheetUrl)}
            onSelectFile={(f) => onUploadAsset('pilgrimMaleSpritesheetUrl', f)}
            onReset={() => onResetAsset('pilgrimMaleSpritesheetUrl')}
          />

          <AssetUploadRow
            label="3. Spritesheet Sư Trụ Trì (8 frames)"
            hasCustom={Boolean(customAssets.abbotSpritesheetUrl)}
            onSelectFile={(f) => onUploadAsset('abbotSpritesheetUrl', f)}
            onReset={() => onResetAsset('abbotSpritesheetUrl')}
          />

          <AssetUploadRow
            label="4. Spritesheet Chú Tiểu Lớn (8 frames)"
            hasCustom={Boolean(customAssets.seniorNoviceSpritesheetUrl)}
            onSelectFile={(f) => onUploadAsset('seniorNoviceSpritesheetUrl', f)}
            onReset={() => onResetAsset('seniorNoviceSpritesheetUrl')}
          />

          <AssetUploadRow
            label="5. Spritesheet Chú Tiểu Nhỏ (8 frames)"
            hasCustom={Boolean(customAssets.juniorNoviceSpritesheetUrl)}
            onSelectFile={(f) => onUploadAsset('juniorNoviceSpritesheetUrl', f)}
            onReset={() => onResetAsset('juniorNoviceSpritesheetUrl')}
          />

          <AssetUploadRow
            label="6. Ảnh nền Chánh Điện (9:16)"
            hasCustom={Boolean(customAssets.customBgUrl)}
            onSelectFile={(f) => onUploadAsset('customBgUrl', f)}
            onReset={() => onResetAsset('customBgUrl')}
          />
        </div>
      </section>

      {/* 7. Lưu / Nạp JSON Map */}
      <section className="p-3 rounded-xl bg-stone-900/75 border border-emerald-500/40 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold text-emerald-300">
            Dữ Liệu JSON Cấu Hình
          </h2>
          <button
            type="button"
            onClick={handleCopyJson}
            className="px-2 py-1 rounded-md bg-stone-950 hover:bg-stone-800 border border-stone-700 text-[10.5px] font-semibold text-amber-300 flex items-center gap-1 cursor-pointer shrink-0"
          >
            {copiedJson ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            <span>{copiedJson ? 'Đã chép' : 'Chép chuỗi JSON'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onSaveBackupJson();
              setJsonStatus({
                ok: true,
                text: 'Đã tải xuống file .json!',
              });
              setTimeout(() => setJsonStatus(null), 4000);
            }}
            className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải file .json</span>
          </button>

          <label className="py-1.5 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-cyan-300" />
            <span>Chọn file .json</span>
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleLoadJsonFile}
            />
          </label>
        </div>

        {jsonStatus && (
          <div
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${
              jsonStatus.ok
                ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/80 border border-rose-500/50 text-rose-200'
            }`}
          >
            {jsonStatus.text}
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-1">
          <input
            type="text"
            value={pasteJsonText}
            onChange={(e) => setPasteJsonText(e.target.value)}
            placeholder="Dán chuỗi JSON vào đây..."
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={handleApplyPastedJson}
            disabled={!pasteJsonText.trim()}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-stone-950 text-xs font-bold cursor-pointer transition shrink-0"
          >
            Nạp
          </button>
        </div>
      </section>
    </div>
  );
});

interface StepperCardProps {
  label: string;
  value: number;
  min: number;
  onChange: (nextVal: number) => void;
}

const StepperCard: React.FC<StepperCardProps> = ({
  label,
  value,
  min,
  onChange,
}) => (
  <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800 flex items-center justify-between gap-2">
    <span className="text-[11px] font-bold text-stone-200 truncate">
      {label}
    </span>

    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 flex items-center justify-center text-stone-200 cursor-pointer transition"
      >
        <Minus className="w-3 h-3" />
      </button>

      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => {
          const parsed = parseInt(e.target.value, 10);
          onChange(Number.isNaN(parsed) ? min : Math.max(min, parsed));
        }}
        className="w-10 text-center bg-stone-900 border border-stone-800 rounded py-0.5 text-xs font-mono font-bold text-amber-300 focus:outline-none"
      />

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-6 h-6 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 flex items-center justify-center text-amber-300 cursor-pointer transition"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  </div>
);

interface AssetUploadRowProps {
  label: string;
  hasCustom: boolean;
  onSelectFile: (file: File) => void;
  onReset: () => void;
}

const AssetUploadRow: React.FC<AssetUploadRowProps> = ({
  label,
  hasCustom,
  onSelectFile,
  onReset,
}) => (
  <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800 flex items-center justify-between gap-2">
    <span className="text-[11px] text-stone-200 font-medium truncate">{label}</span>
    <div className="flex items-center gap-1.5 shrink-0">
      <label className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[10.5px] font-semibold text-amber-300 flex items-center gap-1 cursor-pointer transition">
        <ImagePlus className="w-3 h-3" />
        <span>Chọn PNG</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelectFile(file);
          }}
        />
      </label>
      {hasCustom && (
        <button
          type="button"
          onClick={onReset}
          className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  </div>
);
