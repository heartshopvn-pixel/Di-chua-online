import React from 'react';
import { useProcessedSpriteFrames } from '../../services/spriteProcessor';
import { CustomAssetsConfig, PilgrimData, PilgrimFrameIndex, Point2D } from '../../types/game';
import { OfferingModelArt } from './OfferingModelArt';

interface PilgrimSpriteProps {
  pilgrim: PilgrimData;
  customAssets: CustomAssetsConfig;
  incenseBurner?: Point2D;
  characterScale?: number;
  nameTagFontFamily?: string;
  nameTagScale?: number;
  chatBubbleFontFamily?: string;
  chatBubbleScale?: number;
  alwaysShowBubble?: boolean;
  isControlled?: boolean;
}

/**
 * Xác định Frame Index (0 -> 9) theo đúng trạng thái di chuyển Orthogonal 2D:
 * 0: mặt trước - đi - bước chân trái
 * 1: mặt trước - đi - bước chân phải
 * 2: mặt lưng - đi - bước chân trái
 * 3: mặt lưng - đi - bước chân phải
 * 4: mặt lưng - đứng - thắp nhang
 * 5: mặt lưng - ngồi - chắp tay (ngồi yên)
 * 6: mặt lưng - quỳ lạy (bái lạy)
 * 7: mặt lưng - dâng đồ cúng (2 tay vươn lên đỡ vật nặng)
 * 8: mặt bên - bước chân trái
 * 9: mặt bên - bước chân phải
 */
export function getPilgrimFrameIndex(p: PilgrimData): PilgrimFrameIndex {
  const stepToggle = Math.floor(p.animTime * 5) % 2 === 0;

  if (p.state === 'manual_control') {
    switch (p.manualMoveDir) {
      case 'up':
        return stepToggle ? 2 : 3;
      case 'down':
        return stepToggle ? 0 : 1;
      case 'left':
      case 'right':
        return stepToggle ? 8 : 9;
      case 'wooden_fish':
        return 6;
      case 'idle':
      default:
        return 4;
    }
  }

  switch (p.state) {
    case 'walk_in_up':
      if (Math.abs((p.laneX || 270) - p.x) > 4) {
        return stepToggle ? 8 : 9;
      }
      // Khi dâng lễ (isVip / coins > 0): đổi thành animation dâng lễ (Frame 7) dẫn người chơi đi đến trước lư hương
      if (p.isVip || p.coins > 0) {
        return 7;
      }
      return stepToggle ? 2 : 3;

    case 'throw_offering_at_burner':
      // Đứng giơ 2 tay ném lễ vật vào lư hương
      return 7;

    case 'ceremony_at_burner':
      // Thắp nhang trước lư hương (Frame 4)
      return 4;

    case 'walk_to_vip_check':
      // Đi từ lư hương xuống vị trí hàng slot VIP
      return stepToggle ? 0 : 1;

    case 'wait_for_vip_slot':
      // Đứng tại hàng ghế VIP chờ có slot VIP trống
      return 4;

    case 'walk_side_to_slot':
    case 'leave_side_to_aisle':
      return stepToggle ? 8 : 9;

    case 'walk_vert_to_slot':
      return p.slotY > p.y ? (stepToggle ? 0 : 1) : stepToggle ? 2 : 3;

    case 'pray_seated': {
      // Bắt đầu là bái vài cái (Frame 6 xen kẽ Frame 5) xong ngồi yên (Frame 5)
      const totalDur = Math.max(3, p.totalPrayDuration || 3);
      const elapsed = Math.max(0, totalDur - p.prayTimer);
      const bowWindow = Math.min(2.4, totalDur * 0.65);

      if (elapsed < bowWindow) {
        // Thực hiện 2-3 nhịp bái đầu tiên
        const bowCycle = elapsed % 0.8;
        return bowCycle < 0.5 ? 6 : 5;
      }
      // Sau khi bái vài cái xong thì ngồi yên chắp tay (Frame 5)
      return 5;
    }

    case 'leave_down_exit':
    default:
      return stepToggle ? 0 : 1;
  }
}

