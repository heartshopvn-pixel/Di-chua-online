import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  Heart,
  ImagePlus,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { GameConfig, GuideTaskItem, HudLayoutConfig } from '../../types/game';
import { DEFAULT_GUIDE_ITEMS } from '../../config/constants';

interface TabControlProps {
  config: GameConfig;
  realCount: number;
  botCount: number;
  queueCount: number;
  grandEventProgress: number;
  onUpdateConfig: (patch: Partial<GameConfig>) => void;
  onUpdateHudLayout: (patch: Partial<HudLayoutConfig>) => void;
  onSpawnRandom: (isVip: boolean) => void;
  onSpawnBatch: (count: number) => void;
  onLeaveAll: () => void;
  onSpawnCustom: (
    username: string,
    prayer: string,
    isVip: boolean,
    coins?: number,
    avatarUrl?: string | null
  ) => void;
  onTriggerLike: (count: number, username?: string) => void;
  onTriggerFollow: (username?: string) => void;
  onTriggerGrandEvent: () => void;
  onTriggerGiftCombo: (
    mode: 'streak_50_roses' | 'instant_50_roses' | 'multi_user_combo_storm',
    customUsername?: string,
    customPrayer?: string,
    customAvatarUrl?: string | null
  ) => void;
  onSaveBackupJson?: () => void;
  onLoadBackupJson?: (rawJsonText: string) => { ok: boolean; message: string };
}

