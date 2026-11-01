import React from 'react';
import { DEFAULT_BG_IMAGE } from '../../config/constants';
import { Point2D } from '../../types/game';

interface TempleArtProps {
  customBgUrl: string | null;
  incenseBurner: Point2D;
}

export const TempleArt: React.FC<TempleArtProps> = ({ customBgUrl, incenseBurner }) => {
  const activeBg = customBgUrl || DEFAULT_BG_IMAGE;

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden select-none pointer-events-none">
      {/* Ảnh nền Chánh Điện 9:16 (Mặc định dùng ảnh Chánh Điện mới, có thể đổi trong Dev Studio) */}
      <img
        src={activeBg}
        alt="Chánh Điện Cầu An 9:16"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

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
