# 🏯 TÀI LIỆU BÀN GIAO KỸ THUẬT & VẬN HÀNH (PROJECT HANDOFF)
**Tên dự án:** Đi Chùa Online - TikTok Live 2.5D Interactive Game & Dev Studio  
**Kiến trúc:** Web App (`index.html` All-in-One) + Node.js Bridge (`server.js`)  

---

## 1. TỔNG QUAN KIẾN TRÚC LỰA CHỌN
Thay vì đóng gói file `.exe` cồng kềnh hay tách rời 2 ứng dụng riêng biệt, dự án sử dụng kiến trúc **Single-File Web App (`index.html`) tích hợp sẵn Live Dev Studio** kết hợp với **Node.js Bridge (`tiktok-live-connector`)**:
* **Giao diện kép (Dual-View):**
  * **Bên Trái (`#stream-stage-wrapper`):** Khung hình Chánh Điện tỷ lệ dọc `9:16` (`540x960` tự co giãn) dùng để chiếu lên OBS Studio.
  * **Bên Phải (`#dev-panel`):** Bảng điều khiển trực tiếp dành cho người vận hành (có thể ẩn/hiện nhanh bằng phím tắt **`F2`**).
* **Đồng bộ thời gian thực (Multi-Tab Sync):**
  * Sử dụng song song **`BroadcastChannel API`** (khi mở 2 tab trên cùng trình duyệt) và **`WebSocket Relay`** (khi chạy qua `server.js` giữa Chrome và OBS Browser Source).
  * Mọi thao tác chỉnh sửa ở Tab Admin (thả Phật tử, gõ chuông, kéo thả tọa độ chiếu quỳ, ngắt âm khẩn cấp) đều cập nhật tức thì trên màn hình Live mà không cần tải lại trang (`F5`).

---

## 2. CƠ CHẾ HIỂN THỊ 2.5D & ĐIỀU PHỐI ĐÁM ĐÔNG
1. **Phối cảnh chiều sâu giả lập 3D (2.5D Y-Sorting & Depth Scaling):**
   * Nhân vật xuất hiện từ cổng dưới (`y = 950`), đi bộ tiến lên khu vực chiếu quỳ hoặc Thượng Điện.
   * Tỷ lệ kích thước (`scale`) tự động thu nhỏ dần khi nhân vật đi lên cao theo công thức nội suy tọa độ `Y`, đồng thời `z-index = Math.round(y)` đảm bảo người đứng gần màn hình luôn che khuất người đứng xa.
2. **Phân tầng vị trí (Slots & Waypoints):**
   * **Khu vực Phổ thông (Normal Slots):** Ma trận hàng chiếu quỳ (mặc định 6 hàng × 8 cột) dành cho người xem bình luận cầu nguyện hoặc thả tim.
   * **Khu vực Thượng Điện (VIP Slots):** 6 đệm quỳ đỏ sát lư hương đồng trên bệ cao dành riêng cho người xem tặng quà (Coins/Gifts).
3. **Live Map Editor (Chỉnh sửa tọa độ trực tiếp khi đang Live):**
   * Khi bật **"🎯 Lưới Tọa Độ"**, Admin có thể dùng chuột kéo thả trực tiếp vị trí **Khói lư hương (🔥)**, **Vị trí VIP (V1-V6)** và **Từng chiếu quỳ phổ thông**.
   * Hỗ trợ tải ảnh nền chùa 3D (`9:16`) từ máy tính đè lên nền mặc định và xuất cấu hình ra chuỗi `JSON`.

---

## 3. HỆ THỐNG GIỌNG ĐỌC ĐA NGUỒN (MULTI-ENGINE TTS) & ÂM THANH
* **Hiệu ứng âm thanh chùa (Chuông & Mõ):** Được tổng hợp trực tiếp bằng thuật toán sóng âm **`Web Audio API`** (không phụ thuộc file `.mp3` ngoài, nhẹ 100%).
* **4 Nguồn phát giọng đọc (TTS Engines):**
  1. **🎙️ Node.js Edge-TTS AI (`vi-VN-HoaiMyNeural` / `vi-VN-NamMinhNeural`):** Giọng AI Microsoft miễn phí 100% qua thư viện `msedge-tts`, phát dưới dạng luồng MP3 nên **OBS Browser Source thu được tiếng trực tiếp**.
  2. **🌐 Chị Google Translate Stream (`translate_tts`):** Luồng Audio MP3 trực tiếp từ Google.
  3. **⚡ Web Speech API (`window.speechSynthesis`):** Giọng đọc nội bộ của trình duyệt/Windows (0đ, 0% CPU, không giới hạn). Tự động kích hoạt làm phương án dự phòng (**Auto-Fallback**) nếu quên bật `server.js`.
  4. **🧘 Giọng Thầy Chùa Trầm Ấm:** Tự động hạ trầm cao độ (`Pitch 0.72`, `Rate 0.88x`) kèm tiếng gõ mõ đầu câu.
* **Cơ chế Hàng đợi thông minh (Smart TTS Queue):**
  * Giới hạn hàng đợi tối đa 4 câu để tránh bị trễ (delay) âm thanh khi phòng đông.
  * Người tặng quà (VIP) luôn được đẩy lên đầu hàng đợi (`unshift`) kèm tiếng chuông ngân.

---

