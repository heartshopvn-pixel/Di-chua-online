import React from 'react';
import { BellRing, Gift, Move, Users } from 'lucide-react';
import {
  CustomAssetsConfig,
  DonorEntry,
  FloatingToastItem,
  GuideTaskItem,
  HudLayoutConfig,
  OfferingGiftType,
} from '../../types/game';
import { DEFAULT_GUIDE_ITEMS } from '../../config/constants';
import { OfferingModelArt } from './OfferingModelArt';

export type HudBoxKey =
  | 'templeSign'
  | 'leaderboardBox'
  | 'guideBox'
  | 'toastBox'
  | 'grandEventBox'
  | 'pilgrimCountBox'
  | 'noticeBoardBox';

export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

interface StageHudProps {
  hudLayout: HudLayoutConfig;
  customAssets: CustomAssetsConfig;
  donors: DonorEntry[];
  floatingToasts: FloatingToastItem[];
  grandEventProgress: number;
  grandEventTarget: number;
  isGrandEventActive: boolean;
  eventBarFlashKey?: number;
  currentPilgrimCount: number;
  totalSeatCapacity: number;
  onStartDragHudBox: (
    boxKey: HudBoxKey,
    e: React.MouseEvent | React.TouchEvent
  ) => void;
  onStartResizeHudBox: (
    boxKey: HudBoxKey,
    corner: ResizeCorner,
    e: React.MouseEvent | React.TouchEvent
  ) => void;
}

interface CornerHandlesProps {
  boxKey: HudBoxKey;
  onStartResizeHudBox: (
    boxKey: HudBoxKey,
    corner: ResizeCorner,
    e: React.MouseEvent | React.TouchEvent
  ) => void;
}

const CornerResizeHandles: React.FC<CornerHandlesProps> = ({
  boxKey,
  onStartResizeHudBox,
}) => {
  const handleDown =
    (corner: ResizeCorner) => (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      onStartResizeHudBox(boxKey, corner, e);
    };

  return (
    <>
      <span
        onMouseDown={handleDown('nw')}
        onTouchStart={handleDown('nw')}
        title="Kéo góc để chỉnh kích thước bảng"
        className="pointer-events-auto absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-sm bg-emerald-400 border-2 border-stone-950 shadow cursor-nwse-resize z-50 hover:scale-125 transition-transform"
      />
      <span
        onMouseDown={handleDown('ne')}
        onTouchStart={handleDown('ne')}
        title="Kéo góc để chỉnh kích thước bảng"
        className="pointer-events-auto absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-sm bg-emerald-400 border-2 border-stone-950 shadow cursor-nesw-resize z-50 hover:scale-125 transition-transform"
      />
      <span
        onMouseDown={handleDown('sw')}
        onTouchStart={handleDown('sw')}
        title="Kéo góc để chỉnh kích thước bảng"
        className="pointer-events-auto absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 rounded-sm bg-emerald-400 border-2 border-stone-950 shadow cursor-nesw-resize z-50 hover:scale-125 transition-transform"
      />
      <span
        onMouseDown={handleDown('se')}
        onTouchStart={handleDown('se')}
        title="Kéo góc để chỉnh kích thước bảng"
        className="pointer-events-auto absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-sm bg-emerald-400 border-2 border-stone-950 shadow cursor-nwse-resize z-50 hover:scale-125 transition-transform"
      />
    </>
  );
};

function clampOpacity(val: number | undefined, fallback: number): number {
  if (typeof val !== 'number' || Number.isNaN(val)) return fallback;
  return Math.max(0, Math.min(1, val));
}

