# SỔ TAY HOẠT ĐỘNG NHÂN VẬT & NGHI LỄ CHÁNH ĐIỆN (`SO_TAY_HOAT_DONG.md`)

Tài liệu này ghi chép chi tiết toàn bộ quy trình di chuyển, trạng thái hoạt ảnh (Animation State Machine), thuật toán phân loại quà dâng lễ, cơ chế hàng chờ ưu tiên và hệ thống hiệu ứng tương tác trong phiên bản hiện tại.

---

## 1. Đường Đi Ra Vào Trên Thảm Đỏ (Chia 3 Làn Tự Nhiên)
- Đường trục chính dẫn từ cổng tam quan lên Lư Hương và đi ra về chính là **Thảm Đỏ Trung Tâm**.
- Để tránh các nhân vật đi đè lên nhau thành 1 hàng cứng nhắc, thảm đỏ được chia thành **3 làn (3 lines)**:
  - **Làn Trái:** `X = 252`
  - **Làn Giữa:** `X = 270`
  - **Làn Phải:** `X = 288`
- Mỗi Phật tử khi bước vào hoặc bước ra đều được gán ngẫu nhiên 1 trong 3 làn (`laneX`) kèm độ lệch tự nhiên nhỏ, tạo cảm giác dòng người hành hương đi lại sống động.
- Toàn bộ bóng đen dưới chân nhân vật (Phật tử & Chư Tăng) đã được **xóa hoàn toàn** để hình ảnh nhân vật hòa quyện sạch sẽ trên nền thảm chùa.

---

## 2. Luồng Hoạt Động Của Phật Tử Thường (Khách Mới Vào / Bình Luận `0 xu`)

1. **Bước vào Chánh Điện (`walk_in_up`):**
   - Xuất phát từ cửa dưới (`Y = 985`), đi thẳng theo 1 trong 3 làn thảm đỏ lên vị trí trước **Lư Hương**.
   - Hoạt ảnh: Bước đi mặt lưng (`Frame 2` & `Frame 3` luân phiên).
2. **Thắp nhang trước Lư Hương (`ceremony_at_burner`):**
   - Đứng trước Lư Hương, chắp tay cầm nhang vái (`Frame 4`).
3. **Di chuyển xuống khu vực bái lạy thường (`walk_to_seat`):**
   - Sau khi thắp nhang xong, nhân vật quay xuống khu vực bái lạy thường (2 bên thảm đỏ) và chọn ngẫu nhiên 1 slot trống (`normalSlots`).
4. **Ngồi bái lạy & Tĩnh tâm (`pray_seated`):**
   - **Giai đoạn đầu (~2.4 giây đầu):** Thực hiện động tác **cúi bái vài cái** (`Frame 6` quỳ lạy xen kẽ `Frame 5` ngồi chắp tay).
   - **Giai đoạn sau:** Ngồi yên chắp tay tĩnh tâm (`Frame 5`) cho đến khi hết thời gian ngồi.
   - **Thời gian ngồi (`prayDurationSec`):** Tính tổng cả lúc bái và lúc ngồi yên, điều chỉnh tự do trong Dev Studio **từ ít nhất 3 giây (`min = 3s`)** đến `60 giây`.
5. **Ra thảm đỏ đi về (`leave_side_to_aisle` → `leave_down_exit`):**
   - Khi hết thời gian ngồi, nhân vật đứng dậy bước ngang ra làn thảm đỏ (`leave_side_to_aisle`, `Frame 8/9`) rồi đi thẳng xuống cổng ra về (`leave_down_exit`, `Frame 0/1`).

---

## 3. Luồng Hoạt Động Khi Dâng Lễ (Tặng Quà TikTok Live)

Khi người chơi gửi quà (hoặc đang ở trên sân / trong hàng chờ mà gửi quà):

1. **Đổi sang hoạt ảnh Dâng Lễ (`walk_in_up` với `isGiftOffering = true`):**
   - Nhân vật chuyển ngay sang tư thế **2 tay vươn cao dâng lễ vật (`Frame 7`)**.
   - Đặt **Model Lễ Vật** tương ứng trên 2 tay và dẫn người chơi đi thẳng theo thảm đỏ lên trước **Lư Hương**.
2. **Ném Lễ Vật vào Lư Hương (`throw_offering_at_burner`):**
   - Khi đến trước Lư Hương, model lễ vật bay theo quỹ đạo vòng cung vào tâm Lư Hương rồi **tan biến**.
   - Ngay khoảnh khắc lễ vật tan biến trong Lư Hương, kích hoạt hiệu ứng **bung tỏa nhiều bông hoa sen hồng nhỏ (`burnerLotusBursts`)** tỏa tròn rực rỡ quanh Lư Hương, đồng thời cập nhật model lên **Mâm Quả Chánh Điện**.