## 4. CHẾ ĐỘ "TAB ADMIN IM LẶNG" (LÀM VIỆC RIÊNG KHÔNG MẤT TIẾNG LIVE)
Để người vận hành có thể tắt tiếng trên máy tính cá nhân (nghe nhạc, xem phim, làm việc khác) mà khán giả trên TikTok Live vẫn nghe đầy đủ âm thanh:
* **Công tắc `🔇 Tắt Tiếng Riêng Tab Này (OBS Vẫn Kêu)`:** Lưu trạng thái vào `sessionStorage` của riêng tab Chrome đang mở điều khiển.
* **Thiết lập chuẩn trên OBS Studio:**
  1. Tạo nguồn **Browser Source** trỏ vào game $\rightarrow$ Tích chọn **"Control audio via OBS"**.
  2. Trong **Advanced Audio Properties** của OBS, chọn **Audio Monitoring: `Monitor Off`** (Âm thanh phát thẳng lên luồng Live nhưng không phát ra loa máy tính).
  3. Mở một tab Chrome bên ngoài để điều khiển Dev Studio và bật nút **`🔇 Tắt Tiếng Riêng Tab Này`**.

---

## 5. KHIÊN BẢO VỆ PHÒNG LIVE & BỘ LỌC TỪ CẤM TIKTOK (SAFETY SHIELD)
Hệ thống quét 2 lớp (**Tên người chơi** và **Nội dung bình luận**) với thuật toán chống lách luật (tự động xóa dấu chấm, gạch ngang, khoảng trắng cố tình chèn giữa chữ như `v.c.l`, `t_a_i x_i_u` và chuẩn hóa không dấu):
* **6 Nhóm từ điển cấm mặc định:**
  1. 🤬 Tục tĩu, chửi thề, 18+ & viết tắt.
  2. 🔊 Bẫy phát âm TTS / Tên nói lái nhạy cảm (VD: *Châu Tinh Trùng, Bành Thị Lồng...* $\rightarrow$ Tự động đổi thành **"Phật Tử Thiện Lành"**).
  3. 🔪 Bạo lực, tự hại, vũ khí & chất cấm (Ma túy, đập đá, tự tử...).
  4. 🎲 Cờ bạc, cá độ, tài xỉu, lô đề & cổng game lừa đảo (Kubet, Sunwin, Go88...).
  5. 📱 Điều hướng nền tảng (Zalo, FB, Shopee, Telegram), số tài khoản & **Regex quét tự động mọi số điện thoại 9–11 số / Link web**.
  6. ⚖️ Chính trị cực đoan & từ ngữ báng bổ tôn giáo/nhà chùa.
* **3 Chế độ xử lý tự động:**
  * **✨ Thanh Hóa Tâm Linh (Khuyên dùng):** Tự động biến câu bình luận vi phạm thành câu sám hối hiền hòa (*"Nam Mô A Di Đà Phật, con xin thành tâm sám hối mọi lỗi lầm 🙏"*).
  * **🚫 Chặn Hoàn Toàn:** Không cho nhân vật vào sân và không đọc TTS.
  * **✳️ Che Dấu Sao `***`:** Cho nhân vật vào quỳ nhưng che `***` từ cấm và tắt đọc TTS câu đó.
* **Nút đỏ `🔇 PANIC MUTE (Ngắt Đọc Khẩn Cấp)`:** Xóa sạch hàng đợi và ngắt lời giọng đọc ngay lập tức trên cả tab Admin lẫn OBS khi có tình huống bất ngờ.

---

## 6. HỆ THỐNG PHẬT TỬ ẢO GIỮ NHIỆT LÚC MỚI MỞ LIVE (SMART SEEDING NPC)
* **Hợp lệ chính sách TikTok 100%:** Hoạt động như NPC nội bộ trong khung hình game (giúp tránh lỗi *Màn hình tĩnh / Static Screen* lúc mới mở Live), không can thiệp hay spam vào hệ thống chat thật của TikTok.
* **Cơ chế Tự động nhường chiếu (`Smart Auto-Yield`):**
  * Duy trì số lượng Phật tử ảo trên sân theo thanh trượt (mặc định `26 người`) với nhịp bước vào ngẫu nhiên (`1.4s – 3.4s`).
  * Khi phòng vắng không có người thật chat, cứ mỗi `12 giây` sẽ có 1 NPC đọc lời cầu nguyện mẫu để giữ âm thanh phòng Live ấm cúng.
  * Ngay khi có **Người Thật** bình luận hoặc tặng quà: Hệ thống lập tức ưu tiên mic cho người thật và tự động cho 1 NPC ảo đứng dậy **`Ra về 🙏`** để nhường chiếu nếu sân đang đầy.

---

## 7. QUY TRÌNH KHỞI CHẠY NHANH (QUICK START CHECKLIST)
1. **Chạy thử nghiệm hoặc Host Web:**
   * Mở trực tiếp file `index.html` trên trình duyệt hoặc đẩy lên **GitHub Pages**.
2. **Chạy Cầu nối Node.js (`server.js`) để bắt TikTok Live & Giọng AI:**
   * Copy mã nguồn `server.js` trong **Tab 4 (`🔌 TikTok Node`)** của bảng điều khiển.
   * Cài đặt thư viện:
     ```bash
     npm i tiktok-live-connector ws express cors msedge-tts
     ```
   * Đổi biến `TIKTOK_USERNAME` thành ID TikTok đang phát Live của bạn và chạy:
     ```bash
     node server.js
     ```
3. **Đưa lên OBS Studio:**
   * Thêm nguồn **Browser Source** (`Width: 540`, `Height: 960` hoặc `1080x1920`), bấm phím **`F2`** (hoặc Crop trong OBS) để chỉ hiển thị khung Chánh Điện bên trái.
   * Trên tab Chrome điều khiển bên ngoài, bấm **Kết Nối WebSocket (`ws://localhost:8080`)** và bật **`🔇 Tắt Tiếng Riêng Tab Này`** để bắt đầu vận hành phiên Live.