function buildBoxSurfaceStyle(
  op: number,
  borderRgb = '251, 191, 36',
  borderMaxAlpha = 0.65,
  bgRgb = '12, 10, 9'
): React.CSSProperties {
  if (op <= 0.005) {
    return {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      boxShadow: 'none',
      backdropFilter: 'none',
      textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.85)',
    };
  }
  const bAlpha = (borderMaxAlpha * op).toFixed(2);
  const sAlpha = (0.55 * op).toFixed(2);
  return {
    backgroundColor: `rgba(${bgRgb}, ${op.toFixed(2)})`,
    borderColor: `rgba(${borderRgb}, ${bAlpha})`,
    boxShadow: `0 10px 25px -5px rgba(0, 0, 0, ${sAlpha})`,
    backdropFilter: op >= 0.15 ? `blur(${Math.round(op * 8)}px)` : 'none',
    textShadow: op < 0.45 ? '0 1px 3px rgba(0,0,0,0.95)' : undefined,
  };
}

function getGuideTaskColorClasses(item: GuideTaskItem): {
  borderRgb: string;
  labelClass: string;
  descClass: string;
} {
  const theme =
    item.colorTheme ||
    (item.modelType === 'rose'
      ? 'pink'
      : item.modelType === 'lotus' || item.modelType === 'tray'
      ? 'amber'
      : item.modelType === 'special_tray'
      ? 'yellow'
      : 'stone');

  switch (theme) {
    case 'pink':
      return {
        borderRgb: '244, 114, 182',
        labelClass: 'text-pink-300',
        descClass: 'text-stone-100',
      };
    case 'amber':
      return {
        borderRgb: '251, 191, 36',
        labelClass: 'text-amber-300',
        descClass: 'text-amber-100',
      };
    case 'yellow':
      return {
        borderRgb: '253, 224, 71',
        labelClass: 'text-yellow-300',
        descClass: 'text-yellow-100 font-semibold',
      };
    case 'emerald':
      return {
        borderRgb: '52, 211, 153',
        labelClass: 'text-emerald-300',
        descClass: 'text-emerald-200',
      };
    case 'cyan':
      return {
        borderRgb: '34, 211, 238',
        labelClass: 'text-cyan-300',
        descClass: 'text-cyan-100',
      };
    default:
      return {
        borderRgb: '168, 162, 158',
        labelClass: 'text-amber-200',
        descClass: 'text-stone-200',
      };
  }
}