/**
 * Hình bông hoa sen hồng nhỏ được vẽ tỉ mỉ nhiều lớp cánh + đài sen vàng, kích thước nhỏ xinh
 */
const MiniPinkLotusSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={className || 'w-2.5 h-2.5'}
    style={{ filter: 'drop-shadow(0 0 3px rgba(244, 114, 182, 0.85))' }}
  >
    {/* Cánh nền phía sau */}
    <path
      d="M16 4 C11.5 10 9.5 16.5 16 24 C22.5 16.5 20.5 10 16 4 Z"
      fill="#fbcfe8"
    />
    {/* Hai cánh mở tầng ngoài */}
    <path
      d="M16 24 C7.5 23 3 17.5 5 11.5 C9.5 14 12.5 19 16 24 Z"
      fill="#ec4899"
    />
    <path
      d="M16 24 C24.5 23 29 17.5 27 11.5 C22.5 14 19.5 19 16 24 Z"
      fill="#ec4899"
    />
    {/* Hai cánh ôm tầng giữa */}
    <path
      d="M16 23.5 C10 20.5 7 13.5 10.5 8 C13.5 11.5 14.5 17.5 16 23.5 Z"
      fill="#f472b6"
    />
    <path
      d="M16 23.5 C22 20.5 25 13.5 21.5 8 C18.5 11.5 17.5 17.5 16 23.5 Z"
      fill="#f472b6"
    />
    {/* Cánh búp chính giữa */}
    <path
      d="M16 6.5 C13 11.5 12 17 16 23.5 C20 17 19 11.5 16 6.5 Z"
      fill="#f9a8d4"
    />
    {/* Nhụy sen vàng sáng */}
    <ellipse cx="16" cy="19.5" rx="3.2" ry="1.6" fill="#fde047" />
    <circle cx="14.5" cy="18.2" r="0.8" fill="#fef08a" />
    <circle cx="16" cy="17.8" r="0.9" fill="#fef08a" />
    <circle cx="17.5" cy="18.2" r="0.8" fill="#fef08a" />
  </svg>
);

