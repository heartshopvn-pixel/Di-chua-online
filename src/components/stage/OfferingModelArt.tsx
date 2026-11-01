import React from 'react';
import { CustomAssetsConfig, OfferingGiftType } from '../../types/game';

interface OfferingModelArtProps {
  type: OfferingGiftType;
  customAssets: CustomAssetsConfig;
  className?: string;
}

export function getOfferingUrlForType(
  type: OfferingGiftType,
  customAssets: CustomAssetsConfig
): string | null {
  switch (type) {
    case 'incense':
      return customAssets.offeringIncenseUrl;
    case 'rose':
      return customAssets.offeringRoseUrl;
    case 'lotus':
      return customAssets.offeringLotusUrl;
    case 'tray':
    case 'special_tray':
    default:
      return customAssets.offeringTrayUrl;
  }
}

/**
 * Thuật toán quy đổi giá trị quà (coin) sang model lễ vật:
 * - 0 coin (Bình luận): 'incense' (Nhang trầm ước nguyện)
 * - 1..4 coin (Hoa hồng - 1 coin): 'rose' (Hoa sen hồng vừa)
 * - 5..9 coin (Bắn tim - 5 coin): 'lotus' (Hoa sen vàng hoàng kim)
 * - 10 coin (Rosa - 10 coin): 'tray' (Mâm hoa quả)
 * - >10 coin (Đặc biệt - trên 10 coin): 'special_tray' (Mâm hoa quả + Ánh hào quang hoàng kim + Khóa camera zoom 3s)
 */
export function inferOfferingTypeFromCoins(
  isVip: boolean,
  coins: number
): OfferingGiftType {
  if (!isVip && coins <= 0) return 'incense';
  if (coins > 10) return 'special_tray';
  if (coins >= 10) return 'tray';
  if (coins >= 5) return 'lotus';
  return 'rose';
}

/**
 * Hiển thị hình ảnh Quà Dâng Lên (Model file dùng chung cho cả:
 * 1. Bên trái phía ngoài tương ứng theo từng thẻ công việc của Bảng Hướng Dẫn
 * 2. Vị trí mâm quà trên tay nhân vật dâng lễ (Frame 7) & khi ném vào lư hương)
 */
