import React, { useState } from 'react';
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
}

export const TabMapEditor: React.FC<TabMapEditorProps> = ({
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
}) => {
  const [copiedJson, setCopiedJson] = useState(false);
  const [pasteJsonText, setPasteJsonText] = useState('');
  const [jsonStatus, setJsonStatus] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const exportJsonString = JSON.stringify(
    {
      config,
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

  return (
    <div className="space-y-5">
      {/* Section 1: Drag/Resize HUD Boards, Edit Zone Edges & Toggle Position Circles */}
      <section className="space-y-2.5">
        <h2 className="text-xs font-semibold text-stone-200">
          Chỉnh sửa trực tiếp trên màn hình chính (Kéo Bảng, Cạnh Vùng & Vòng Tròn Vị Trí)
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
                : 'bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800'
            }`}
          >
            <Move className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {config.hudLayout.editLayoutMode ? 'Đang sửa 6 Bảng' : 'Sửa 6 Bảng & Cỡ'}
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
                : 'bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800'
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
                : 'bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {config.showWaypoints ? 'Đang hiện Vòng' : 'Vòng tròn vị trí'}
            </span>
          </button>
        </div>

        <div className="p-2 rounded-lg bg-stone-900/50 border border-stone-800/80 text-[10.5px] text-stone-400 space-y-1">
          <p>
            • <strong>Sửa 6 Bảng & Cỡ:</strong> Kéo thân bảng để đổi vị trí, bấm kéo <strong>4 góc xanh</strong> của bảng để chỉnh kích thước.
          </p>
          <p>
            • <strong>Vùng di chuyển:</strong> Bấm trực tiếp vào <strong>4 cạnh của hình chữ nhật</strong> (Trụ trì hoặc 2 vùng đỏ) để kéo rộng/hẹp vùng.
          </p>
          <p>
            • <strong>Vòng tròn vị trí (Hỗ trợ chọn nhiều ghế):</strong> Khi bật Vòng tròn vị trí, bạn có thể <strong>kéo chuột trên nền sân để quét chọn 1 vùng nhiều ghế cùng lúc</strong> (hoặc giữ <strong>Shift + Click</strong> từng ghế), sau đó nắm kéo 1 ghế bất kỳ trong nhóm để <strong>di chuyển cả cụm ghế</strong> cùng nhau!
          </p>
        </div>
      </section>

      <hr className="border-stone-800/80" />

      {/* Section 2: Căn chỉnh chỗ ngồi bái lạy, Size nhân vật chung & Thời gian bong bóng chat */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-stone-200">
            Căn chỉnh chỗ ngồi bái lạy & Ghế VIP (Tăng giảm không giới hạn)
          </h2>
          <span className="text-[11px] font-mono font-bold text-emerald-400">
            Tổng: {vipSlots.length + normalSlots.length} chỗ ({vipSlots.length} VIP +{' '}
            {normalSlots.length} thường)
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {/* Số chỗ ngồi dọc (Số hàng) */}
          <StepperCard
            label="Số chỗ ngồi dọc (Hàng)"
            subLabel="Chèn khít nếu tăng dày"
            value={config.grid.rows}
            min={1}
            onChange={(val) => onUpdateGrid({ rows: val })}
          />

          {/* Số chỗ ngồi ngang (Mỗi hàng) */}
          <StepperCard
            label="Số chỗ ngồi ngang / hàng"
            subLabel="Chia đều 2 khu vực đỏ"
            value={config.grid.cols}
            min={1}
            onChange={(val) => onUpdateGrid({ cols: val })}
          />

          {/* Số ghế VIP */}
          <StepperCard
            label="Số ghế VIP"
            subLabel="Hàng Thượng Điện"
            value={config.grid.vipCount}
            min={0}
            onChange={(val) => onUpdateGrid({ vipCount: val })}
          />
        </div>

        {/* Kích thước nhân vật chung (Tất cả Phật tử + Chư Tăng) */}
        <div className="p-2.5 rounded-lg bg-stone-900/60 border border-stone-800">
          <div className="flex justify-between text-[11px] text-stone-300 mb-1">
            <span>Kích thước nhân vật (Chung cho tất cả Phật tử & Chư Tăng)</span>
            <span className="text-amber-300 font-mono tabular-nums font-bold">
              {Math.round((config.characterScale ?? 1) * 100)}% ({(config.characterScale ?? 1).toFixed(2)}x)
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

        {/* Thẻ điều chỉnh Font tên & Kích thước thẻ tên / Font bong bóng chat & Kích thước bong bóng chat */}
        <div className="p-2.5 rounded-lg bg-stone-900/75 border border-amber-500/35 space-y-2.5">
          <div className="text-[11px] font-bold text-amber-300">
            Font chữ & Kích thước: Thẻ Tên & Bong Bóng Chat
          </div>

          {/* 1. Thẻ Tên Nhân Vật */}
          <div className="p-2 rounded-lg bg-stone-950/75 border border-stone-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-stone-200">
              <span className="font-semibold text-amber-200">1. Thẻ tên dưới chân nhân vật</span>
              <span className="text-amber-300 font-mono font-bold">
                {Math.round((config.nameTagScale ?? 1) * 100)}% ({(config.nameTagScale ?? 1).toFixed(2)}x)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 items-center">
              <select
                value={config.nameTagFontFamily || 'Inter, system-ui, sans-serif'}
                onChange={(e) =>
                  onUpdateConfig({ nameTagFontFamily: e.target.value })
                }
                className="px-2 py-1 rounded bg-stone-900 border border-stone-700 text-[11px] text-stone-200 focus:outline-none focus:border-amber-500"
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

          {/* 2. Bong Bóng Chat / Lời Cầu Nguyện */}
          <div className="p-2 rounded-lg bg-stone-950/75 border border-stone-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-stone-200">
              <span className="font-semibold text-amber-200">2. Bong bóng chat trên đầu</span>
              <span className="text-amber-300 font-mono font-bold">
                {Math.round((config.chatBubbleScale ?? 1) * 100)}% ({(config.chatBubbleScale ?? 1).toFixed(2)}x)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 items-center">
              <select
                value={config.chatBubbleFontFamily || 'Inter, system-ui, sans-serif'}
                onChange={(e) =>
                  onUpdateConfig({ chatBubbleFontFamily: e.target.value })
                }
                className="px-2 py-1 rounded bg-stone-900 border border-stone-700 text-[11px] text-stone-200 focus:outline-none focus:border-amber-500"
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

        {/* Thời gian tồn tại bong bóng chat */}
        <div className="p-2.5 rounded-lg bg-stone-900/60 border border-stone-800">
          <div className="flex justify-between text-[11px] text-stone-300 mb-1">
            <span>Thời gian tồn tại bong bóng chat / lời cầu nguyện</span>
            <span className="text-amber-300 font-mono tabular-nums font-bold">
              {(config.chatBubbleDurationSec ?? 12) >= 60
                ? 'Luôn hiện'
                : `${config.chatBubbleDurationSec ?? 12} giây`}
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
          <div className="text-[10px] text-stone-400 mt-1">
            Kéo lên 60s nếu muốn bong bóng chat hiển thị suốt thời gian nhân vật ở trong chùa.
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-stone-900/60 border border-stone-800">
          <div className="flex justify-between text-[11px] text-stone-300 mb-1">
            <span>
              Thời gian ngồi tọa tới khi rời đi (Người thật & NPC, tối thiểu 3s)
            </span>
            <span className="text-amber-300 font-mono tabular-nums font-bold">
              {config.prayDurationSec} giây
            </span>
          </div>
          <input
            type="range"
            min={3}
            max={180}
            value={Math.min(180, Math.max(3, config.prayDurationSec))}
            onChange={(e) =>
              onUpdateConfig({ prayDurationSec: Math.max(3, parseInt(e.target.value, 10) || 3) })
            }
            className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
          />
        </div>
      </section>

      <hr className="border-stone-800/80" />

      {/* Section 3: Rename HUD Board Titles, Notice Board & Visibility */}
      <section className="space-y-2.5">
        <h2 className="text-xs font-semibold text-stone-200">
          Bảng Thông Báo, Ẩn/Hiện các loại bảng & Độ mờ nền HUD
        </h2>

        <div className="p-2.5 rounded-lg bg-stone-900/60 border border-stone-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-amber-300">
              Bảng Thông Báo (Chỉnh nội dung & Cỡ chữ)
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-stone-400">
                Cỡ chữ: {config.hudLayout.noticeBoardFontSize ?? 11}px
              </span>
              <input
                type="range"
                min={9}
                max={20}
                step={1}
                value={config.hudLayout.noticeBoardFontSize ?? 11}
                onChange={(e) =>
                  onUpdateHudLayout({
                    noticeBoardFontSize: parseInt(e.target.value, 10) || 11,
                  })
                }
                className="w-20 accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <input
            type="text"
            value={config.hudLayout.noticeBoardTitle || 'Thông Báo Nhà Chùa'}
            onChange={(e) =>
              onUpdateHudLayout({ noticeBoardTitle: e.target.value })
            }
            placeholder="Tiêu đề bảng thông báo..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs font-semibold text-amber-200 focus:outline-none focus:border-amber-500"
          />

          <textarea
            rows={3}
            value={config.hudLayout.noticeBoardContent || ''}
            onChange={(e) =>
              onUpdateHudLayout({ noticeBoardContent: e.target.value })
            }
            placeholder="Nhập nội dung thông báo (hỗ trợ nhiều dòng)..."
            className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-stone-200 focus:outline-none focus:border-amber-500 leading-relaxed"
          />
        </div>

        <div className="p-2.5 rounded-lg bg-stone-900/60 border border-stone-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-stone-200">
              Ẩn / Hiện & Cỡ chữ (Font Size) từng loại bảng trên màn hình Live
            </span>
            <span className="text-[10px] text-stone-400">7px – 24px</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {(
              [
                {
                  visKey: 'showNoticeBoardBox',
                  fontKey: 'noticeBoardFontSize',
                  defaultFont: 10,
                  label: 'Bảng Thông Báo',
                },
                {
                  visKey: 'showGrandEventBox',
                  fontKey: 'grandEventFontSize',
                  defaultFont: 10,
                  label: 'Bảng Sự Kiện Đại Lễ',
                },
                {
                  visKey: 'showLeaderboardBox',
                  fontKey: 'leaderboardFontSize',
                  defaultFont: 10,
                  label: 'Bảng Công Đức (BXH)',
                },
                {
                  visKey: 'showGuideBox',
                  fontKey: 'guideFontSize',
                  defaultFont: 9,
                  label: 'Bảng Hướng Dẫn',
                },
                {
                  visKey: 'showPilgrimCountBox',
                  fontKey: 'pilgrimCountFontSize',
                  defaultFont: 10,
                  label: 'Bảng Đếm Phật Tử',
                },
                {
                  visKey: 'showToastBox',
                  fontKey: 'toastFontSize',
                  defaultFont: 10,
                  label: 'Bảng Toast Dâng Lễ',
                },
                {
                  visKey: 'showTempleSign',
                  fontKey: null,
                  defaultFont: 10,
                  label: 'Bảng Tên Chùa (PNG)',
                },
              ] as const
            ).map(({ visKey, fontKey, defaultFont, label }) => {
              const visible = config.hudLayout[visKey] !== false;
              const currentSize = fontKey
                ? (config.hudLayout[fontKey] ?? defaultFont)
                : defaultFont;

              return (
                <div
                  key={visKey}
                  className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 transition ${
                    visible
                      ? 'bg-stone-950/85 border-emerald-500/35'
                      : 'bg-stone-950/40 border-stone-800/80 opacity-65'
                  }`}
                >
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
                      <span className="text-[10px] text-stone-400 whitespace-nowrap">
                        Cỡ chữ:
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateHudLayout({
                            [fontKey]: Math.max(7, currentSize - 1),
                          })
                        }
                        className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 flex items-center justify-center text-stone-200 cursor-pointer"
                        title="Giảm cỡ chữ (-1px)"
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
                        className="w-20 accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateHudLayout({
                            [fontKey]: Math.min(24, currentSize + 1),
                          })
                        }
                        className="w-5 h-5 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 flex items-center justify-center text-amber-300 cursor-pointer"
                        title="Tăng cỡ chữ (+1px)"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-right text-[10.5px] font-mono font-bold text-amber-300 tabular-nums">
                        {currentSize}px
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-stone-500 italic">
                      Ảnh PNG (Kéo góc chỉnh cỡ)
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tùy chọn Pop-up người mới vào & Số lượng Rank hiển thị trong Bảng Công Đức */}
          <div className="pt-2 border-t border-stone-800 grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800 flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-semibold text-stone-200 truncate">
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
                className={`px-2 py-0.5 rounded border text-[10px] font-bold cursor-pointer transition shrink-0 ${
                  config.hudLayout.showNewPilgrimToast !== false
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-stone-900 border-stone-700 text-stone-400'
                }`}
              >
                {config.hudLayout.showNewPilgrimToast !== false ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
              </button>
            </div>

            <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800 flex items-center justify-between gap-1.5">
              <span className="text-[10.5px] font-semibold text-stone-200 truncate">
                Số Rank BXH:
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateHudLayout({
                      leaderboardMaxRanks: Math.max(
                        1,
                        (config.hudLayout.leaderboardMaxRanks ?? 5) - 1
                      ),
                    })
                  }
                  className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 flex items-center justify-center text-stone-200 cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-10 text-center text-[10.5px] font-mono font-bold text-amber-300">
                  Top {config.hudLayout.leaderboardMaxRanks ?? 5}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateHudLayout({
                      leaderboardMaxRanks: Math.min(
                        20,
                        (config.hudLayout.leaderboardMaxRanks ?? 5) + 1
                      ),
                    })
                  }
                  className="w-5 h-5 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 flex items-center justify-center text-amber-300 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-stone-900/60 border border-stone-800">
          <div className="flex justify-between text-[11px] text-stone-300 mb-1">
            <span>Độ mờ nền của tất cả các bảng HUD</span>
            <span className="text-amber-300 font-mono tabular-nums">
              {Math.round((config.hudLayout.hudOpacity ?? 0.88) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={config.hudLayout.hudOpacity ?? 0.88}
            onChange={(e) =>
              onUpdateHudLayout({ hudOpacity: parseFloat(e.target.value) })
            }
            className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-stone-400 block mb-1">
              Bảng Đại Lễ:
            </label>
            <input
              type="text"
              value={config.hudLayout.grandEventTitle || 'Sự kiện Đại Lễ'}
              onChange={(e) =>
                onUpdateHudLayout({ grandEventTitle: e.target.value })
              }
              className="w-full px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-[11px] text-stone-400 block mb-1">
              Bảng đếm Phật tử (x/x):
            </label>
            <input
              type="text"
              value={config.hudLayout.pilgrimCountTitle || 'Phật tử'}
              onChange={(e) =>
                onUpdateHudLayout({ pilgrimCountTitle: e.target.value })
              }
              className="w-full px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-[11px] text-stone-400 block mb-1">
              Bảng xếp hạng:
            </label>
            <input
              type="text"
              value={config.hudLayout.leaderboardTitle}
              onChange={(e) =>
                onUpdateHudLayout({ leaderboardTitle: e.target.value })
              }
              className="w-full px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-[11px] text-stone-400 block mb-1">
              Bảng hướng dẫn:
            </label>
            <input
              type="text"
              value={config.hudLayout.guideTitle}
              onChange={(e) => onUpdateHudLayout({ guideTitle: e.target.value })}
              className="w-full px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </section>

      <hr className="border-stone-800/80" />

      {/* Section 4: Upload Offering Gift Models (Model Quà Dâng Lên) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 text-amber-400" />
            <span>Model Quà Dâng Lên (Hiển thị cạnh thẻ công việc & trên tay / mâm lễ)</span>
          </h2>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-900 border border-amber-400/50 flex items-center justify-center shrink-0">
              <OfferingModelArt
                type="incense"
                customAssets={customAssets}
                className="w-6 h-6"
              />
            </div>
            <div className="flex-1 min-w-0">
              <AssetUploadRow
                label="Quà 1: Nhang Trầm (Bình luận ước nguyện)"
                hasCustom={Boolean(customAssets.offeringIncenseUrl)}
                onSelectFile={(f) => onUploadAsset('offeringIncenseUrl', f)}
                onReset={() => onResetAsset('offeringIncenseUrl')}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-900 border border-amber-400/50 flex items-center justify-center shrink-0">
              <OfferingModelArt
                type="rose"
                customAssets={customAssets}
                className="w-6 h-6"
              />
            </div>
            <div className="flex-1 min-w-0">
              <AssetUploadRow
                label="Quà 2: Hoa Sen Hồng Vừa (Hoa hồng - 1 Coin)"
                hasCustom={Boolean(customAssets.offeringRoseUrl)}
                onSelectFile={(f) => onUploadAsset('offeringRoseUrl', f)}
                onReset={() => onResetAsset('offeringRoseUrl')}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-900 border border-amber-400/50 flex items-center justify-center shrink-0">
              <OfferingModelArt
                type="lotus"
                customAssets={customAssets}
                className="w-6 h-6"
              />
            </div>
            <div className="flex-1 min-w-0">
              <AssetUploadRow
                label="Quà 3: Hoa Sen Vàng Hoàng Kim (Bắn tim - 5 Coins)"
                hasCustom={Boolean(customAssets.offeringLotusUrl)}
                onSelectFile={(f) => onUploadAsset('offeringLotusUrl', f)}
                onReset={() => onResetAsset('offeringLotusUrl')}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-900 border border-amber-400/50 flex items-center justify-center shrink-0">
              <OfferingModelArt
                type="tray"
                customAssets={customAssets}
                className="w-6 h-6"
              />
            </div>
            <div className="flex-1 min-w-0">
              <AssetUploadRow
                label="Quà 4: Mâm Hoa Quả (Rosa 10 Coins & Đặc biệt >10 Coins)"
                hasCustom={Boolean(customAssets.offeringTrayUrl)}
                onSelectFile={(f) => onUploadAsset('offeringTrayUrl', f)}
                onReset={() => onResetAsset('offeringTrayUrl')}
              />
            </div>
          </div>
        </div>
      </section>

      <hr className="border-stone-800/80" />

      {/* Section 5: Upload PNG Temple Sign, Background & Horizontal Spritesheets */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Nạp ảnh thiết kế PNG & Spritesheet 1 hàng ngang</span>
          </h2>
        </div>

        <div className="space-y-2">
          <AssetUploadRow
            label="1. Bảng tên chùa (PNG cắt nền, không text)"
            hasCustom={Boolean(customAssets.templeSignPngUrl)}
            onSelectFile={(f) => onUploadAsset('templeSignPngUrl', f)}
            onReset={() => onResetAsset('templeSignPngUrl')}
          />

          <AssetUploadRow
            label="2a. Spritesheet Khách Nữ (1 hàng ngang, 10 frames 0–9)"
            hasCustom={Boolean(customAssets.pilgrimFemaleSpritesheetUrl)}
            onSelectFile={(f) => onUploadAsset('pilgrimFemaleSpritesheetUrl', f)}
            onReset={() => onResetAsset('pilgrimFemaleSpritesheetUrl')}
          />

          <AssetUploadRow
            label="2b. Spritesheet Khách Nam (1 hàng ngang, 10 frames 0–9)"
            hasCustom={Boolean(customAssets.pilgrimMaleSpritesheetUrl)}
            onSelectFile={(f) => onUploadAsset('pilgrimMaleSpritesheetUrl', f)}
            onReset={() => onResetAsset('pilgrimMaleSpritesheetUrl')}
          />

          <AssetUploadRow
            label="3. Spritesheet Sư Trụ Trì (1 hàng ngang, 8 frames 0–7)"
            hasCustom={Boolean(customAssets.abbotSpritesheetUrl)}
            onSelectFile={(f) => onUploadAsset('abbotSpritesheetUrl', f)}
            onReset={() => onResetAsset('abbotSpritesheetUrl')}
          />

          <AssetUploadRow
            label="4. Spritesheet Chú Tiểu Lớn (1 hàng ngang, 8 frames 0–7)"
            hasCustom={Boolean(customAssets.seniorNoviceSpritesheetUrl)}
            onSelectFile={(f) => onUploadAsset('seniorNoviceSpritesheetUrl', f)}
            onReset={() => onResetAsset('seniorNoviceSpritesheetUrl')}
          />

          <AssetUploadRow
            label="5. Spritesheet Chú Tiểu Nhỏ (1 hàng ngang, 8 frames 0–7)"
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

      <hr className="border-stone-800/80" />

      {/* Section 6: Save / Load JSON Layout & Full Studio Backup */}
      <section className="p-3 rounded-xl bg-stone-900/70 border border-emerald-500/40 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold text-emerald-300">
              Lưu / Nạp File Cấu Hình & Tọa Độ Map (.json)
            </h2>
            <p className="text-[10.5px] text-stone-400">
              Xuất ra file .json hoặc nạp lại file .json đã lưu trước đó
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyJson}
            className="px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700 text-[11px] font-semibold text-amber-300 flex items-center gap-1 cursor-pointer shrink-0"
          >
            {copiedJson ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            <span>{copiedJson ? 'Đã sao chép JSON' : 'Sao chép JSON'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onSaveBackupJson();
              setJsonStatus({
                ok: true,
                text: 'Đã tải xuống file sao lưu .json thành công!',
              });
              setTimeout(() => setJsonStatus(null), 4000);
            }}
            className="py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save JSON (Tải file .json)</span>
          </button>

          <label className="py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-cyan-300" />
            <span>Load JSON (Chọn file .json)</span>
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

        <div className="space-y-1.5 pt-1">
          <span className="text-[10.5px] text-stone-400 block">
            Dữ liệu JSON hiện tại (Có thể copy hoặc dán chuỗi JSON vào ô dưới để nạp nhanh):
          </span>
          <textarea
            readOnly
            rows={3}
            value={exportJsonString}
            className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-[10px] font-mono text-stone-400 focus:outline-none"
          />
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={pasteJsonText}
              onChange={(e) => setPasteJsonText(e.target.value)}
              placeholder="Hoặc dán chuỗi JSON đã copy vào đây..."
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={handleApplyPastedJson}
              disabled={!pasteJsonText.trim()}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-stone-950 text-xs font-bold cursor-pointer transition shrink-0"
            >
              Nạp JSON vừa dán
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

interface StepperCardProps {
  label: string;
  subLabel: string;
  value: number;
  min: number;
  onChange: (nextVal: number) => void;
}

const StepperCard: React.FC<StepperCardProps> = ({
  label,
  subLabel,
  value,
  min,
  onChange,
}) => (
  <div className="p-2.5 rounded-lg bg-stone-900/70 border border-stone-800 flex flex-col justify-between gap-2">
    <div>
      <div className="text-[11px] font-bold text-stone-200 leading-tight">
        {label}
      </div>
      <div className="text-[9.5px] text-stone-400">{subLabel}</div>
    </div>

    <div className="flex items-center justify-between gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-7 h-7 rounded-md bg-stone-800 hover:bg-stone-700 active:scale-95 border border-stone-700 flex items-center justify-center text-stone-200 cursor-pointer transition"
        title="Giảm (-1)"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => {
          const parsed = parseInt(e.target.value, 10);
          onChange(Number.isNaN(parsed) ? min : Math.max(min, parsed));
        }}
        className="w-12 text-center bg-stone-950 border border-stone-800 rounded py-1 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
      />

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-md bg-amber-500/20 hover:bg-amber-500/35 active:scale-95 border border-amber-500/40 flex items-center justify-center text-amber-300 cursor-pointer transition"
        title="Tăng (+1 không giới hạn)"
      >
        <Plus className="w-3.5 h-3.5" />
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
  <div className="p-2 rounded-lg bg-stone-900/60 border border-stone-800 flex items-center justify-between gap-2">
    <span className="text-[11px] text-stone-200 font-medium truncate">{label}</span>
    <div className="flex items-center gap-1.5 shrink-0">
      <label className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[11px] font-semibold text-amber-300 flex items-center gap-1 cursor-pointer transition">
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
          title="Khôi phục mặc định"
          className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  </div>
);