export const PilgrimSprite: React.FC<PilgrimSpriteProps> = React.memo(
  ({
    pilgrim,
    customAssets,
    incenseBurner,
    characterScale = 1,
    nameTagFontFamily = 'Inter, system-ui, sans-serif',
    nameTagScale = 1,
    chatBubbleFontFamily = 'Inter, system-ui, sans-serif',
    chatBubbleScale = 1,
    alwaysShowBubble = false,
    isControlled = false,
  }) => {
    const {
      x,
      y,
      username,
      prayer,
      gender,
      isVip,
      coins,
      offeringType,
      state,
      stateTimer,
      facingLeft,
      avatarColor,
      avatarUrl,
      hasGoldenAura,
      comboCount,
      giftName,
      comboPopKey,
      lotusBurstUntil,
      lotusBurstKey,
      chatBubbleUntil,
      woodenFishRippleUntil,
    } = pilgrim;

    const [avatarStage, setAvatarStage] = React.useState<'direct' | 'proxy' | 'failed'>('direct');
    React.useEffect(() => {
      setAvatarStage('direct');
    }, [avatarUrl]);

    const effectiveAvatarSrc = React.useMemo(() => {
      if (!avatarUrl || avatarStage === 'failed') return null;
      if (
        avatarStage === 'proxy' &&
        (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))
      ) {
        return `https://wsrv.nl/?url=${encodeURIComponent(avatarUrl)}&w=64&h=64&fit=cover`;
      }
      return avatarUrl;
    }, [avatarUrl, avatarStage]);

    const sheetUrl =
      gender === 'female'
        ? customAssets.pilgrimFemaleSpritesheetUrl
        : customAssets.pilgrimMaleSpritesheetUrl;
    const processedFrames = useProcessedSpriteFrames(sheetUrl, 10);

    // Phối cảnh chiều sâu nhân với hệ số size nhân vật chung (characterScale)
    const minY = 550;
    const maxY = 950;
    const t = Math.max(0, Math.min(1, (y - minY) / (maxY - minY)));
    const depthScale = 0.6 + t * 0.4;
    const scale = depthScale * characterScale;

    const frameIndex = getPilgrimFrameIndex(pilgrim);
    const isSideFrame = frameIndex === 8 || frameIndex === 9;
    const flipX = isSideFrame && facingLeft ? -1 : 1;

    // Điều chỉnh vị trí bong bóng chat hạ thấp tương ứng khi nhân vật ngồi xuống (frame 5) hoặc bái lạy / gõ mõ (frame 6)
    const bubbleBottomPx =
      frameIndex === 6 ? 56 : frameIndex === 5 ? 74 : 104;
    const rippleBottomPx = bubbleBottomPx + 22;

    const avatarInitial = (username || 'P').trim().charAt(0).toUpperCase();
    const isLeaving =
      state === 'leave_side_to_aisle' || state === 'leave_down_exit';
    const isVipStyled = isVip || coins > 0;
    const isOfferingAction =
      (state === 'walk_in_up' && isVipStyled) ||
      state === 'throw_offering_at_burner' ||
      (state === 'ceremony_at_burner' && isVipStyled) ||
      state === 'walk_to_vip_check' ||
      state === 'wait_for_vip_slot';

    const displayPrayer = (prayer || '').trim();

    const nowMs = Date.now();
    const showLotusBurst = Boolean(lotusBurstUntil && nowMs < lotusBurstUntil);
    const showWoodenFishRipple = Boolean(
      woodenFishRippleUntil && nowMs < woodenFishRippleUntil
    );
    const showChatBubble =
      !isLeaving &&
      !isOfferingAction &&
      Boolean(displayPrayer) &&
      Boolean(
        chatBubbleUntil &&
          chatBubbleUntil > 0 &&
          (alwaysShowBubble || nowMs < chatBubbleUntil)
      );

    const hasCombo = Boolean(comboCount && comboCount > 1 && !isLeaving);

    // Hiển thị model lễ vật trên 2 tay khi đang đi dâng lễ lên lư hương
    const showOfferingOnHands = state === 'walk_in_up' && isVipStyled;

    // Hiệu ứng ném model lễ vật từ tay vào lư hương rồi tan biến
    const isThrowingOffering = state === 'throw_offering_at_burner';
    const throwDuration = 0.55;
    const throwProgress = isThrowingOffering
      ? Math.max(0, Math.min(1, 1 - stateTimer / throwDuration))
      : 0;

    // Tính độ lệch từ vị trí nhân vật tới lư hương khi ném
    const burnerX = incenseBurner ? incenseBurner.x : 270;
    const burnerY = incenseBurner ? incenseBurner.y : 485;
    const deltaBurnerX = (burnerX - x) / Math.max(0.4, scale);
    const deltaBurnerY = (burnerY - (y - 96 * scale)) / Math.max(0.4, scale);
    const arcLift = Math.sin(throwProgress * Math.PI) * -34;
    const throwTranslateX = deltaBurnerX * throwProgress;
    const throwTranslateY = deltaBurnerY * throwProgress + arcLift;
    const throwScale = 1.15 - throwProgress * 0.85;
    const throwOpacity = throwProgress > 0.85 ? (1 - throwProgress) / 0.15 : 1;

    return (
      <div
        className="absolute w-[74px] h-[108px] origin-bottom pointer-events-none will-change-transform"
        style={{
          left: `${x - 37}px`,
          top: `${y - 102}px`,
          transform: `scale(${scale.toFixed(3)})`,
          zIndex: Math.round(y),
        }}
      >
        {/* Vòng đánh dấu khi người dùng đang điều khiển trực tiếp nhân vật này (AWSD/Q) */}
        {isControlled && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-4 rounded-full border-2 border-cyan-300 bg-cyan-400/25 shadow-[0_0_12px_#22d3ee] animate-pulse -z-10" />
        )}

        {/* Ánh hào quang hoàng kim rực rỡ cho quà Đặc Biệt (>10 coin) */}
        {hasGoldenAura && (
          <div className="absolute inset-x-[-18px] top-[2px] bottom-[-6px] pointer-events-none -z-10 flex items-center justify-center">
            <div className="w-[96px] h-[96px] rounded-full bg-gradient-to-t from-amber-500/45 via-yellow-300/55 to-amber-200/20 blur-[6px] animate-pulse" />
            <div
              className="absolute w-[84px] h-[84px] rounded-full border-2 border-yellow-300/80 shadow-[0_0_20px_#facc15] animate-spin"
              style={{ animationDuration: '6s' }}
            />
          </div>
        )}

        {/* Nhịp Gõ Mõ (Phím Q) */}
        {showWoodenFishRipple && (
          <div
            className="absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[9px] font-extrabold shadow-md whitespace-nowrap animate-bounce z-40 transition-[bottom] duration-200 ease-out"
            style={{ bottom: `${rippleBottomPx}px` }}
          >
            🪵 Cốc! Nam Mô A Di Đà Phật
          </div>
        )}

        {/* Bong bóng chat cầu nguyện trên đầu nhân vật (Tự động hạ thấp sát đầu khi ngồi xuống hoặc bái lạy) */}
        {showChatBubble && (
          <div
            className={`
              absolute left-1/2 w-max max-w-[168px] px-2 py-1 rounded-lg text-[10px] font-semibold leading-tight text-center backdrop-blur-xs break-words whitespace-normal origin-bottom transition-[bottom] duration-200 ease-out z-30
              ${
                hasGoldenAura
                  ? 'bg-stone-950/95 border-2 border-yellow-300 text-yellow-300 shadow-[0_0_14px_rgba(250,204,21,0.75)]'
                  : isVipStyled
                  ? 'bg-stone-950/92 border-2 border-yellow-400 text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.45)]'
                  : 'bg-stone-950/85 border border-stone-500/60 text-stone-100'
              }
            `}
            style={{
              bottom: `${bubbleBottomPx}px`,
              fontFamily: chatBubbleFontFamily,
              transform: `translateX(-50%) scale(${chatBubbleScale.toFixed(2)})`,
            }}
          >
            {hasCombo && (
              <div
                key={comboPopKey || comboCount}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 mb-0.5 rounded bg-gradient-to-r from-rose-600 via-amber-500 to-yellow-400 text-stone-950 text-[9px] font-black tracking-tight shadow-sm whitespace-nowrap"
              >
                <span>🔥 {giftName || 'COMBO'}</span>
                <span className="text-[10px] font-extrabold">x{comboCount}</span>
              </div>
            )}
            <div>{displayPrayer}</div>
          </div>
        )}

        {/* Huy hiệu COMBO nổi bật ngay cả khi bong bóng chat đã tắt */}
        {!showChatBubble && hasCombo && (
          <div
            key={comboPopKey || comboCount}
            className="absolute left-1/2 px-2 py-0.5 rounded-md bg-gradient-to-r from-rose-600 via-amber-500 to-yellow-400 border border-yellow-200 text-stone-950 text-[9.5px] font-black shadow-[0_0_10px_rgba(250,204,21,0.8)] whitespace-nowrap z-30 origin-bottom transition-[bottom] duration-200 ease-out"
            style={{
              bottom: `${bubbleBottomPx}px`,
              fontFamily: chatBubbleFontFamily,
              transform: `translateX(-50%) scale(${chatBubbleScale.toFixed(2)})`,
            }}
          >
            🔥 {giftName || 'COMBO'} x{comboCount}
          </div>
        )}

        {/* Khung hiển thị Nhân vật */}
        <div
          className="relative w-full h-full flex items-end justify-center"
          style={{
            transform: `scaleX(${flipX})`,
          }}
        >
          {processedFrames && processedFrames[frameIndex] ? (
            <img
              src={processedFrames[frameIndex]}
              alt=""
              className="w-full h-full object-contain"
            />
          ) : null}

          {/* Model lễ vật đặt trên 2 tay vươn lên khi đi vào (Frame 7) */}
          {showOfferingOnHands && (
            <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 pointer-events-none z-20">
              <OfferingModelArt
                type={offeringType || 'rose'}
                customAssets={customAssets}
                className="w-7 h-7"
              />
            </div>
          )}

          {/* Model lễ vật đang được ném từ tay vào lư hương */}
          {isThrowingOffering && (
            <div
              className="absolute -top-[6px] left-1/2 -translate-x-1/2 pointer-events-none z-30"
              style={{
                transform: `translate(${throwTranslateX.toFixed(1)}px, ${throwTranslateY.toFixed(1)}px) scale(${throwScale.toFixed(2)})`,
                opacity: throwOpacity,
              }}
            >
              <OfferingModelArt
                type={offeringType || 'rose'}
                customAssets={customAssets}
                className="w-8 h-8"
              />
            </div>
          )}
        </div>

        {/* 3 bông hoa sen nhỏ nằm ngay phía trên tên người chơi (đè lên model người chơi) và bay lên nhẹ nhàng khi Thả Tim */}
        {showLotusBurst && (
          <div
            key={lotusBurstKey || 1}
            className="absolute bottom-[4px] left-1/2 -translate-x-1/2 w-12 h-5 pointer-events-none z-30 flex items-center justify-center gap-1"
          >
            <span className="lotus-head-float-1">
              <MiniPinkLotusSvg className="w-2.5 h-2.5" />
            </span>
            <span className="lotus-head-float-2 -mt-0.5">
              <MiniPinkLotusSvg className="w-3 h-3" />
            </span>
            <span className="lotus-head-float-3">
              <MiniPinkLotusSvg className="w-2.5 h-2.5" />
            </span>
          </div>
        )}

        {/* Thẻ tên dưới chân (Có hỗ trợ load Avatar thật hoặc Avatar từ Pool NPC bên trái tên) */}
        <div
          className={`absolute -bottom-[13px] left-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-md whitespace-nowrap text-[9.5px] font-semibold border z-20 origin-top ${
            hasGoldenAura
              ? 'border-yellow-300 bg-stone-950/95 text-yellow-300 shadow-[0_0_8px_rgba(250,204,21,0.55)]'
              : isVipStyled
              ? 'border-yellow-400 bg-stone-950/95 text-yellow-300'
              : 'border-stone-500/40 bg-stone-950/85 text-stone-100'
          }`}
          style={{
            fontFamily: nameTagFontFamily,
            transform: `translateX(-50%) scale(${nameTagScale.toFixed(2)})`,
          }}
        >
          {effectiveAvatarSrc ? (
            <img
              src={effectiveAvatarSrc}
              alt={username}
              referrerPolicy="no-referrer"
              onError={() => {
                if (
                  avatarStage === 'direct' &&
                  avatarUrl &&
                  (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))
                ) {
                  setAvatarStage('proxy');
                } else {
                  setAvatarStage('failed');
                }
              }}
              className="w-3.5 h-3.5 rounded-sm object-cover shrink-0 border border-white/25 bg-stone-900"
            />
          ) : (
            <span
              className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[8px] font-black text-white shrink-0"
              style={{ background: avatarColor }}
            >
              {avatarInitial}
            </span>
          )}
          <span className="max-w-[78px] truncate">{username}</span>
        </div>
      </div>
    );
  }
);