3. **Thắp nhang 1 giây (`ceremony_at_burner`):**
   - Nhân vật đứng chắp tay thắp nhang (`Frame 4`) trong đúng **1 giây (`1.0s`)**.
4. **Đi xuống hàng ghế VIP & Kiểm tra chỗ trống (`walk_to_vip_check`):**
   - Nhân vật đi xuống vị trí hàng **Slot VIP Thượng Điện** rồi dừng lại kiểm tra:
   - **Trường hợp 1 — Có Slot VIP trống:** Bước thẳng vào ghế VIP trống đó, bắt đầu **bái vài cái xong ngồi yên** (`pray_seated`, thời gian điều chỉnh từ ít nhất 3s). Hết giờ thì bước ra thảm đỏ đi về.
   - **Trường hợp 2 — KHÔNG có Slot VIP trống (`wait_for_vip_slot`):** Nhân vật **đứng chắp tay trang nghiêm ngay tại hàng VIP chờ**. Ngay khi có bất kỳ ghế VIP nào vừa trống, nhân vật lập tức nhận ghế đó và bước vào ngồi bái lễ.

---

## 4. Thuật Toán Quà Dâng Lễ & Bảng Hướng Dẫn Ngắn Gọn

Trên **Bảng Hướng Dẫn (HUD)** hiển thị nội dung cô đọng, ngắn gọn kèm icon model bên ngoài lề trái; bên dưới hệ thống vận hành đầy đủ thuật toán theo mệnh giá xu (`coins`):

| Tên trên Bảng | Hiển thị ngắn gọn | Thuật toán giá trị | Model Lễ Vật & Hiệu ứng đặc biệt |
| :--- | :--- | :--- | :--- |
| **Hoa hồng** | Sen hồng vừa | `1 coin` (`coins < 5`) | Model **Hoa Sen Hồng Vừa** (`rose`) dâng vào lư hương + vào hàng VIP. |
| **Bắn tim** | Sen vàng hoàng kim | `5 coins` (`5 <= coins < 10`) | Model **Hoa Sen Vàng Hoàng Kim** (`lotus`) + Thỉnh chuông chùa. |
| **Rosa** | Mâm hoa quả | `10 coins` (`coins === 10`) | Model **Mâm Hoa Quả Ngũ Sắc** (`tray`) + Thỉnh chuông chùa. |
| **Đặc biệt** | Mâm quả + Zoom 3s | `> 10 coins` (`coins > 10`) | Model **Mâm Hoa Quả Hoàng Kim** (`special_tray`) + **Ánh hào quang hoàng kim** rực sáng quanh nhân vật + **Khóa Camera Zoom cận cảnh vào nhân vật trong 3 giây**. |
| **Thả tim** | `+1 hoa sen` | Sự kiện `Like` | `+1` hoa sen vào Bảng Đại Lễ + 3 hoa sen nhỏ trên bảng tên + 1 hoa sen vừa bay có đuôi hồng về bảng Đại Lễ. |
| **Follow** | `+100 hoa sen` | Sự kiện `Follow` | `+100` hoa sen vào Bảng Sự Kiện Đại Lễ + 1 hoa sen bay về bảng. |
| **Bình luận** | Ước nguyện | Sự kiện `Comment` | Đi thắp nhang + hiện bảng lời nguyện trên đầu + vào ghế thường. |

> **Điều chỉnh độ mờ nền bảng (`hudOpacity`):** Trong `Dev Studio -> Layout & Map`, có thanh trượt **Độ mờ nền của tất cả các bảng HUD** (`10% -> 100%`) áp dụng đồng bộ cho mọi bảng trên màn hình.

---

## 5. Hàng Chờ Ưu Tiên Khi Phòng Đầy (`Priority Queue`)
- Khi tất cả các chỗ ngồi trong Chánh Điện đang đầy:
  - Khách bình luận thường (`0 xu`) được xếp vào cuối hàng chờ (`queueRef`).
  - **Người gửi quà dâng lễ (`coins > 0` / VIP):** Nếu đang nằm trong hàng chờ hoặc mới gửi quà khi phòng đầy, hệ thống tự động **đẩy thẳng lên đầu hàng chờ ưu tiên (Priority Front)** để được vào Chánh Điện dâng lễ ngay lập tức.

---

