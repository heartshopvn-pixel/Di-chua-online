import React, { useEffect, useState } from 'react';
import { DEFAULT_BG_IMAGE } from '../../config/constants';
import { Point2D } from '../../types/game';

interface TempleArtProps {
  customBgUrl: string | null;
  incenseBurner: Point2D;
}

const FALLBACK_BG_IMAGES = [
  DEFAULT_BG_IMAGE,
  './assets/aistudio/Grand_Buddhist_Temple_with_Towering_Golden_Halo3_85ff5de2.jpg',
  'assets/aistudio/Grand_Buddhist_Temple_with_Towering_Golden_Halo_06591c77.png',
  'assets/aistudio/Grand_Buddhist_Temple_with_Towering_Golden_Halo3_85ff5de2.jpg',
];

export const TempleArt: React.FC<TempleArtProps> = ({ customBgUrl, incenseBurner }) => {
  const sanitizedCustom =
    customBgUrl && !customBgUrl.startsWith('blob:')
      ? customBgUrl.startsWith('/assets/')
        ? `.${customBgUrl}`
        : customBgUrl
      : null;

  const [fallbackIdx, setFallbackIdx] = useState(0);
  const [imgFailedAll, setImgFailedAll] = useState(false);

  useEffect(() => {
    setFallbackIdx(0);
    setImgFailedAll(false);
  }, [sanitizedCustom]);

  const activeBg =
    sanitizedCustom && fallbackIdx === 0
      ? sanitizedCustom
      : FALLBACK_BG_IMAGES[
          Math.min(
            sanitizedCustom ? fallbackIdx - 1 : fallbackIdx,
            FALLBACK_BG_IMAGES.length - 1
          )
        ];

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden select-none pointer-events-none bg-[#2b0908]">
      {/* Nền kiến trúc Chánh Điện dự phòng bên dưới (hiển thị ngay lập tức trong lúc tải ảnh hoặc khi thiếu file ảnh) */}
      <div
        className="absolute inset-0 w-full h-full z-0"
        style={{
          background:
            'radial-gradient(circle at 50% 24%, #fde047 0%, #d97706 24%, #7c2d12 52%, #2b0908 88%)',
        }}
      >
        {/* Thảm đỏ 3 làn dẫn từ cổng lên lư hương */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[104px] h-[490px] opacity-85"
          style={{
            background:
              'linear-gradient(180deg, rgba(153,27,27,0.95) 0%, rgba(127,29,29,0.98) 100%)',
            borderLeft: '3px solid rgba(251,191,36,0.65)',
            borderRight: '3px solid rgba(251,191,36,0.65)',
          }}
        />
      </div>

      {/* Ảnh nền Chánh Điện 9:16 (Không đặt chữ trong alt để tránh hiện dòng chữ "Chánh Điện Cầu An 9:16" khi ảnh đang tải hoặc lỗi đường dẫn) */}
      {!imgFailedAll && (
        <img
          src={activeBg}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => {
            const maxIdx = sanitizedCustom
              ? FALLBACK_BG_IMAGES.length
              : FALLBACK_BG_IMAGES.length - 1;
            if (fallbackIdx < maxIdx) {
              setFallbackIdx((prev) => prev + 1);
            } else {
              setImgFailedAll(true);
            }
          }}
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
      )}

      {/* Lớp phủ ánh sáng hào quang nhẹ tôn chiều sâu ảnh nền */}
      <div className="buddha-aura absolute top-[135px] left-1/2 -translate-x-1/2 w-[290px] h-[290px] rounded-full opacity-45 pointer-events-none z-10" />

      {/* Đốm lửa nhang lập lòe tại vị trí Lư Hương */}
      <div
        className="absolute -translate-x-1/2 flex gap-1.5 pointer-events-none z-10"
        style={{
          left: `${incenseBurner.x}px`,
          top: `${incenseBurner.y - 8}px`,
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
        <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#fde047] -mt-1" />
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
      </div>

      {/* Tia nắng nhẹ chiếu xiên */}
      <div className="sun-ray absolute -top-[80px] -right-[60px] w-[420px] h-[550px] opacity-60 pointer-events-none z-10" />

      {/* Lớp tối nhẹ ở đáy giúp HUD TikTok Live nổi bật rõ nét */}
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/65 via-black/20 to-transparent pointer-events-none z-10" />
    </div>
  );
};
