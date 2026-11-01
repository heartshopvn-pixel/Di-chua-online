import React from 'react';
import { useProcessedSpriteFrames } from '../../services/spriteProcessor';
import { MonkFrameIndex, TempleMonkData } from '../../types/game';

interface MonkSpriteProps {
  monk: TempleMonkData;
  abbotSpritesheetUrl: string | null;
  seniorNoviceSpritesheetUrl: string | null;
  juniorNoviceSpritesheetUrl: string | null;
  characterScale?: number;
  nameTagFontFamily?: string;
  nameTagScale?: number;
  chatBubbleFontFamily?: string;
  chatBubbleScale?: number;
  isControlled?: boolean;
}

/**
 * Spritesheet của Trụ trì, Chú tiểu lớn & Chú tiểu nhỏ (1 hàng ngang, 8 frames: Index 0 -> 7):
 * 0: mặt trước - đi - bước chân trái
 * 1: mặt trước - đi - bước chân phải
 * 2: mặt lưng - đi - bước chân trái
 * 3: mặt lưng - đi - bước chân phải
 * 4: mặt bên - bước chân trái - tay chắp trước ngực
 * 5: mặt bên - bước chân phải - tay chắp trước ngực
 * 6: mặt bên - ngồi gõ mõ - tay vung mõ
 * 7: mặt bên - ngồi gõ mõ - tay gõ dùi vào mõ
 */
export function getMonkFrameIndex(m: TempleMonkData): MonkFrameIndex {
  if (m.moveAxis === 'chant_wooden_fish') {
    const beatToggle = Math.floor(m.animTime * 2.8) % 2 === 0;
    return beatToggle ? 6 : 7;
  }

  if (m.moveAxis === 'idle') {
    if (m.targetY > m.y + 1) return 0;
    if (m.targetY < m.y - 1) return 2;
    return 4;
  }

  const stepToggle = Math.floor(m.animTime * 4.5) % 2 === 0;
  if (m.moveAxis === 'x') {
    return stepToggle ? 4 : 5;
  }
  if (m.moveAxis === 'y') {
    return m.targetY >= m.y ? (stepToggle ? 0 : 1) : stepToggle ? 2 : 3;
  }
  return stepToggle ? 4 : 5;
}

export const MonkSprite: React.FC<MonkSpriteProps> = React.memo(
  ({
    monk,
    abbotSpritesheetUrl,
    seniorNoviceSpritesheetUrl,
    juniorNoviceSpritesheetUrl,
    characterScale = 1,
    nameTagFontFamily = 'Inter, system-ui, sans-serif',
    nameTagScale = 1,
    chatBubbleFontFamily = 'Inter, system-ui, sans-serif',
    chatBubbleScale = 1,
    isControlled = false,
  }) => {
    const {
      x,
      y,
      role,
      name,
      facingLeft,
      chatText,
      chatBubbleUntil,
      woodenFishRippleUntil,
    } = monk;
    const isAbbot = role === 'abbot';
    const sheetUrl =
      role === 'abbot'
        ? abbotSpritesheetUrl
        : role === 'senior_novice'
        ? seniorNoviceSpritesheetUrl
        : juniorNoviceSpritesheetUrl;

    const processedFrames = useProcessedSpriteFrames(sheetUrl, 8);
    const frameIndex = getMonkFrameIndex(monk);
    const isSide = frameIndex >= 4;
    const flipX = isSide && facingLeft ? -1 : 1;

    // Khi ngồi gõ mõ tụng kinh (frame 6, 7), hạ thấp bong bóng chat xuống sát trên đầu
    const isSittingChanting = frameIndex === 6 || frameIndex === 7;
    const bubbleBottomPx = isSittingChanting ? 72 : 104;
    const rippleBottomPx = bubbleBottomPx + 22;

    // Khu vực tím hồng ở gần lư hương (y ≈ 480..560) -> tỉ lệ ~ 60% nhân với characterScale
    const minY = 550;
    const maxY = 950;
    const t = Math.max(0, Math.min(1, (y - minY) / (maxY - minY)));
    const depthScale = 0.6 + t * 0.4;
    const roleFactor = role === 'junior_novice' ? 0.85 : 1.0;
    const finalScale = depthScale * roleFactor * characterScale;

    const nowMs = Date.now();
    const showChatBubble = Boolean(
      chatText && (!chatBubbleUntil || nowMs < chatBubbleUntil)
    );
    const showWoodenFishRipple = Boolean(
      woodenFishRippleUntil && nowMs < woodenFishRippleUntil
    );

    return (
      <div
        className="absolute w-[74px] h-[108px] origin-bottom pointer-events-none will-change-transform"
        style={{
          left: `${x - 37}px`,
          top: `${y - 102}px`,
          transform: `scale(${finalScale.toFixed(3)})`,
          zIndex: Math.round(y),
        }}
      >
        {/* Vòng sáng đánh dấu đang điều khiển bằng phím AWSD / Q */}
        {isControlled && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-4 rounded-full border-2 border-cyan-300 bg-cyan-400/25 shadow-[0_0_12px_#22d3ee] animate-pulse -z-10" />
        )}

        {/* Nhịp Gõ Mõ (Phím Q) */}
        {showWoodenFishRipple && (
          <div
            className="absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[9px] font-extrabold shadow-md whitespace-nowrap animate-bounce z-40 transition-[bottom] duration-200 ease-out"
            style={{ bottom: `${rippleBottomPx}px` }}
          >
            🪵 Cốc! Tụng kinh gõ mõ
          </div>
        )}

        {/* Bong bóng chat trên đầu Trụ trì / Chú tiểu (Hạ thấp khi ngồi tụng kinh gõ mõ) */}
        {showChatBubble && (
          <div
            className="absolute left-1/2 w-max max-w-[165px] px-2 py-1 rounded-lg bg-stone-950/95 border-2 border-yellow-400 text-yellow-300 text-[10px] font-semibold leading-tight text-center shadow-[0_0_10px_rgba(250,204,21,0.45)] break-words whitespace-normal z-30 origin-bottom transition-[bottom] duration-200 ease-out"
            style={{
              bottom: `${bubbleBottomPx}px`,
              fontFamily: chatBubbleFontFamily,
              transform: `translateX(-50%) scale(${chatBubbleScale.toFixed(2)})`,
            }}
          >
            {chatText}
          </div>
        )}

        <div
          className="w-full h-full flex items-end justify-center"
          style={{ transform: `scaleX(${flipX})` }}
        >
          {processedFrames && processedFrames[frameIndex] ? (
            <img
              src={processedFrames[frameIndex]}
              alt=""
              className="w-full h-full object-contain"
            />
          ) : null}
        </div>

        {/* Thẻ tên Trụ trì / Chú tiểu lớn / Chú tiểu nhỏ */}
        <div
          className={`absolute -bottom-[12px] left-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap shadow border origin-top ${
            isAbbot
              ? 'bg-amber-950/90 border-amber-400 text-amber-200'
              : role === 'senior_novice'
              ? 'bg-stone-900/90 border-amber-500/50 text-amber-100'
              : 'bg-stone-900/90 border-stone-600 text-stone-200'
          }`}
          style={{
            fontFamily: nameTagFontFamily,
            transform: `translateX(-50%) scale(${nameTagScale.toFixed(2)})`,
          }}
        >
          {name}
        </div>
      </div>
    );
  }
);
