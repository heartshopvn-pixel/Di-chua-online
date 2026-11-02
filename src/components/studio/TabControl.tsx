import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  Download,
  Eye,
  EyeOff,
  Heart,
  ImagePlus,
  RotateCcw,
  Send,
  Sparkles,
  Upload,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { GameConfig, HudLayoutConfig } from '../../types/game';

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
  onSaveBackupJson: () => void;
  onLoadBackupJson: (rawJsonText: string) => { ok: boolean; message: string };
  donorsCount?: number;
  onClearDonors?: () => void;
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
  onSaveBackupJson,
  onLoadBackupJson,
  donorsCount = 0,
  onClearDonors,
}) => {
  const [customName, setCustomName] = useState('Nguyễn Thị Yến Nhi');
  const [customPrayer, setCustomPrayer] = useState(
    'Cầu cho năm nay gia đình bình an, vạn sự hanh thông ạ'
  );
  const [customVip, setCustomVip] = useState(false);
  const [customCoins, setCustomCoins] = useState(10);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const handleLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const res = onLoadBackupJson(reader.result);
        setBackupMsg({ ok: res.ok, text: res.message });
        setTimeout(() => setBackupMsg(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

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
    <div className="space-y-4">
      {/* Bảng Đếm Số Phật Tử Chi Tiết Trong Dev (Người thật / NPC / Hàng chờ / Sức chứa sân) */}
      <section className="p-2.5 rounded-xl border border-amber-500/40 bg-stone-900/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Bảng Đếm Số Phật Tử (Trực Tiếp)</span>
          </span>
          <span className="text-[11px] font-mono font-bold text-amber-300 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
            Trên sân: {realCount + botCount} / {config.maxStageCapacity || 36} vị
          </span>
        </div>

        <div className="grid grid-cols-4 divide-x divide-stone-800 rounded-lg border border-stone-800 bg-stone-950/90 py-2 px-1 text-center">
          <div>
            <div className="text-[10.5px] text-stone-400">Người thật</div>
            <div className="text-sm font-extrabold text-emerald-400 font-mono tabular-nums">
              {realCount}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] text-stone-400">Phật tử NPC</div>
            <div className="text-sm font-extrabold text-amber-300 font-mono tabular-nums">
              {botCount}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] text-stone-400">Hàng chờ</div>
            <div className="text-sm font-extrabold text-cyan-300 font-mono tabular-nums">
              {queueCount}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] text-stone-400">Cho phép vào</div>
            <div className="text-sm font-extrabold text-stone-100 font-mono tabular-nums">
              {config.maxStageCapacity || 36}
            </div>
          </div>
        </div>
      </section>

      {/* Khối Sao Lưu & Khôi Phục Cấu Hình Toàn Bộ (.json) */}
      <section className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold text-emerald-200">
              💾 Sao Lưu & Nạp Lại Cấu Hình (.json)
            </h2>
            <p className="text-[10.5px] text-stone-400">
              Lưu toàn bộ vị trí ghế, bảng, NPC, âm thanh & ảnh ra file .json để mang sang máy khác
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onSaveBackupJson();
              setBackupMsg({
                ok: true,
                text: 'Đã tải xuống file sao lưu .json thành công!',
              });
              setTimeout(() => setBackupMsg(null), 4000);
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
              onChange={handleLoadFile}
            />
          </label>
        </div>

        {backupMsg && (
          <div
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${
              backupMsg.ok
                ? 'bg-emerald-900/60 border border-emerald-400/50 text-emerald-200'
                : 'bg-rose-900/60 border border-rose-400/50 text-rose-200'
            }`}
          >
            {backupMsg.text}
          </div>
        )}
      </section>

      {/* Section 1: Quick Stage Actions & Gift Tiers Test */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-stone-200">
            Thao tác nhanh & Test Quà Dâng Lễ (1 / 5 / 10+ Xu)
          </h2>
          <span className="text-[11px] text-stone-400 font-mono tabular-nums">
            Đang trên sân: {realCount + botCount} vị
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onSpawnRandom(false)}
            className="py-1.5 px-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-semibold text-stone-100 flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-stone-300" />
            <span>+1 Khách Thường (Thắp nhang)</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onSpawnCustom(
                customName.trim() || 'Thích Tâm Phúc',
                'Thành tâm dâng Hoa Sen Hồng vừa 🙏',
                true,
                1,
                customAvatarUrl
              )
            }
            className="py-1.5 px-2.5 rounded-lg bg-pink-950/70 hover:bg-pink-900/70 border border-pink-500/40 text-xs font-semibold text-pink-200 flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>🌹 Hoa hồng (1 Xu · Sen hồng)</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onSpawnCustom(
                customName.trim() || 'Nguyễn Bảo Ngọc',
                'Dâng Hoa Sen Vàng Hoàng Kim cầu bình an 🙏',
                true,
                5,
                customAvatarUrl
              )
            }
            className="py-1.5 px-2.5 rounded-lg bg-amber-950/70 hover:bg-amber-900/70 border border-amber-500/45 text-xs font-semibold text-amber-200 flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>🫰 Bắn tim (5 Xu · Sen vàng)</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onSpawnCustom(
                customName.trim() || 'Trần Minh Quân',
                'Thành tâm dâng Mâm Hoa Quả ngũ sắc 🙏',
                true,
                10,
                customAvatarUrl
              )
            }
            className="py-1.5 px-2.5 rounded-lg bg-orange-950/70 hover:bg-orange-900/70 border border-orange-500/45 text-xs font-semibold text-orange-200 flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>🌺 Quà 10 Xu (Mâm quả + Zoom 4s)</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onSpawnCustom(
                customName.trim() || 'Đại Thí Chủ Minh Tâm',
                'Dâng Mâm Quả Hoàng Kim vạn sự cát tường 🙏',
                true,
                25,
                customAvatarUrl
              )
            }
            className="col-span-2 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-105 text-xs font-extrabold text-stone-950 flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>👑 Quà Đặc Biệt (10+ Xu): Zoom Sát Trọng Tâm Khung Hình 4s</span>
          </button>
          <button
            type="button"
            onClick={() => onSpawnBatch(15)}
            className="py-1.5 px-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-xs font-medium text-emerald-300 flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Thêm đoàn (+15 vị)</span>
          </button>
          <button
            type="button"
            onClick={onLeaveAll}
            className="py-1.5 px-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-xs font-medium text-rose-300 flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Cho tất cả ra về</span>
          </button>
        </div>

        {/* Khối Test Combo Dâng Nhiều Quà Liên Tục (50 Hoa Hồng) */}
        <div className="p-2 rounded-xl bg-rose-950/35 border border-rose-500/40 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-rose-200">
              🔥 Test Khách Dâng Combo Liên Tục (50 Hoa Hồng)
            </span>
            <span className="text-[10px] text-amber-300/90 font-mono">
              Gộp x50 · Zoom 4s
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
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
              className="col-span-2 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-rose-600 via-amber-500 to-yellow-400 hover:brightness-105 text-stone-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <span>🌹 Test Combo 50 Hoa Hồng (Nhảy liên hoàn x1 ➔ x50)</span>
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
              <span>⚡ Dâng 1 lúc 50 Hoa hồng</span>
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
              <span>🎆 Bão Combo Đa Khách (4 vị)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Section 2: Gửi lời cầu nguyện cụ thể (Có hỗ trợ chọn Avatar thật cho người chơi) */}
      <form
        onSubmit={handleCustomSubmit}
        className="p-2.5 rounded-xl bg-stone-900/60 border border-stone-800 space-y-2"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-stone-200">
            Gửi người xem / lời cầu nguyện cụ thể
          </h2>
          <div className="flex items-center gap-1.5">
            {customAvatarUrl && (
              <img
                src={customAvatarUrl}
                alt="Avatar preview"
                className="w-5 h-5 rounded-sm object-cover border border-amber-400"
              />
            )}
            <label className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[10px] font-semibold text-amber-300 flex items-center gap-1 cursor-pointer">
              <ImagePlus className="w-3 h-3" />
              <span>{customAvatarUrl ? 'Đổi Avatar' : 'Chọn Avatar'}</span>
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
                title="Xóa avatar tùy chọn (sẽ lấy ngẫu nhiên từ Pool)"
                className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

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
            placeholder="Lời ước nguyện..."
            className="col-span-2 px-2 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <label className="flex items-center gap-1.5 text-xs text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={customVip}
                onChange={(e) => setCustomVip(e.target.checked)}
                className="accent-amber-500 w-3.5 h-3.5 rounded"
              />
              <span>Tặng quà dâng lễ</span>
            </label>
            {customVip && (
              <select
                value={customCoins}
                onChange={(e) => setCustomCoins(parseInt(e.target.value, 10))}
                className="px-2 py-1 rounded bg-stone-950 border border-stone-700 text-[11px] font-mono text-amber-300"
              >
                <option value={1}>1 Xu (Sen hồng)</option>
                <option value={5}>5 Xu (Sen vàng)</option>
                <option value={10}>10 Xu (Đặc biệt + Zoom 4s)</option>
                <option value={25}>25 Xu (Hoàng Kim + Zoom 4s)</option>
              </select>
            )}
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-white text-stone-950 font-semibold text-xs flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-3 h-3" />
            <span>Gửi vào chùa</span>
          </button>
        </div>
      </form>

      {/* Section 3: Bảng Thông Báo & Ẩn / Hiện Các Loại Bảng */}
      <section className="p-3 rounded-xl bg-stone-900/75 border border-amber-500/35 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BellRing className="w-3.5 h-3.5 text-amber-400" />
            <h2 className="text-xs font-bold text-amber-200">
              Bảng Thông Báo & Ẩn / Hiện Các Loại Bảng
            </h2>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateHudLayout({ editLayoutMode: !hud.editLayoutMode })
            }
            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
              hud.editLayoutMode
                ? 'bg-amber-400 text-stone-950'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
            }`}
          >
            {hud.editLayoutMode ? 'Đang bật Kéo/Chỉnh cỡ' : 'Kéo vị trí & cỡ bảng'}
          </button>
        </div>

        {/* Nút bật/tắt Ẩn / Hiện cho tất cả 7 loại bảng trên sân */}
        <div className="space-y-1">
          <span className="text-[10.5px] text-stone-400 block">
            Bấm để Ẩn / Hiện từng loại bảng trên màn hình:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { key: 'showNoticeBoardBox', label: 'Bảng Thông Báo' },
                { key: 'showGrandEventBox', label: 'Bảng Đại Lễ' },
                { key: 'showLeaderboardBox', label: 'Bảng Công Đức' },
                { key: 'showGuideBox', label: 'Bảng Hướng Dẫn' },
                { key: 'showPilgrimCountBox', label: 'Bảng Đếm Phật Tử' },
                { key: 'showTempleSign', label: 'Bảng Tên Chùa' },
                { key: 'showToastBox', label: 'Thông Báo Trôi' },
              ] as const
            ).map((item) => {
              const isVisible = hud[item.key] !== false;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    onUpdateHudLayout({ [item.key]: !isVisible })
                  }
                  className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-between gap-1.5 cursor-pointer transition ${
                    isVisible
                      ? 'bg-emerald-950/50 border-emerald-500/45 text-emerald-200'
                      : 'bg-stone-950 border-stone-800 text-stone-500'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  {isVisible ? (
                    <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tùy chọn Pop-up: Bật / Tắt Thông báo người mới vào */}
        <div className="p-2.5 rounded-lg bg-stone-950/90 border border-stone-800 flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold text-amber-200">
              Pop-up Thông Báo Trôi: Người mới vào
            </div>
            <div className="text-[10px] text-stone-400">
              Bật / tắt dòng pop-up &ldquo;[Tên] vào chùa cầu an&rdquo; (vẫn giữ thông báo dâng quà)
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateHudLayout({
                showNewPilgrimToast: hud.showNewPilgrimToast === false,
              })
            }
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition ${
              hud.showNewPilgrimToast !== false
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-stone-900 border-stone-700 text-stone-400'
            }`}
          >
            {hud.showNewPilgrimToast !== false ? (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Đang bật</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-stone-500" />
                <span>Đã tắt</span>
              </>
            )}
          </button>
        </div>

        {/* Tùy chỉnh Bảng Công Đức: Số lượng Rank hiển thị & Làm mới BXH */}
        <div className="p-2.5 rounded-lg bg-stone-950/90 border border-stone-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-amber-300 block">
                Bảng Công Đức: Số lượng Rank hiển thị
              </span>
              <span className="text-[10px] text-stone-400">
                Hiện đang ghi nhận {donorsCount} thí chủ dâng lễ
              </span>
            </div>
            {onClearDonors && (
              <button
                type="button"
                onClick={onClearDonors}
                className="px-2 py-1 rounded bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-[10px] font-bold text-rose-200 flex items-center gap-1 cursor-pointer transition shrink-0"
                title="Xóa danh sách thí chủ cũ để bắt đầu phiên Live mới"
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
                    onUpdateHudLayout({ leaderboardMaxRanks: preset })
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition ${
                    (hud.leaderboardMaxRanks ?? 5) === preset
                      ? 'bg-amber-400 text-stone-950 font-bold'
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
                value={hud.leaderboardMaxRanks ?? 5}
                onChange={(e) =>
                  onUpdateHudLayout({
                    leaderboardMaxRanks: Math.max(
                      1,
                      Math.min(20, parseInt(e.target.value, 10) || 5)
                    ),
                  })
                }
                className="w-20 accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
              />
              <span className="text-[11px] font-mono font-bold text-amber-300 w-12 text-right">
                Top {hud.leaderboardMaxRanks ?? 5}
              </span>
            </div>
          </div>
        </div>

        {/* Chỉnh sửa Tiêu đề, Nội dung & Size chữ của Bảng Thông Báo */}
        <div className="p-2.5 rounded-lg bg-stone-950/90 border border-stone-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-amber-300">
              Nội dung & Cỡ chữ Bảng Thông Báo:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10.5px] text-stone-400">Size chữ:</span>
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
            className="w-full px-2 py-1 rounded bg-stone-900 border border-stone-800 text-xs text-amber-200 font-semibold focus:outline-none focus:border-amber-500"
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
            placeholder="Nhập nội dung thông báo hiển thị trên sân..."
            className="w-full px-2 py-1.5 rounded bg-stone-900 border border-stone-800 text-xs text-stone-100 focus:outline-none focus:border-amber-500 resize-y"
          />
        </div>
      </section>

      {/* Section 4: Sự Kiện Đại Lễ & Phật Tử Giữ Nhiệt Trên Sân */}
      <section className="p-3 rounded-xl bg-stone-900/70 border border-stone-800 space-y-3">
        {/* Sự kiện đại lễ */}
        <div className="space-y-2">
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
              <span>Tim (+10 🌸)</span>
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

          {/* Giới hạn số hoa sen bay hiển thị cùng lúc khi có người thả tim */}
          <div className="p-2.5 rounded-lg bg-stone-950/90 border border-pink-500/30 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold text-pink-200">
                  🌸 Giới hạn số hoa sen bay hiển thị khi Thả Tim
                </div>
                <div className="text-[10px] text-stone-400">
                  Tránh lag/rối mắt khi quá nhiều người thả tim cùng lúc (điểm tim vẫn cộng đủ)
                </div>
              </div>
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
                    {num === 0 ? 'Tắt (0)' : num}
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
        </div>

        <hr className="border-stone-800" />

        {/* Số Phật tử cho phép vào sân (Sức chứa tối đa trên sân) */}
        <div className="space-y-2">
          <div className="p-2.5 rounded-lg bg-stone-950/90 border border-emerald-500/35 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold text-emerald-200">
                  🚪 Số Phật tử cho phép vào sân (Sức chứa Chánh Điện)
                </h2>
                <p className="text-[10px] text-stone-400">
                  Giới hạn tổng số Phật tử (Người thật + NPC) có mặt trên sân cùng lúc. Khi đầy, khách mới sẽ vào Hàng chờ (Người thật được ưu tiên nhường chỗ trước NPC).
                </p>
              </div>
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

            <div className="flex items-center justify-between text-[10.5px] pt-1 border-t border-stone-800/80 font-mono">
              <span className="text-emerald-300">
                👤 Người thật: <b>{realCount}</b>
              </span>
              <span className="text-amber-300">
                🤖 NPC: <b>{botCount}</b>
              </span>
              <span className="text-cyan-300">
                ⏳ Hàng chờ: <b>{queueCount}</b>
              </span>
              <span className="text-stone-200">
                Tổng sân: <b>{realCount + botCount}/{config.maxStageCapacity || 36}</b>
              </span>
            </div>
          </div>

          {/* Điều chỉnh thời gian ngồi trên Ghế VIP / Ghế Thường riêng biệt */}
          <div className="p-2.5 rounded-lg bg-stone-950/90 border border-amber-500/35 space-y-3">
            <div>
              <div className="text-[11px] font-bold text-amber-200">
                ⏱️ Thời gian ngồi trên Ghế VIP / Ghế Thường (Riêng biệt)
              </div>
              <div className="text-[10px] text-stone-400">
                Tính từ lúc bái lạy & ngồi thiền trên ghế VIP hoặc chiếu thường cho tới khi đứng dậy ra về
              </div>
            </div>

            {/* 1. Thời gian ngồi Ghế VIP */}
            <div className="p-2 rounded-lg bg-amber-950/25 border border-amber-500/30 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-amber-300">
                  👑 Thời gian ngồi Ghế VIP
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={3}
                    max={600}
                    value={config.vipPrayDurationSec ?? config.prayDurationSec ?? 35}
                    onChange={(e) =>
                      onUpdateConfig({
                        vipPrayDurationSec: Math.max(
                          3,
                          Math.min(600, parseInt(e.target.value, 10) || 3)
                        ),
                      })
                    }
                    className="w-14 px-1.5 py-0.5 rounded bg-stone-900 border border-amber-500/40 text-xs font-mono font-bold text-amber-300 text-right"
                  />
                  <span className="text-[11px] font-mono text-amber-300">giây</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 shrink-0">
                  {[15, 30, 45, 60, 120].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => onUpdateConfig({ vipPrayDurationSec: sec })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition ${
                        (config.vipPrayDurationSec ?? config.prayDurationSec ?? 35) === sec
                          ? 'bg-amber-400 text-stone-950 font-bold'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
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
                  className="flex-1 accent-amber-400 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* 2. Thời gian ngồi Ghế Thường */}
            <div className="p-2 rounded-lg bg-stone-900/80 border border-stone-800 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-emerald-300">
                  🧘 Thời gian ngồi Ghế Thường
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={3}
                    max={600}
                    value={config.normalPrayDurationSec ?? config.prayDurationSec ?? 22}
                    onChange={(e) =>
                      onUpdateConfig({
                        normalPrayDurationSec: Math.max(
                          3,
                          Math.min(600, parseInt(e.target.value, 10) || 3)
                        ),
                      })
                    }
                    className="w-14 px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-xs font-mono font-bold text-emerald-300 text-right"
                  />
                  <span className="text-[11px] font-mono text-emerald-300">giây</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 shrink-0">
                  {[10, 20, 30, 60, 120].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => onUpdateConfig({ normalPrayDurationSec: sec })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition ${
                        (config.normalPrayDurationSec ?? config.prayDurationSec ?? 22) === sec
                          ? 'bg-emerald-400 text-stone-950 font-bold'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
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
                  className="flex-1 accent-emerald-400 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