export const OfferingModelArt: React.FC<OfferingModelArtProps> = ({
  type,
  customAssets,
  className = 'w-7 h-7',
}) => {
  const customUrl = getOfferingUrlForType(type, customAssets);

  if (customUrl) {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        {type === 'special_tray' && (
          <span className="absolute -inset-1 rounded-full bg-amber-300/45 blur-[3px] animate-pulse pointer-events-none" />
        )}
        <img
          src={customUrl}
          alt={type}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain select-none pointer-events-none"
        />
      </div>
    );
  }

  switch (type) {
    case 'incense':
      return (
        <svg
          viewBox="0 0 40 40"
          className={`${className} select-none pointer-events-none`}
        >
          {/* Đế mâm gỗ sơn son thếp vàng */}
          <ellipse cx="20" cy="33" rx="13" ry="4" fill="#78350f" stroke="#facc15" strokeWidth="1.4" />
          {/* Ống cắm hương bằng đồng vàng */}
          <path
            d="M14 23 L26 23 L24 32 L16 32 Z"
            fill="#eab308"
            stroke="#fef08a"
            strokeWidth="1"
          />
          {/* 3 nén nhang trầm đang cháy đỏ */}
          <line x1="20" y1="23" x2="20" y2="8" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="17" y1="23" x2="14" y2="9" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="23" y1="23" x2="26" y2="9" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" />
          {/* Đốm lửa nhang */}
          <circle cx="20" cy="7.5" r="1.8" fill="#fef08a" />
          <circle cx="14" cy="8.5" r="1.6" fill="#f97316" />
          <circle cx="26" cy="8.5" r="1.6" fill="#f97316" />
        </svg>
      );

    case 'rose':
      // Quà Hoa Hồng (1 coin) -> Dâng Hoa Sen Hồng Vừa
      return (
        <svg
          viewBox="0 0 40 40"
          className={`${className} select-none pointer-events-none`}
        >
          {/* Đế đài gỗ đỡ sen hồng vừa */}
          <ellipse cx="20" cy="32" rx="13.5" ry="4" fill="#831843" stroke="#f9a8d4" strokeWidth="1.3" />
          {/* Lá sen xanh dưới đài */}
          <ellipse cx="20" cy="29.5" rx="11.5" ry="2.8" fill="#16a34a" />
          {/* Cánh Hoa Sen Hồng Vừa thanh khiết */}
          <path d="M20 9 C14.5 15.5 13 23 20 29 C27 23 25.5 15.5 20 9 Z" fill="#f472b6" stroke="#fce7f3" strokeWidth="0.9" />
          <path d="M20 29 C12 26 8.5 19 12 13 C15.5 16.5 17.5 22 20 29 Z" fill="#ec4899" />
          <path d="M20 29 C28 26 31.5 19 28 13 C24.5 16.5 22.5 22 20 29 Z" fill="#ec4899" />
          <path d="M20 30 C10.5 29.5 6 24.5 7.5 19 C12 21.5 15.5 26 20 30 Z" fill="#db2777" />
          <path d="M20 30 C29.5 29.5 34 24.5 32.5 19 C28 21.5 24.5 26 20 30 Z" fill="#db2777" />
          {/* Nhụy sen vàng */}
          <circle cx="20" cy="23.5" r="3" fill="#fef08a" stroke="#eab308" strokeWidth="0.8" />
        </svg>
      );

    case 'lotus':
      // Quà Bắn Tim (5 coin) -> Dâng Hoa Sen Vàng Hoàng Kim
      return (
        <svg
          viewBox="0 0 40 40"
          className={`${className} select-none pointer-events-none`}
        >
          {/* Hào quang vàng nhẹ sau sen hoàng kim */}
          <circle cx="20" cy="20" r="15" fill="rgba(250, 204, 21, 0.25)" />
          {/* Đế mâm ngọc hoàng kim */}
          <ellipse cx="20" cy="32" rx="15" ry="4.5" fill="#78350f" stroke="#fef08a" strokeWidth="1.5" />
          <ellipse cx="20" cy="29.5" rx="12.5" ry="3" fill="#ca8a04" />
          {/* Cánh Hoa Sen Vàng Hoàng Kim rực rỡ */}
          <path d="M20 6.5 C13.5 14 11.5 22.5 20 29 C28.5 22.5 26.5 14 20 6.5 Z" fill="#fef08a" stroke="#ffffff" strokeWidth="0.9" />
          <path d="M20 29 C10.5 26 6.5 17.5 10.5 11 C15 15.5 17 22 20 29 Z" fill="#facc15" stroke="#fef9c3" strokeWidth="0.6" />
          <path d="M20 29 C29.5 26 33.5 17.5 29.5 11 C25 15.5 23 22 20 29 Z" fill="#facc15" stroke="#fef9c3" strokeWidth="0.6" />
          <path d="M20 30 C8.5 30 3.5 24 5.5 17.5 C11 21 15 26 20 30 Z" fill="#eab308" />
          <path d="M20 30 C31.5 30 36.5 24 34.5 17.5 C29 21 25 26 20 30 Z" fill="#eab308" />
          {/* Ngọc sen phát sáng ở tâm */}
          <circle cx="20" cy="22" r="3.6" fill="#ffffff" stroke="#f59e0b" strokeWidth="1.1" />
        </svg>
      );

    case 'special_tray':
      // Quà Đặc Biệt (>10 coin) -> Mâm Hoa Quả kèm Ánh Hào Quang Hoàng Kim
      return (
        <svg
          viewBox="0 0 40 40"
          className={`${className} select-none pointer-events-none`}
        >
          {/* Vòng Hào Quang Hoàng Kim tỏa sáng phía sau mâm ngũ quả */}
          <circle cx="20" cy="21" r="18" fill="rgba(250, 204, 21, 0.35)" stroke="#fef08a" strokeWidth="1.2" strokeDasharray="3 2" />
          <circle cx="20" cy="21" r="14" fill="rgba(245, 158, 11, 0.28)" />
          {/* Chân đế Mâm Bồng Hoàng Kim */}
          <path d="M12 33 L28 33 L25 37.5 L15 37.5 Z" fill="#eab308" stroke="#fef08a" strokeWidth="1.1" />
          <ellipse cx="20" cy="30" rx="17" ry="5.2" fill="#92400e" stroke="#fef08a" strokeWidth="1.8" />
          {/* Ngọn lá dứa / thanh long phía sau */}
          <path d="M16 18 L13.5 7 L19 15 Z" fill="#4ade80" />
          <path d="M23 18 L26.5 6.5 L20 15 Z" fill="#22c55e" />
          <path d="M20 16 L20 5 L22 15 Z" fill="#fef08a" />
          {/* Trái thanh long đỏ hồng bên trái */}
          <ellipse cx="13.5" cy="23" rx="5.2" ry="6" fill="#e11d48" stroke="#fecdd3" strokeWidth="0.9" />
          {/* Nải chuối hoàng kim bên phải */}
          <ellipse cx="26.5" cy="23.5" rx="5.5" ry="4.8" fill="#facc15" stroke="#ffffff" strokeWidth="0.9" />
          {/* Quả đào tiên / cam vàng ở giữa */}
          <circle cx="20" cy="24" r="5.2" fill="#f97316" stroke="#fef08a" strokeWidth="1.1" />
          <circle cx="24.5" cy="26.5" r="4" fill="#fb923c" stroke="#ffedd5" strokeWidth="0.7" />
          <circle cx="15" cy="26.8" r="3.6" fill="#fde047" />
        </svg>
      );

    case 'tray':
    default:
      // Quà Rosa (10 coin) -> Dâng Mâm Hoa Quả
      return (
        <svg
          viewBox="0 0 40 40"
          className={`${className} select-none pointer-events-none`}
        >
          {/* Mâm Bồng Ngũ Quả Đại Cát bằng gỗ & đồng vàng */}
          <path d="M13 33 L27 33 L24 37 L16 37 Z" fill="#b45309" stroke="#facc15" strokeWidth="1" />
          <ellipse cx="20" cy="30" rx="16.5" ry="5" fill="#78350f" stroke="#fde047" strokeWidth="1.6" />
          {/* Ngọn lá dứa / thanh long phía sau */}
          <path d="M16 18 L14 8 L19 15 Z" fill="#22c55e" />
          <path d="M23 18 L26 7 L20 15 Z" fill="#16a34a" />
          <path d="M20 16 L20 6 L22 15 Z" fill="#4ade80" />
          {/* Trái thanh long đỏ hồng bên trái */}
          <ellipse cx="13.5" cy="23" rx="5.2" ry="6" fill="#e11d48" stroke="#fda4af" strokeWidth="0.8" />
          <path d="M11 20 L13 18 M15 22 L17 20 M12 25 L14 24" stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round" />
          {/* Nải chuối vàng / xoài bên phải */}
          <ellipse cx="26.5" cy="23.5" rx="5.5" ry="4.8" fill="#eab308" stroke="#fef08a" strokeWidth="0.8" />
          {/* Quả cam / quýt vàng cam ở giữa */}
          <circle cx="20" cy="24.5" r="5" fill="#f97316" stroke="#fed7aa" strokeWidth="0.9" />
          <circle cx="24.5" cy="26.5" r="4" fill="#fb923c" stroke="#ffedd5" strokeWidth="0.7" />
          <circle cx="15" cy="26.8" r="3.6" fill="#facc15" />
        </svg>
      );
  }
};

