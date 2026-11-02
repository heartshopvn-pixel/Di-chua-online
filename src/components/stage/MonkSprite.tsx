import React from 'react';
import { getCharacterDepthScale } from '../../config/constants';
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

    // Đồng bộ khoảng cách phối cảnh chiều sâu với Phật tử và cân chỉnh tỉ lệ cơ thể Sư trụ trì / Chú tiểu lớn / Chú tiểu nhỏ
    const depthScale = getCharacterDepthScale(y);
    const roleFactor =
      role === 'abbot' ? 0.8 : role === 'senior_novice' ? 0.7 : 0.6;
    const finalScale = depthScale * roleFactor * characterScale;

    // Giữ kích thước bong bóng chat không bị thu nhỏ khi đi xa, nhưng neo vị trí đáy bong bóng sát đỉnh đầu thực tế (kể cả khi ngồi gõ mõ)
    const isSittingChanting = frameIndex === 6 || frameIndex === 7;
    const unscaledHeadTopPx = isSittingChanting ? 68.5 : 102;
    const bubbleBottomPx = unscaledHeadTopPx * finalScale + 4;
    const rippleBottomPx = bubbleBottomPx + 24;
    const fixedBubbleScale = (chatBubbleScale * 0.86).toFixed(2);
    const fixedNameScale = (nameTagScale * 0.86).toFixed(2);

    const nowMs = Date.now();
    const showChatBubble = Boolean(
      chatText && (!chatBubbleUntil || nowMs < chatBubbleUntil)
    );
    const showWoodenFishRipple = Boolean(
      woodenFishRippleUntil && nowMs < woodenFishRippleUntil
    );

    return (
      <div
        className="absolute top-0 left-0 w-[74px] h-[108px] pointer-events-none will-change-transform"
        style={{
          transform: `translate3d(${(x - 37).toFixed(2)}px, ${(y - 102).toFixed(2)}px, 0)`,
          zIndex: Math.round(y),
        }}
      >
        {/* Nhịp Gõ Mõ (Phím Q) */}
        {showWoodenFishRipple && (
          <div
            className="absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[9px] font-extrabold shadow-md whitespace-nowrap animate-bounce z-40"
            style={{ bottom: `${rippleBottomPx.toFixed(2)}px` }}
          >
            🪵 Cốc! Tụng kinh gõ mõ
          </div>
        )}

        {/* Bong bóng chat trên đầu Trụ trì / Chú tiểu (Cố định sát trên đỉnh đầu theo chiều cao thực tế) */}
        {showChatBubble && (
          <div
            className="absolute left-1/2 w-max max-w-[165px] px-2 py-1 rounded-lg bg-stone-950/96 border-2 border-yellow-400 text-yellow-300 text-[10px] font-semibold leading-tight text-center shadow-[0_0_10px_rgba(250,204,21,0.45)] break-words whitespace-normal z-30 origin-bottom"
            style={{
              bottom: `${bubbleBottomPx.toFixed(2)}px`,
              fontFamily: chatBubbleFontFamily,
              transform: `translate3d(-50%, 0, 0) scale(${fixedBubbleScale})`,
              backfaceVisibility: 'hidden',
            }}
          >
            {chatText}
          </div>
        )}

        <div
          className="relative w-full h-full origin-bottom pointer-events-none"
          style={{
            transform: `scale(${finalScale.toFixed(3)})`,
          }}
        >
          {/* Vòng sáng đánh dấu đang điều khiển bằng phím AWSD / Q */}
          {isControlled && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-4 rounded-full border-2 border-cyan-300 bg-cyan-400/25 shadow-[0_0_12px_#22d3ee] animate-pulse -z-10" />
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
        </div>

        {/* Thẻ tên Trụ trì / Chú tiểu lớn / Chú tiểu nhỏ */}
        <div
          className={`absolute -bottom-[12px] left-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap shadow border origin-top ${
            isAbbot
              ? 'bg-amber-950/95 border-amber-400 text-amber-200'
              : role === 'senior_novice'
              ? 'bg-stone-900/95 border-amber-500/50 text-amber-100'
              : 'bg-stone-900/95 border-stone-600 text-stone-200'
          }`}
          style={{
            fontFamily: nameTagFontFamily,
            transform: `translate3d(-50%, 0, 0) scale(${fixedNameScale})`,
            backfaceVisibility: 'hidden',
          }}
        >
          {name}
        </div>
      </div>
    );
  }
);