export const TabControl: React.FC<TabControlProps> = ({
  config,
  realCount,
  botCount,
  queueCount,
  grandEventProgress,
  onUpdateConfig,
  onUpdateHudLayout,
  onSpawnRandom,
  onSpawnBatch,
  onLeaveAll,
  onSpawnCustom,
  onTriggerLike,
  onTriggerFollow,
  onTriggerGrandEvent,
  onTriggerGiftCombo,
}) => {
  const [customName, setCustomName] = useState('Nguyễn Thị Yến Nhi');
  const [customPrayer, setCustomPrayer] = useState(
    'Cầu cho năm nay gia đình bình an, vạn sự hanh thông ạ'
  );
  const [customVip, setCustomVip] = useState(false);
  const [customCoins, setCustomCoins] = useState(10);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSpawnCustom(
      customName.trim() || 'Phật Tử Ẩn Danh',
      customVip ? '' : customPrayer.trim() || 'Nam Mô A Di Đà Phật 🙏',
      customVip,
      customVip ? Math.max(1, customCoins) : 0,
      customAvatarUrl
    );
  };

  const hud = config.hudLayout;

  return (
    <div className="space-y-3.5">
      {/* 1. BẢNG ĐẾM SỐ PHẬT TỬ (KHÓA CỐ ĐỊNH KHI CUỘN XUỐNG) */}
      <div className="sticky -top-4 z-30 -mx-4 -mt-4 px-4 pt-3 pb-2.5 bg-stone-950/95 backdrop-blur-md border-b border-stone-800 shadow-lg">
        <section className="p-2.5 rounded-xl border border-amber-500/40 bg-stone-900/90 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Bảng Đếm Phật Tử</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-amber-300 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
              Trên sân: {realCount + botCount} / {config.maxStageCapacity || 36}
            </span>
          </div>

          <div className="grid grid-cols-4 divide-x divide-stone-800 rounded-lg border border-stone-800 bg-stone-950/90 py-1.5 px-1 text-center">
            <div>
              <div className="text-[10px] text-stone-400">Người thật</div>
              <div className="text-sm font-extrabold text-emerald-400 font-mono tabular-nums">
                {realCount}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-stone-400">NPC</div>
              <div className="text-sm font-extrabold text-amber-300 font-mono tabular-nums">
                {botCount}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-stone-400">Hàng chờ</div>
              <div className="text-sm font-extrabold text-cyan-300 font-mono tabular-nums">
                {queueCount}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-stone-400">Sức chứa</div>
              <div className="text-sm font-extrabold text-stone-100 font-mono tabular-nums">
                {config.maxStageCapacity || 36}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 2. THAO TÁC TEST (GOM CHUNG 1 THẺ) */}
      <section className="p-3 rounded-xl bg-stone-900/75 border border-stone-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-amber-200">Thao Tác Test</h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSpawnBatch(15)}
              className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[10.5px] font-semibold text-emerald-300 cursor-pointer transition"
            >
              +15 Vị
            </button>
            <button
              type="button"
              onClick={onLeaveAll}
              className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[10.5px] font-semibold text-rose-300 cursor-pointer transition"
            >
              Ra về hết
            </button>
          </div>
        </div>

        {/* Nút test nhanh khách & quà */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onSpawnRandom(false)}
            className="py-1.5 px-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-semibold text-stone-100 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-stone-300" />
            <span>+1 Khách Thường</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onSpawnCustom(
                customName.trim() || 'Thích Tâm Phúc',
                'Thành tâm dâng Hoa Sen Hồng 🙏',
                true,
                1,
                customAvatarUrl
              )
            }
            className="py-1.5 px-2 rounded-lg bg-pink-950/70 hover:bg-pink-900/70 border border-pink-500/40 text-xs font-semibold text-pink-200 flex items-center justify-center gap-1 transition cursor-pointer"
          >
            <span>🌹 Hoa hồng (1 Xu)</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onSpawnCustom(
                customName.trim() || 'Nguyễn Bảo Ngọc',
                'Dâng Hoa Sen Vàng cầu bình an 🙏',
                true,
                5,
                customAvatarUrl
              )
            }
            className="py-1.5 px-2 rounded-lg bg-amber-950/70 hover:bg-amber-900/70 border border-amber-500/45 text-xs font-semibold text-amber-200 flex items-center justify-center gap-1 transition cursor-pointer"
          >
            <span>🫰 Bắn tim (5 Xu)</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onSpawnCustom(
                customName.trim() || 'Trần Minh Quân',
                'Thành tâm dâng Mâm Hoa Quả 🙏',
                true,
                10,
                customAvatarUrl
              )
            }
            className="py-1.5 px-2 rounded-lg bg-orange-950/70 hover:bg-orange-900/70 border border-orange-500/45 text-xs font-semibold text-orange-200 flex items-center justify-center gap-1 transition cursor-pointer"
          >
            <span>🌺 Quà 10 Xu (Mâm quả)</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onSpawnCustom(
                customName.trim() || 'Đại Thí Chủ Minh Tâm',
                'Dâng Mâm Quả Hoàng Kim cát tường 🙏',
                true,
                25,
                customAvatarUrl
              )
            }
            className="col-span-2 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-105 text-xs font-extrabold text-stone-950 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>👑 Quà Đặc Biệt (25 Xu)</span>
          </button>
        </div>

        {/* Nút test Combo */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-stone-800/80">
          <button
            type="button"
            onClick={() =>
              onTriggerGiftCombo(
                'streak_50_roses',
                customName,
                customPrayer,
                customAvatarUrl
              )
            }
            className="py-1.5 px-2 rounded-lg bg-rose-600/30 hover:bg-rose-600/45 border border-rose-400/50 text-[11px] font-bold text-rose-100 flex items-center justify-center gap-1 transition cursor-pointer"
          >
            <span>🌹 Combo x50</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onTriggerGiftCombo(
                'instant_50_roses',
                customName,
                customPrayer,
                customAvatarUrl
              )
            }
            className="py-1.5 px-2 rounded-lg bg-rose-900/60 hover:bg-rose-800/70 border border-rose-400/50 text-[11px] font-semibold text-rose-100 flex items-center justify-center gap-1 transition cursor-pointer"
          >
            <span>⚡ Gộp 50 Hoa</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onTriggerGiftCombo(
                'multi_user_combo_storm',
                customName,
                customPrayer,
                customAvatarUrl
              )
            }
            className="py-1.5 px-2 rounded-lg bg-amber-900/50 hover:bg-amber-800/60 border border-amber-400/50 text-[11px] font-semibold text-amber-100 flex items-center justify-center gap-1 transition cursor-pointer"
          >
            <span>🎆 Bão 4 Khách</span>
          </button>
        </div>

        {/* Form gửi người xem / lời cầu nguyện cụ thể */}
        <form
          onSubmit={handleCustomSubmit}
          className="pt-2 border-t border-stone-800/80 space-y-2"
        >
          <div className="grid grid-cols-3 gap-1.5">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Tên người xem..."
              className="col-span-1 px-2 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              value={customPrayer}
              onChange={(e) => setCustomPrayer(e.target.value)}
              placeholder="Lời cầu nguyện..."
              className="col-span-2 px-2 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customVip}
                  onChange={(e) => setCustomVip(e.target.checked)}
                  className="accent-amber-500 w-3.5 h-3.5 rounded"
                />
                <span>Kèm quà</span>
              </label>
              {customVip && (
                <select
                  value={customCoins}
                  onChange={(e) => setCustomCoins(parseInt(e.target.value, 10))}
                  className="px-1.5 py-1 rounded bg-stone-950 border border-stone-700 text-[11px] font-mono text-amber-300"
                >
                  <option value={1}>1 Xu</option>
                  <option value={5}>5 Xu</option>
                  <option value={10}>10 Xu</option>
                  <option value={25}>25 Xu</option>
                </select>
              )}

              {customAvatarUrl && (
                <img
                  src={customAvatarUrl}
                  alt="Avatar"
                  className="w-5 h-5 rounded-sm object-cover border border-amber-400"
                />
              )}
              <label className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[10px] font-semibold text-amber-300 flex items-center gap-1 cursor-pointer">
                <ImagePlus className="w-3 h-3" />
                <span>{customAvatarUrl ? 'Đổi ảnh' : 'Avatar'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          setCustomAvatarUrl(reader.result);
                        }
                      };
                      reader.readAsDataURL(f);
                    }
                  }}
                />
              </label>
              {customAvatarUrl && (
                <button
                  type="button"
                  onClick={() => setCustomAvatarUrl(null)}
                  className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-3 py-1 rounded-lg bg-stone-100 hover:bg-white text-stone-950 font-bold text-xs flex items-center gap-1 transition shrink-0 cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>Gửi</span>
            </button>
          </div>
        </form>
      </section>

      {/* 3. SỰ KIỆN ĐẠI LỄ (DỜI LÊN NẰM DƯỚI THẺ TEST) */}
      <section className="p-3 rounded-xl bg-stone-900/75 border border-pink-500/35 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-pink-400" />
            <h2 className="text-xs font-bold text-pink-200">
              Sự Kiện Đại Lễ ({grandEventProgress}/{config.grandEventTarget} 🌸)
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {[200, 500, 1000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onUpdateConfig({ grandEventTarget: preset })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                  config.grandEventTarget === preset
                    ? 'bg-pink-500 text-stone-950 font-bold'
                    : 'bg-stone-800 text-stone-300'
                }`}
              >
                {preset}
              </button>
            ))}
            <input
              type="number"
              min={10}
              max={100000}
              step={50}
              value={config.grandEventTarget}
              onChange={(e) =>
                onUpdateConfig({
                  grandEventTarget: Math.max(
                    10,
                    parseInt(e.target.value, 10) || 1000
                  ),
                })
              }
              className="w-16 px-1.5 py-0.5 rounded bg-stone-950 border border-stone-700 text-[11px] font-mono text-amber-300 text-right"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onTriggerLike(10, customName)}
            className="py-1.5 px-2 rounded-lg bg-pink-600/25 hover:bg-pink-600/40 border border-pink-400/50 text-[11px] font-semibold text-pink-200 flex items-center justify-center gap-1 cursor-pointer"
          >
            <Heart className="w-3 h-3 text-pink-400" />
            <span>Tim (+10)</span>
          </button>
          <button
            type="button"
            onClick={() => onTriggerFollow(customName)}
            className="py-1.5 px-2 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-400/50 text-[11px] font-semibold text-emerald-200 flex items-center justify-center gap-1 cursor-pointer"
          >
            <UserPlus className="w-3 h-3 text-emerald-400" />
            <span>Follow (+100)</span>
          </button>
          <button
            type="button"
            onClick={onTriggerGrandEvent}
            className="py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[11px] font-bold text-stone-950 flex items-center justify-center gap-1 cursor-pointer"
          >
            <Bell className="w-3 h-3" />
            <span>Nổ Đại Lễ</span>
          </button>
        </div>

        {/* Giới hạn hoa sen bay khi Thả Tim */}
        <div className="p-2 rounded-lg bg-stone-950/90 border border-stone-800 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-pink-200">
              🌸 Giới hạn hoa sen bay khi Thả Tim
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                min={0}
                max={30}
                value={config.maxFlyingLotuses ?? 5}
                onChange={(e) =>
                  onUpdateConfig({
                    maxFlyingLotuses: Math.max(
                      0,
                      Math.min(30, parseInt(e.target.value, 10) || 0)
                    ),
                  })
                }
                className="w-12 px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-xs font-mono font-bold text-pink-300 text-right"
              />
              <span className="text-[11px] font-mono text-pink-300">bông</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 shrink-0">
              {[0, 1, 3, 5, 8, 15].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onUpdateConfig({ maxFlyingLotuses: num })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition ${
                    (config.maxFlyingLotuses ?? 5) === num
                      ? 'bg-pink-500 text-stone-950 font-bold'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                  }`}
                >
                  {num === 0 ? 'Tắt' : num}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={Math.min(20, Math.max(0, config.maxFlyingLotuses ?? 5))}
              onChange={(e) =>
                onUpdateConfig({
                  maxFlyingLotuses: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              className="flex-1 accent-pink-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* 4. BẢNG THÔNG BÁO */}
      <section className="p-3 rounded-xl bg-stone-900/75 border border-amber-500/35 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <BellRing className="w-3.5 h-3.5 text-amber-400" />
            <h2 className="text-xs font-bold text-amber-200">Bảng Thông Báo</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] text-stone-400">Cỡ chữ:</span>
            <input
              type="range"
              min={7}
              max={22}
              step={0.5}
              value={hud.noticeBoardFontSize || 10}
              onChange={(e) =>
                onUpdateHudLayout({
                  noticeBoardFontSize: parseFloat(e.target.value),
                })
              }
              className="w-20 accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
            />
            <span className="text-[11px] font-mono font-bold text-amber-300 w-9 text-right">
              {hud.noticeBoardFontSize || 10}px
            </span>
          </div>
        </div>

        <input
          type="text"
          value={hud.noticeBoardTitle ?? 'Bảng thông báo'}
          onChange={(e) =>
            onUpdateHudLayout({ noticeBoardTitle: e.target.value })
          }
          placeholder="Tiêu đề bảng thông báo..."
          className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-800 text-xs text-amber-200 font-semibold focus:outline-none focus:border-amber-500"
        />

        <textarea
          rows={2}
          value={
            hud.noticeBoardContent ??
            'Chào mừng Phật tử thập phương về Kim Thiền Tự lễ Phật, cầu bình an & sức khỏe 🙏'
          }
          onChange={(e) =>
            onUpdateHudLayout({ noticeBoardContent: e.target.value })
          }
          placeholder="Nội dung thông báo..."
          className="w-full px-2 py-1.5 rounded bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:outline-none focus:border-amber-500 resize-y"
        />
      </section>

      {/* 5. BẢNG HƯỚNG DẪN */}
      <section className="p-3 rounded-xl bg-stone-900/75 border border-emerald-500/35 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold text-emerald-200">
            Bảng Hướng Dẫn ({(hud.guideItems ?? DEFAULT_GUIDE_ITEMS).length} dòng)
          </h2>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                const currentList = hud.guideItems ?? DEFAULT_GUIDE_ITEMS;
                const nextItem: GuideTaskItem = {
                  id: `guide-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                  label: 'Mục mới',
                  shortDesc: 'Nội dung hướng dẫn',
                  modelType: 'rose',
                  colorTheme: 'amber',
                };
                onUpdateHudLayout({ guideItems: [...currentList, nextItem] });
              }}
              className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition"
            >
              <Plus className="w-3 h-3" />
              <span>Thêm dòng</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateHudLayout({ guideItems: DEFAULT_GUIDE_ITEMS })
              }
              title="Khôi phục mặc định"
              className="px-1.5 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
          {(hud.guideItems ?? DEFAULT_GUIDE_ITEMS).map((item, idx) => {
            const currentList = hud.guideItems ?? DEFAULT_GUIDE_ITEMS;
            const updateItem = (patch: Partial<GuideTaskItem>) => {
              const next = currentList.map((it, i) =>
                i === idx ? { ...it, ...patch } : it
              );
              onUpdateHudLayout({ guideItems: next });
            };
            const removeItem = () => {
              const next = currentList.filter((_, i) => i !== idx);
              onUpdateHudLayout({ guideItems: next });
            };

            return (
              <div
                key={item.id || idx}
                className="p-1.5 rounded-lg bg-stone-950 border border-stone-800 flex items-center gap-1.5"
              >
                <select
                  value={item.modelType || 'none'}
                  onChange={(e) =>
                    updateItem({
                      modelType: e.target.value as GuideTaskItem['modelType'],
                    })
                  }
                  className="px-1.5 py-1 rounded bg-stone-900 border border-stone-700 text-[10px] text-amber-300 shrink-0 focus:outline-none"
                >
                  <option value="none">Không icon</option>
                  <option value="rose">🌹 Sen hồng</option>
                  <option value="lotus">🪷 Sen vàng</option>
                  <option value="tray">🍑 Mâm quả</option>
                  <option value="special_tray">👑 Mâm đặc biệt</option>
                  <option value="incense">🕯️ Nhang</option>
                </select>

                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateItem({ label: e.target.value })}
                  placeholder="Tên mục..."
                  className="w-24 px-1.5 py-1 rounded bg-stone-900 border border-stone-800 text-[11px] font-bold text-amber-200 focus:outline-none focus:border-amber-500 shrink-0"
                />

                <input
                  type="text"
                  value={item.shortDesc}
                  onChange={(e) => updateItem({ shortDesc: e.target.value })}
                  placeholder="Mô tả..."
                  className="flex-1 min-w-0 px-1.5 py-1 rounded bg-stone-900 border border-stone-800 text-[11px] text-stone-100 focus:outline-none focus:border-amber-500"
                />

                <button
                  type="button"
                  onClick={removeItem}
                  className="p-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 cursor-pointer shrink-0 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. SỨC CHỨA SÂN & THỜI GIAN NGỒI GHẾ */}
      <section className="p-3 rounded-xl bg-stone-900/75 border border-stone-800 space-y-2.5">
        <div className="p-2 rounded-lg bg-stone-950/90 border border-emerald-500/30 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-emerald-200">
              🚪 Sức Chứa Chánh Điện
            </h2>
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                min={1}
                max={200}
                value={config.maxStageCapacity || 36}
                onChange={(e) =>
                  onUpdateConfig({
                    maxStageCapacity: Math.max(
                      1,
                      Math.min(200, parseInt(e.target.value, 10) || 36)
                    ),
                  })
                }
                className="w-14 px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-xs font-mono font-bold text-emerald-300 text-right"
              />
              <span className="text-[11px] font-mono text-emerald-300">vị</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 shrink-0">
              {[16, 24, 36, 48, 64, 80].map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => onUpdateConfig({ maxStageCapacity: cap })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition ${
                    (config.maxStageCapacity || 36) === cap
                      ? 'bg-emerald-400 text-stone-950 font-bold'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                  }`}
                >
                  {cap}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={1}
              max={120}
              step={1}
              value={Math.min(120, Math.max(1, config.maxStageCapacity || 36))}
              onChange={(e) =>
                onUpdateConfig({
                  maxStageCapacity: Math.max(1, parseInt(e.target.value, 10) || 36),
                })
              }
              className="flex-1 accent-emerald-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-stone-950/90 border border-amber-500/30 space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-amber-300">
                👑 Ngồi Ghế VIP
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-300">
                {config.vipPrayDurationSec ?? config.prayDurationSec ?? 35}s
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={180}
              step={1}
              value={Math.min(
                180,
                Math.max(3, config.vipPrayDurationSec ?? config.prayDurationSec ?? 35)
              )}
              onChange={(e) =>
                onUpdateConfig({
                  vipPrayDurationSec: Math.max(3, parseInt(e.target.value, 10) || 3),
                })
              }
              className="w-full accent-amber-400 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="p-2 rounded-lg bg-stone-950/90 border border-stone-800 space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-emerald-300">
                🧘 Ngồi Ghế Thường
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-300">
                {config.normalPrayDurationSec ?? config.prayDurationSec ?? 22}s
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={180}
              step={1}
              value={Math.min(
                180,
                Math.max(3, config.normalPrayDurationSec ?? config.prayDurationSec ?? 22)
              )}
              onChange={(e) =>
                onUpdateConfig({
                  normalPrayDurationSec: Math.max(3, parseInt(e.target.value, 10) || 3),
                })
              }
              className="w-full accent-emerald-400 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