## 6. Hiệu Ứng Thả Tim (`Like`), Hiệu Ứng VIP & Bảng Sự Kiện Đại Lễ
1. **3 Bông Hoa Sen Nhỏ Bay Lên Phía Trên Tên Người Chơi:**
   - Khi người chơi Thả Tim, 3 bông hoa sen hồng nhỏ được vẽ chi tiết nhiều lớp cánh với nhụy vàng và kích thước nhỏ gọn (`w-2.5 h-2.5` / `w-3 h-3`) xuất hiện **ngay phía trên bảng tên người chơi (dưới chân nhân vật), đè lên phần thân dưới của model người chơi** và bay lên với **tốc độ nhẹ nhàng, uyển chuyển (~2 giây)**.
2. **1 Bông Hoa Sen Vừa Bay Có Đuôi Ánh Hồng Về Bảng Đại Lễ:**
   - Sau khi bấm Like, **1 bông hoa sen kích thước vừa** kèm **đuôi sao băng ánh hồng (`flyingLotuses`)** bay từ vị trí nhân vật nhập thẳng vào **Bảng Sự Kiện Đại Lễ**.
3. **Nháy Sáng Hồng Viền Thanh Đếm (`event-bar-pink-flash`):**
   - Mỗi khi số hoa sen/tim trong thẻ Sự Kiện Đại Lễ tăng lên, **viền thanh đếm tiến độ glow hồng sáng rực nháy lên 1 cái**.
4. **Hiệu Ứng VIP Khi Dâng Lễ:**
   - Khi dâng lễ (kể cả người chơi đang ngồi ở ghế thường trên sân mà gửi quà), người chơi lập tức trở thành **VIP (`isVip = true`)** và **bong bóng chat có viền vàng hoàng kim (`border-yellow-400`) cùng chữ vàng rực rỡ (`text-yellow-300`)**.
5. **Khi Đầy Thanh Tích Lũy Đại Lễ:**
   - Chùa ngân vang **1 tiếng Chuông Chùa** + **Mưa Hoa Sen Vàng rơi toàn màn hình trong 3 giây**.

---

## 7. Tab Dev Mới `NPC`: Danh Sách Tên/Lời Cầu Nguyện & Nhập Vai Điều Khiển (`AWSD` + `Q` + Chat)
- **Danh sách Tên NPC & Lời Cầu Nguyện NPC:**
  - Cho phép thêm mới, sửa trực tiếp từng dòng, xóa hoặc khôi phục mặc định danh sách Tên NPC và Lời Cầu Nguyện (lưu tự động vào `localStorage`).
- **Tần suất cầu nguyện của NPC (`npcPrayIntervalSec`):**
  - Điều chỉnh chu kỳ để các NPC đang ngồi bái lạy tự động bốc ngẫu nhiên 1 lời cầu nguyện mới từ danh sách.
- **Mục Điều Khiển NPC / Trụ Trì / Chú Tiểu:**
  - Cho phép chọn nhập vai bất kỳ **NPC Phật tử** nào trên sân (hoặc bấm **NPC Ngẫu Nhiên**) hay nhập vai **Sư Trụ Trì, Chú Tiểu Lớn, Chú Tiểu Nhỏ**.
  - **Di chuyển bằng phím `W, A, S, D`** mượt mà 60fps trên sân Chánh Điện.
  - **Gõ mõ bằng phím `Q`** (hoặc nút bấm trên bảng): Phát tiếng mõ Tịnh Tâm kèm vòng sóng âm lan tỏa và chuyển nhân vật sang tư thế gõ mõ/bái lạy.
  - **Nhập Chat trực tiếp:** Gõ nội dung chat và bấm gửi để bong bóng chat hiển thị ngay trên đầu NPC / Trụ trì / Chú tiểu đang điều khiển.

---

## 8. Cập Nhật `Layout & Map`: Size Nhân Vật Chung, Kéo Chọn Nhiều Ghế & Thời Gian Bong Bóng Chat
- **Kích thước nhân vật chung (`characterScale`):** Thanh trượt điều chỉnh tỷ lệ kích thước đồng bộ cho tất cả Phật tử, Sư Trụ Trì và Chú Tiểu (`50%` đến `180%`).
- **Kéo thả chọn nhiều vòng chỗ ngồi (`Multi-select Marquee & Group Drag`):** Khi bật **Vòng tròn vị trí**, có thể nhấn giữ và kéo chuột trên nền sân để quét khung chọn nhiều ghế ngồi cùng lúc (hoặc giữ `Shift + Click` từng ghế, hoặc dùng nút `Chọn hết` / `Chỉ VIP`), sau đó nắm kéo 1 ghế trong nhóm để di chuyển cả cụm ghế đồng thời.
- **Thời gian tồn tại bong bóng chat (`chatBubbleDurationSec`):** Điều chỉnh từ `2 giây` đến `60 giây` (`60 giây` = `Luôn hiện`).