export const StageHud: React.FC<StageHudProps> = ({
  hudLayout,
  customAssets,
  donors,
  floatingToasts,
  grandEventProgress,
  grandEventTarget,
  isGrandEventActive,
  eventBarFlashKey,
  currentPilgrimCount,
  totalSeatCapacity,
  onStartDragHudBox,
  onStartResizeHudBox,
}) => {
  const {
    templeSign,
    leaderboardBox,
    guideBox,
    toastBox,
    grandEventBox,
    pilgrimCountBox,
    noticeBoardBox,
    leaderboardTitle,
    guideTitle,
    grandEventTitle,
    pilgrimCountTitle,
    noticeBoardTitle = 'Bảng thông báo',
    noticeBoardContent = 'Chào mừng Phật tử thập phương về Kim Thiền Tự lễ Phật, cầu bình an & sức khỏe 🙏',
    noticeBoardFontSize = 10,
    grandEventFontSize = 10,
    leaderboardFontSize = 10,
    guideFontSize = 9,
    pilgrimCountFontSize = 10,
    toastFontSize = 10,
    showTempleSign = true,
    showGrandEventBox = true,
    showPilgrimCountBox = true,
    showLeaderboardBox = true,
    showGuideBox = true,
    showNoticeBoardBox = true,
    showToastBox = true,
    leaderboardMaxRanks = 5,
    hudOpacity = 0.88,
    noticeBoardOpacity,
    grandEventOpacity,
    leaderboardOpacity,
    guideOpacity,
    pilgrimCountOpacity,
    toastOpacity,
    templeSignOpacity,
    guideItems,
    editLayoutMode,
  } = hudLayout;

  const safeNoticeFontSize = Math.max(7, Math.min(24, noticeBoardFontSize || 10));
  const safeGrandEventFontSize = Math.max(7, Math.min(24, grandEventFontSize || 10));
  const safeLeaderboardFontSize = Math.max(7, Math.min(24, leaderboardFontSize || 10));
  const safeGuideFontSize = Math.max(7, Math.min(24, guideFontSize || 9));
  const safePilgrimCountFontSize = Math.max(7, Math.min(24, pilgrimCountFontSize || 10));
  const safeToastFontSize = Math.max(7, Math.min(24, toastFontSize || 10));
  const safeLeaderboardMaxRanks = Math.max(1, Math.min(20, leaderboardMaxRanks || 5));

  // Cho phép chỉnh độ mờ nền của từng bảng riêng biệt từ 0% (mất nền hoàn toàn) đến 100%
  const defaultOp = clampOpacity(hudOpacity, 0.88);
  const opNotice = clampOpacity(noticeBoardOpacity, defaultOp);
  const opGrandEvent = clampOpacity(grandEventOpacity, defaultOp);
  const opLeaderboard = clampOpacity(leaderboardOpacity, defaultOp);
  const opGuide = clampOpacity(guideOpacity, defaultOp);
  const opPilgrimCount = clampOpacity(pilgrimCountOpacity, defaultOp);
  const opToast = clampOpacity(toastOpacity, defaultOp);
  const opTempleSign = clampOpacity(templeSignOpacity, 1);

  const activeGuideItems = Array.isArray(guideItems)
    ? guideItems
    : DEFAULT_GUIDE_ITEMS;

  const topDonors = [...donors]
    .sort((a, b) => b.coins - a.coins)
    .slice(0, safeLeaderboardMaxRanks);
  const safeTarget = Math.max(1, grandEventTarget || 1000);
  const progressPercent = isGrandEventActive
    ? 100
    : Math.min(100, Math.round((grandEventProgress / safeTarget) * 100));

  const dragringClass = editLayoutMode
    ? 'pointer-events-auto cursor-move ring-2 ring-amber-400/90 hover:ring-emerald-400'
    : 'pointer-events-none';

  const safePilgrimBox = pilgrimCountBox || {
    x: 12,
    y: 152,
    width: 136,
    height: 32,
  };

  const safeNoticeBoardBox = noticeBoardBox || {
    x: 12,
    y: 190,
    width: 168,
    height: 76,
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {/* 1. HÌNH VÀNG: Bảng tên chùa (Là hình PNG cắt nền chèn vào, KHÔNG TEXT) */}
      {showTempleSign && (
        <div
          onMouseDown={(e) => editLayoutMode && onStartDragHudBox('templeSign', e)}
          onTouchStart={(e) => editLayoutMode && onStartDragHudBox('templeSign', e)}
          className={`absolute flex items-center justify-center select-none ${dragringClass}`}
          style={{
            left: `${templeSign.x}px`,
            top: `${templeSign.y}px`,
            width: `${templeSign.width}px`,
            height: `${templeSign.height}px`,
            opacity: opTempleSign,
          }}
        >
          {customAssets.templeSignPngUrl ? (
            <img
              src={customAssets.templeSignPngUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)]"
            />
          ) : (
            /* Hoành phi chạm khắc vàng cắt nền mặc định (Không có chữ) */
            <svg
              className="w-full h-full drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)]"
              viewBox="0 0 200 76"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="plaqueGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#854d0e" />
                </linearGradient>
                <linearGradient id="plaqueWood" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#451a03" />
                  <stop offset="50%" stopColor="#290f02" />
                  <stop offset="100%" stopColor="#1c0a00" />
                </linearGradient>
              </defs>
              <path
                d="M12 10 L188 10 L196 20 L196 56 L188 66 L12 66 L4 56 L4 20 Z"
                fill="url(#plaqueWood)"
                stroke="url(#plaqueGold)"
                strokeWidth="4"
              />
              <rect
                x="12"
                y="16"
                width="176"
                height="44"
                rx="4"
                fill="none"
                stroke="#fde047"
                strokeWidth="1.2"
                strokeDasharray="4 2"
                opacity="0.7"
              />
              <circle cx="100" cy="38" r="12" fill="url(#plaqueGold)" opacity="0.85" />
              <circle cx="52" cy="38" r="7" fill="url(#plaqueGold)" opacity="0.65" />
              <circle cx="148" cy="38" r="7" fill="url(#plaqueGold)" opacity="0.65" />
            </svg>
          )}

          {editLayoutMode && (
            <>
              <CornerResizeHandles
                boxKey="templeSign"
                onStartResizeHudBox={onStartResizeHudBox}
              />
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-amber-400 text-stone-950 text-[9px] font-bold flex items-center gap-0.5 whitespace-nowrap shadow">
                <Move className="w-2.5 h-2.5" /> Bảng Tên ({templeSign.width}×{templeSign.height})
              </span>
            </>
          )}
        </div>
      )}

      {/* 2. BẢNG SỰ KIỆN ĐẠI LỄ: Thanh tích lũy + Icon Hoa Sen Hồng nhấp nháy liên tục */}
      {showGrandEventBox && grandEventBox && (
        <div
          onMouseDown={(e) => editLayoutMode && onStartDragHudBox('grandEventBox', e)}
          onTouchStart={(e) => editLayoutMode && onStartDragHudBox('grandEventBox', e)}
          className={`absolute rounded-lg px-2.5 py-1.5 border flex flex-col justify-between transition-colors ${dragringClass}`}
          style={{
            left: `${grandEventBox.x}px`,
            top: `${grandEventBox.y}px`,
            width: `${grandEventBox.width}px`,
            height: `${grandEventBox.height}px`,
            ...buildBoxSurfaceStyle(
              opGrandEvent,
              isGrandEventActive ? '253, 224, 71' : '244, 114, 182',
              isGrandEventActive ? 0.95 : 0.65,
              isGrandEventActive ? '69, 26, 3' : '12, 10, 9'
            ),
          }}
        >
          {/* Tiêu đề & số đếm Hoa Sen */}
          <div
            className="flex items-center justify-between gap-1 pb-0.5"
            style={{
              fontSize: `${safeGrandEventFontSize}px`,
              borderBottom:
                opGrandEvent > 0.05
                  ? `1px solid rgba(244, 114, 182, ${(0.28 * opGrandEvent).toFixed(2)})`
                  : '1px solid transparent',
            }}
          >
            <span className="font-extrabold tracking-wide text-pink-200 truncate">
              {grandEventTitle || 'Sự kiện Đại Lễ'}
            </span>
            <span
              className="font-bold font-mono text-amber-300 tabular-nums shrink-0"
              style={{ fontSize: `${Math.max(7, safeGrandEventFontSize - 0.5)}px` }}
            >
              {isGrandEventActive ? 'ĐẠI LỄ!' : `${grandEventProgress}/${safeTarget}`}
            </span>
          </div>

          {/* Hàng chứa Thanh tích lũy + Icon Hoa Sen Hồng nhấp nháy bên cạnh */}
          <div className="flex items-center gap-1.5 pt-1 my-auto">
            {/* Icon Hoa Sen Hồng nhấp nháy liên tục */}
            <div className="w-6 h-6 shrink-0 flex items-center justify-center pink-lotus-blink">
              <svg viewBox="0 0 36 36" className="w-6 h-6">
                <defs>
                  <linearGradient id="pinkLotusGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fbcfe8" />
                    <stop offset="55%" stopColor="#f472b6" />
                    <stop offset="100%" stopColor="#db2777" />
                  </linearGradient>
                </defs>
                <path
                  d="M18 4 C13 11 10 18 18 26 C26 18 23 11 18 4 Z"
                  fill="url(#pinkLotusGrad)"
                />
                <path
                  d="M18 26 C9 23 5 15 9 9 C13 13 15 19 18 26 Z"
                  fill="#f472b6"
                  opacity="0.92"
                />
                <path
                  d="M18 26 C27 23 31 15 27 9 C23 13 21 19 18 26 Z"
                  fill="#f472b6"
                  opacity="0.92"
                />
                <path
                  d="M18 27 C7 27 2 21 4 15 C9 18 13 23 18 27 Z"
                  fill="#ec4899"
                />
                <path
                  d="M18 27 C29 27 34 21 32 15 C27 18 23 23 18 27 Z"
                  fill="#ec4899"
                />
                <circle cx="18" cy="21" r="2.8" fill="#fef08a" />
              </svg>
            </div>

            {/* Thanh tích lũy: Khi số tim tăng, viền thanh đếm glow hồng nháy lên 1 cái */}
            <div className="flex-1 flex flex-col gap-0.5 min-w-0">
              <div
                key={eventBarFlashKey || 0}
                className={`w-full h-2.5 rounded-full bg-stone-900/90 border border-pink-400/45 overflow-hidden p-0.5 ${
                  eventBarFlashKey ? 'event-bar-pink-flash' : ''
                }`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 via-rose-400 to-amber-300 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div
                className="flex items-center justify-between text-stone-300 leading-none"
                style={{ fontSize: `${Math.max(7, safeGrandEventFontSize - 1.5)}px` }}
              >
                <span className="truncate">
                  {isGrandEventActive
                    ? 'Chuông ngân & Mưa Sen Vàng!'
                    : 'Tim +1 · Follow +100'}
                </span>
                <span className="font-mono text-pink-300 font-semibold">
                  {progressPercent}%
                </span>
              </div>
            </div>
          </div>

          {editLayoutMode && (
            <>
              <CornerResizeHandles
                boxKey="grandEventBox"
                onStartResizeHudBox={onStartResizeHudBox}
              />
              <span className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-amber-400 text-stone-950 text-[9px] font-bold flex items-center gap-0.5 whitespace-nowrap shadow">
                <Move className="w-2.5 h-2.5" /> {grandEventTitle || 'Đại Lễ'} ({grandEventBox.width}×{grandEventBox.height})
              </span>
            </>
          )}
        </div>
      )}

      {/* 3. BẢNG ĐẾM SỐ PHẬT TỬ: x/x */}
      {showPilgrimCountBox && (
        <div
          onMouseDown={(e) => editLayoutMode && onStartDragHudBox('pilgrimCountBox', e)}
          onTouchStart={(e) => editLayoutMode && onStartDragHudBox('pilgrimCountBox', e)}
          className={`absolute rounded-lg border px-2.5 py-1 flex items-center justify-between gap-2 ${dragringClass}`}
          style={{
            left: `${safePilgrimBox.x}px`,
            top: `${safePilgrimBox.y}px`,
            width: `${safePilgrimBox.width}px`,
            height: `${safePilgrimBox.height}px`,
            fontSize: `${safePilgrimCountFontSize}px`,
            ...buildBoxSurfaceStyle(opPilgrimCount),
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-extrabold text-amber-200 truncate">
              {pilgrimCountTitle || 'Phật tử'}:
            </span>
          </div>
          <span
            className="font-extrabold font-mono text-emerald-400 tabular-nums shrink-0"
            style={{ fontSize: `${safePilgrimCountFontSize + 1}px` }}
          >
            {currentPilgrimCount}/{totalSeatCapacity}
          </span>

          {editLayoutMode && (
            <>
              <CornerResizeHandles
                boxKey="pilgrimCountBox"
                onStartResizeHudBox={onStartResizeHudBox}
              />
              <span className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-amber-400 text-stone-950 text-[9px] font-bold flex items-center gap-0.5 whitespace-nowrap shadow">
                <Move className="w-2.5 h-2.5" /> {pilgrimCountTitle || 'Phật tử'} ({safePilgrimBox.width}×{safePilgrimBox.height})
              </span>
            </>
          )}
        </div>
      )}

      {/* 4. BẢNG THÔNG BÁO CỐ ĐỊNH (Cho phép chỉnh sửa nội dung, size chữ, độ mờ nền 0%->100%, vị trí & kích thước) */}
      {showNoticeBoardBox && (
        <div
          onMouseDown={(e) => editLayoutMode && onStartDragHudBox('noticeBoardBox', e)}
          onTouchStart={(e) => editLayoutMode && onStartDragHudBox('noticeBoardBox', e)}
          className={`absolute rounded-lg border px-2.5 py-1.5 flex flex-col ${dragringClass}`}
          style={{
            left: `${safeNoticeBoardBox.x}px`,
            top: `${safeNoticeBoardBox.y}px`,
            width: `${safeNoticeBoardBox.width}px`,
            height: `${safeNoticeBoardBox.height}px`,
            ...buildBoxSurfaceStyle(opNotice),
          }}
        >
          <div
            className="flex items-center gap-1 pb-0.5 mb-1 shrink-0"
            style={{
              fontSize: `${safeNoticeFontSize}px`,
              borderBottom:
                opNotice > 0.05
                  ? `1px solid rgba(245, 158, 11, ${(0.3 * opNotice).toFixed(2)})`
                  : '1px solid transparent',
            }}
          >
            <BellRing className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="font-extrabold tracking-wide text-amber-300 truncate">
              {noticeBoardTitle || 'Bảng thông báo'}
            </span>
          </div>
          <div
            className="flex-1 overflow-hidden text-stone-100 leading-snug whitespace-pre-line break-words"
            style={{
              fontSize: `${safeNoticeFontSize}px`,
            }}
          >
            {noticeBoardContent}
          </div>

          {editLayoutMode && (
            <>
              <CornerResizeHandles
                boxKey="noticeBoardBox"
                onStartResizeHudBox={onStartResizeHudBox}
              />
              <span className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-amber-400 text-stone-950 text-[9px] font-bold flex items-center gap-0.5 whitespace-nowrap shadow">
                <Move className="w-2.5 h-2.5" /> {noticeBoardTitle || 'Thông báo'} ({safeNoticeBoardBox.width}×{safeNoticeBoardBox.height})
              </span>
            </>
          )}
        </div>
      )}

      {/* 5. HÌNH TRẮNG TRÊN: Bảng xếp hạng (Tiêu đề mặc định: Bảng công đức) */}
      {showLeaderboardBox && (
        <div
          onMouseDown={(e) => editLayoutMode && onStartDragHudBox('leaderboardBox', e)}
          onTouchStart={(e) => editLayoutMode && onStartDragHudBox('leaderboardBox', e)}
          className={`absolute rounded-lg border px-2 py-1.5 flex flex-col justify-between ${dragringClass}`}
          style={{
            left: `${leaderboardBox.x}px`,
            top: `${leaderboardBox.y}px`,
            width: `${leaderboardBox.width}px`,
            height: `${leaderboardBox.height}px`,
            ...buildBoxSurfaceStyle(opLeaderboard),
          }}
        >
          <div
            className="text-center pb-0.5 mb-1 shrink-0"
            style={{
              borderBottom:
                opLeaderboard > 0.05
                  ? `1px solid rgba(245, 158, 11, ${(0.3 * opLeaderboard).toFixed(2)})`
                  : '1px solid transparent',
            }}
          >
            <div
              className="font-extrabold tracking-wide text-amber-300 truncate"
              style={{ fontSize: `${safeLeaderboardFontSize}px` }}
            >
              {leaderboardTitle}
            </div>
          </div>
          <div
            className="space-y-0.5 flex-1 flex flex-col justify-start overflow-y-auto"
            style={{ fontSize: `${Math.max(7, safeLeaderboardFontSize - 0.5)}px` }}
          >
            {topDonors.length > 0 ? (
              topDonors.map((d, idx) => (
                <div
                  key={`${d.username}-${idx}`}
                  className="flex items-center justify-between text-stone-100 gap-1 leading-tight"
                >
                  <span className="truncate">
                    <b className="text-amber-300 font-mono mr-0.5">{idx + 1}.</b>
                    {d.username}
                  </span>
                  <span className="font-bold font-mono text-amber-400 tabular-nums shrink-0">
                    {d.coins}
                  </span>
                </div>
              ))
            ) : (
              <div className="my-auto text-center text-stone-400 italic leading-tight">
                Chưa có thí chủ dâng lễ
              </div>
            )}
          </div>

          {editLayoutMode && (
            <>
              <CornerResizeHandles
                boxKey="leaderboardBox"
                onStartResizeHudBox={onStartResizeHudBox}
              />
              <span className="absolute -top-5 right-0 px-1.5 py-0.5 rounded bg-amber-400 text-stone-950 text-[9px] font-bold flex items-center gap-0.5 whitespace-nowrap shadow">
                <Move className="w-2.5 h-2.5" /> {leaderboardTitle} ({leaderboardBox.width}×{leaderboardBox.height})
              </span>
            </>
          )}
        </div>
      )}

      {/* 6. HÌNH TRẮNG DƯỚI: Bảng hướng dẫn (Cho phép thêm/bớt dòng + chỉnh độ mờ nền đến 0% mất nền) */}
      {showGuideBox && (
        <div
          onMouseDown={(e) => editLayoutMode && onStartDragHudBox('guideBox', e)}
          onTouchStart={(e) => editLayoutMode && onStartDragHudBox('guideBox', e)}
          className={`absolute rounded-lg border p-1.5 flex flex-col justify-between overflow-visible ${dragringClass}`}
          style={{
            left: `${guideBox.x}px`,
            top: `${guideBox.y}px`,
            width: `${guideBox.width}px`,
            height: `${guideBox.height}px`,
            ...buildBoxSurfaceStyle(opGuide),
          }}
        >
          <div
            className="text-center pb-0.5 mb-1 shrink-0"
            style={{
              borderBottom:
                opGuide > 0.05
                  ? `1px solid rgba(245, 158, 11, ${(0.3 * opGuide).toFixed(2)})`
                  : '1px solid transparent',
            }}
          >
            <div
              className="font-extrabold tracking-wide text-amber-300 truncate"
              style={{ fontSize: `${safeGuideFontSize + 1}px` }}
            >
              {guideTitle}
            </div>
          </div>

          <div
            className="flex-1 flex flex-col justify-between gap-0.5 leading-tight text-stone-200 overflow-hidden"
            style={{ fontSize: `${safeGuideFontSize}px` }}
          >
            {activeGuideItems.length > 0 ? (
              activeGuideItems.map((task) => {
                const { borderRgb, labelClass, descClass } =
                  getGuideTaskColorClasses(task);
                const hasModel =
                  Boolean(task.modelType) && task.modelType !== 'none';
                const rowBg =
                  opGuide <= 0.005
                    ? 'transparent'
                    : `rgba(28, 25, 23, ${Math.min(1, opGuide * 0.92).toFixed(2)})`;
                const rowBorder =
                  opGuide <= 0.005
                    ? 'transparent'
                    : `rgba(${borderRgb}, ${(0.45 * opGuide).toFixed(2)})`;
                const badgeBg =
                  opGuide <= 0.005
                    ? 'transparent'
                    : `rgba(12, 10, 9, ${opGuide.toFixed(2)})`;
                const badgeBorder =
                  opGuide <= 0.005
                    ? 'transparent'
                    : `rgba(251, 191, 36, ${(0.65 * opGuide).toFixed(2)})`;

                return (
                  <div
                    key={task.id}
                    className="relative px-1.5 py-0.5 rounded border flex items-center justify-between gap-1"
                    style={{
                      backgroundColor: rowBg,
                      borderColor: rowBorder,
                    }}
                  >
                    {/* Ảnh hiển thị của quà dâng lên nằm bên trái phía ngoài tương ứng theo thẻ công việc */}
                    {hasModel && (
                      <div
                        title={`Model lễ vật: ${task.label} - ${task.shortDesc}`}
                        className="
                          absolute -left-7 top-1/2 -translate-y-1/2
                          w-5 h-5 rounded-md border
                          flex items-center justify-center pointer-events-none
                        "
                        style={{
                          backgroundColor: badgeBg,
                          borderColor: badgeBorder,
                          boxShadow:
                            opGuide > 0.05
                              ? `0 2px 6px rgba(0,0,0,${(0.85 * opGuide).toFixed(2)})`
                              : 'none',
                        }}
                      >
                        <OfferingModelArt
                          type={task.modelType as OfferingGiftType}
                          customAssets={customAssets}
                          className="w-4 h-4"
                        />
                      </div>
                    )}

                    <span className={`font-bold shrink-0 ${labelClass}`}>
                      {task.label ? `${task.label}:` : ''}
                    </span>
                    <span className={`truncate text-right ${descClass}`}>
                      {task.shortDesc}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="my-auto text-center text-stone-400 italic">
                Chưa có dòng hướng dẫn
              </div>
            )}
          </div>

          {editLayoutMode && (
            <>
              <CornerResizeHandles
                boxKey="guideBox"
                onStartResizeHudBox={onStartResizeHudBox}
              />
              <span className="absolute -bottom-5 right-0 px-1.5 py-0.5 rounded bg-amber-400 text-stone-950 text-[9px] font-bold flex items-center gap-0.5 whitespace-nowrap shadow">
                <Move className="w-2.5 h-2.5" /> {guideTitle} ({guideBox.width}×{guideBox.height})
              </span>
            </>
          )}
        </div>
      )}

      {/* 7. BẢNG TOAST DÂNG LỄ & THÔNG BÁO SỰ KIỆN (Tự động giãn chiều cao khi quá 2 dòng hoặc nhiều thông báo để không bao giờ bị ẩn/cắt chữ) */}
      {showToastBox && (
        <div
          onMouseDown={(e) => editLayoutMode && onStartDragHudBox('toastBox', e)}
          onTouchStart={(e) => editLayoutMode && onStartDragHudBox('toastBox', e)}
          className={`absolute rounded-lg border px-2 py-1.5 flex flex-col justify-start ${dragringClass}`}
          style={{
            left: `${toastBox.x}px`,
            top: `${toastBox.y}px`,
            width: `${toastBox.width}px`,
            minHeight: `${toastBox.height}px`,
            height: 'auto',
            ...buildBoxSurfaceStyle(opToast),
          }}
        >
          {/* Danh sách thông báo dâng lễ / sự kiện mới nhất (Hiển thị đầy đủ mọi dòng, không cắt line-clamp) */}
          <div className="w-full flex flex-col justify-start gap-1.5 pointer-events-none">
            {floatingToasts.length > 0 ? (
              floatingToasts.slice(-3).map((item) => {
                const itemBg =
                  opToast <= 0.005
                    ? 'transparent'
                    : item.isVip
                    ? `rgba(69, 26, 3, ${Math.min(1, opToast + 0.06).toFixed(2)})`
                    : `rgba(28, 25, 23, ${Math.min(1, opToast).toFixed(2)})`;
                const itemBorder =
                  opToast <= 0.005
                    ? 'transparent'
                    : item.isVip
                    ? `rgba(250, 204, 21, ${(0.85 * opToast).toFixed(2)})`
                    : `rgba(120, 113, 108, ${(0.5 * opToast).toFixed(2)})`;

                return (
                  <div
                    key={item.id}
                    className={`toast-float-up w-full px-2 py-1 rounded-md font-semibold border leading-snug break-words whitespace-normal ${
                      item.isVip ? 'text-yellow-200' : 'text-stone-100'
                    }`}
                    style={{
                      fontSize: `${safeToastFontSize}px`,
                      backgroundColor: itemBg,
                      borderColor: itemBorder,
                      textShadow:
                        opToast < 0.45
                          ? '0 1px 3px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.85)'
                          : undefined,
                    }}
                  >
                    {item.text}
                  </div>
                );
              })
            ) : opToast > 0.02 || editLayoutMode ? (
              <div
                className="flex items-center gap-1.5 text-amber-200/80 italic leading-snug break-words whitespace-normal my-auto"
                style={{ fontSize: `${Math.max(8, safeToastFontSize - 0.5)}px` }}
              >
                <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Đón nhận lễ vật & lời cầu an...</span>
              </div>
            ) : null}
          </div>

          {editLayoutMode && (
            <>
              <CornerResizeHandles
                boxKey="toastBox"
                onStartResizeHudBox={onStartResizeHudBox}
              />
              <span className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-amber-400 text-stone-950 text-[9px] font-bold flex items-center gap-0.5 whitespace-nowrap shadow">
                <Move className="w-2.5 h-2.5" /> Toast Dâng Lễ ({toastBox.width}×{toastBox.height})
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
