# 🪷 Tịnh Xá Công Đức — Interactive TikTok Live Buddhist Temple

Ứng dụng tương tác trực tiếp (Interactive TikTok Live Game) mô phỏng không gian Chánh Điện **Kim Thiền Tự**, nơi người xem TikTok Live có thể vào chùa thắp nhang, bái lạy, cầu nguyện, dâng lễ vật (Hoa Sen Hồng, Hoa Sen Hoàng Kim, Mâm Ngũ Quả, Đại Lễ Hoàng Kim) và lắng nghe thuyết pháp.

---

## ✨ Tính năng nổi bật

- **Luồng hoạt động Phật tử tự động & chân thực**:
  - Khách mới vào phòng tự động đi theo 3 làn thảm đỏ tiến lên trước lư hương thắp nhang, sau đó xuống khu vực chiếu bái lạy và ngồi thiền.
  - Tự động duy trì số lượng Phật tử NPC giữ nhiệt trên sân và tự động nhường chỗ khi có khách thật vào.
- **Hệ thống Dâng Lễ & Quy đổi Quà TikTok**:
  - **1 xu (Hoa Hồng)**: Dâng Hoa Sen Hồng + lời chúc bình an.
  - **5 xu (Bắn Tim)**: Dâng Hoa Sen Hoàng Kim + lời chúc bình an.
  - **10 xu (Rosa)**: Dâng Mâm Ngũ Quả + hiệu ứng hào quang & camera zoom cận cảnh 4 giây.
  - **>10 xu (Quà Đặc Biệt)**: Đại Lễ Hoàng Kim + hào quang rực rỡ & camera zoom cận cảnh.
  - Hỗ trợ **Combo Quà Liên Tục** (ví dụ: 50x Hoa Hồng cùng lúc) không gây nghẽn hàng đợi.
- **Dev Studio toàn diện (6 Tab)**:
  - **Tổng Quan & Kết Nối**: Kết nối TikFinity / TikTok Live Connector (WebSocket), đồng bộ thời gian thực sang OBS Browser Source (`?obs=1`), Sao lưu / Khôi phục toàn bộ cấu hình (JSON).
  - **Bố Cục Map**: Kéo thả, phóng to/thu nhỏ trực tiếp các bảng UI trên màn hình, chỉnh vùng di chuyển, hàng ghế thường/VIP, kích thước nhân vật, phông chữ & kích thước thẻ tên / bong bóng chat.
  - **Tài Nguyên (Assets)**: Thay thế ảnh nền, tượng Phật, lư hương, sprite nhân vật và quà tặng (lưu trữ bền vững qua IndexedDB).
  - **Âm Thanh**: Quản lý nhạc nền, chuông chùa, tiếng mõ định kỳ, danh sách bài Thuyết Pháp / Kể Chuyện (tự động chuyển bài) và đọc giọng nói TTS cho người thật.
  - **Quản Lý NPC**: Tùy chỉnh danh sách tên NPC, kho Avatar NPC ngẫu nhiên, lời cầu nguyện mẫu và **Nhập vai điều khiển trực tiếp** (WASD để di chuyển, Q để gõ mõ, chat trực tiếp).
  - **Test Live**: Giả lập đầy đủ các sự kiện TikTok Live (Khách vào, Thả tim, Follow, Bình luận cầu nguyện, Dâng lễ & Combo quà).

---

## 🚀 Cài đặt & Chạy trên máy cá nhân (Local PC)

### Yêu cầu
- Cài đặt [Node.js](https://nodejs.org/) (phiên bản 18 trở lên).

### Các bước chạy
```bash
# 1. Cài đặt thư viện
npm install

# 2. Chạy chế độ phát triển (Development)
npm run dev
```
Sau khi chạy, mở trình duyệt tại địa chỉ:
- **Bảng điều khiển & Sân khấu (Admin)**: `http://localhost:3000`
- **Nguồn phát cho OBS (Ẩn nút Dev)**: `http://localhost:3000/?obs=1`

---

## 📦 Build & Chạy Production (Hoặc Deploy lên Cloud)

```bash
# Build giao diện tối ưu
npm run build

# Khởi chạy server production
npm start
```

---

## 🎥 Hướng dẫn tích hợp OBS & TikFinity khi Livestream

1. **Trong OBS Studio**:
   - Thêm nguồn **Browser Source**.
   - Đặt URL: `http://localhost:3000/?obs=1` (hoặc tên miền nếu bạn deploy lên mạng).
   - Đặt kích thước: Rộng `1080` - Cao `1920` (khung hình dọc 9:16 chuẩn TikTok Live).
2. **Kết nối TikTok Live**:
   - Mở tab **Dev Studio -> Tổng Quan** trên trình duyệt để xem hướng dẫn kết nối WebSocket (`ws://localhost:21213` với TikFinity hoặc cầu nối TikTok-Live-Connector).
3. **Sao lưu cấu hình**:
   - Sau khi căn chỉnh vị trí bảng, tải lên hình ảnh/âm thanh và danh sách bài thuyết pháp ưng ý, hãy bấm **"Xuất File Sao Lưu (.json)"** trong Dev Studio để lưu giữ cấu hình an toàn.
