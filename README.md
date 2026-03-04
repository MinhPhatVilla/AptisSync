# AptisSync - Quản Lý Thời Gian & Học Tập (Focus App)

**AptisSync** là ứng dụng Quản lý thời gian, tối ưu hóa quá trình học tập (đặc biệt ôn thi Aptis Intensive) ứng dụng nguyên tắc Pomodoro nâng cao và Gamification (game hóa), với khả năng đồng bộ vĩnh viễn theo thời gian thực (Real-time).

Ứng dụng được sinh ra để hỗ trợ tối đa việc ép tiến độ ôn luyện nước rút kết hợp phân bổ thời gian nghỉ ngơi chuẩn khoa học.

---

## 🌟 Chức Năng Cốt Lõi (Đã Hoàn Thành Trong Cuộc Trò Chuyện Lần Này)

### 1. Đồng Bộ Hóa Đa Thiết Bị (Supabase Real-time Sync)
- 🔌 **Đồng bộ thời gian thực:** Trạng thái của Timer đếm ngược, khối lượng bài học (Block) đều được đồng bộ hai chiều ngay lập tức bằng WebSocket qua Supabase. Bấm "Pause" trên Laptop thì trên màn hình iPhone cũng dừng lại.
- 💾 **Lưu trữ đám mây:** Cấu hình thời gian ngủ, các bài tập khẩn và tiến độ đều được tự động sao lưu vào bảng `user_state` của PostgresDB.
- 🔒 **Đăng nhập siêu tốc:** Đã lược bỏ hoàn toàn xác thực OTP Email. Cơ chế đăng ký tự động và đăng nhập nội bộ (Self-hosted) qua Supabase Auth chỉ yêu cầu Mật Khẩu và Email nhanh gọn.

### 2. Tái Thiết Lập Lịch Trình Động (Dynamic Break Spreading)
- Thuật toán AI tự động lấp đầy quỹ thời gian và dồn lịch học linh hoạt nếu gặp gián đoạn.
- **Nút "Bận Đột Xuất (Pause)":** Đóng băng bộ đếm nếu có sự cố chen ngang.
- **Nút "Đã Về, Làm Lại (Resume)":** Tính toán lại thời gian còn lại trong ngày (kể từ lúc bấm cho tới giờ đi ngủ) để phân bổ tiến độ học và các khoảng dãn cách nghỉ ngơi auto từ 5-15 phút mà không bị cháy giáo án.

### 3. Hệ Thống Gamification (Đánh Giá & Nhận Thưởng)
Biến hệ thống quản lý khô khan thành một trò chơi rèn luyện kỷ luật bằng cơ chế tính điểm thông qua 3 mốc Sao ở màn hình chính (Góc Trái Màn Hình):
- 🥈 **Sao Bạc (Silver Star):** Cộng thêm 1 điểm khi người dùng chạy hết và báo cáo "Hoàn Thành" 1 Block học. (Được chị Google thông báo chúc mừng).
- 🥇 **Sao Vàng (Gold Star):** Nhận ngay huy chương danh giá này khi bấm nút `Xác nhận & Đi Ngủ` vào lúc 22:00 mỗi cuối ngày MÀ KHÔNG BỎ SÓT (Tick đủ 100%) bất kỳ Block học nào. (Âm báo chúc mừng vinh quang).
- ❌ **Chưa Đạt:** Nhận 1 dấu cảnh báo đen nếu đến chu kỳ đi ngủ mà vẫn còn gian dở nhiệm vụ. Đồng thời dọn dẹp lịch sang trang trắng để hôm sau phục thù tiến độ mà không bị ảnh hưởng.

### 4. Báo Động & Giọng Nói (Text-to-Speech)
- **Tự động gọi Trợ Lý Ảo (Giọng Nữ):** Ứng dụng quét toàn bộ ngôn ngữ trên Trình duyêt hệ thống, ưu tiên chọn lọc các gói giọng Tiếng Việt phân loại Giọng Nữ (Ví dụ: `Google Tiếng Việt`, `Microsoft Hoài My`, các cái tên `Lieu`, `Linh`...).
- Giao diện có tích hợp nút Chuông để liên tục thay đổi nếu như giọng đọc mặc định đang là giọng nam khó nghe. (Đồng thời sẽ được tự hóa chuẩn trên iOS/Android Mobile Devices do sở hữu Siri Voice mặc định tốt).

### 5. Tối Ưu Hóa Trục Thời Gian (Timeline & Focus Display)
- **Hiển thị On-The-Fly Tracker:** Tự động ước tính và rải đều các mốc thời gian hiển thị (VD: 15:30 - 17:00) cho danh sách lịch học phía dưới dựa trên giờ thực tế của thiết bị ngay cả khi người dùng chưa Cài Đặt Ban Đêm (Night Plan).
- Ẩn/xóa linh hoạt (Auto-drop) các thẻ trạng thái không còn nằm trong tầm kiểm soát thời gian (Quá hạn) nhưng vẫn giữ lại các mốc Task nếu chưa check hoàn thành.

### 6. Cài Đặt Ứng Dụng Nền Web (PWA - Progressive Web App)
- **Hỗ Trợ Ngoại Tuyến (Offline Support):** Đã kết hợp chặt chẽ cùng thư viện `@ducanh2912/next-pwa` và file `next.config.mjs` để cài cắm Service Worker. 
- Giờ đây, người dùng "Add to Home Screen" trên iPhone/Android sẽ tải xuống một Ứng dụng thực thụ, mở mượt mà và chạy độc lập **KHÔNG CẦN CÓ MẠNG WI-FI/3G**.

---

## 🛠 File Kiến Trúc Chính Đã Chỉnh Sửa

| Tên File | Vai Trò | Chỉnh Sửa Chính |
| --- | --- | --- |
| `src/app/page.tsx` | Front-end Logic (Main UI) | - Bổ sung thuật toán vá khoảng trống thời gian, kết nối mốc ngủ.<br/>- Bổ sung cấu trúc List Timeline theo thời gian tính toán On-The-Fly. |
| `next.config.mjs` | Cấu hình Module App | Đổi định dạng tệp sang `.mjs`, bọc cấu hình `withPWA` để thiết lập Cache Front-End qua Service Worker. |

---

## 🐞 Bug Quan Trọng Phải Lưu Ý
1. **[SOLVED] Lỗ Hổng Khoảng Trắng Khi Ép Lịch:** Khi quỹ thời gian còn lại không đủ và App quyết định "Dropped" (Xóa bớt đi 1 Chu kỳ), xuất hiện khoảng trắng 80-100 phút nhảy cóc tới giờ tắt đèn. Đã fix bằng việc tự động sản sinh Block "Thư giãn tự do" trám kín chỗ trống lẻ tẻ đó.
2. **[SOLVED] Lỗi Re-Trigger Giọng Nói Ngắt Quãng:** Trợ lý ảo bị nuốt lời vì hàm OnClick chồng lên nhau. Chốt chặn bằng hàm `window.speechSynthesis.cancel()` dọn sạch WaveForm trước khi nhả câu khác.
3. **[WARNING] Hiện tượng Đè Tiến Độ khi Đi Ngủ sớm:** Phải cẩn trọng thiết lập setBlocks ở hệ thống Reducer để không cướp điểm sao.

---
## 💡 Ý Tưởng Kinh Doanh (Monetization Strategies) & Kế Hoạch Hiện Thực Hóa
Dưới đây là 3 "Killer Features" - lý do hoàn hảo thuyết phục người dùng nâng cấp lên Premium Version thay vì xài Free:
- **Phase 1: Deep Analytics (Khai phá Insight Tiến độ):** Cung cấp biểu đồ heatmap chi tiết, trích xuất báo cáo học tập và theo dõi "Giờ vàng" (Giờ học vào nhất).
- **Phase 2: Commitment Device (Kỷ luật thép / Chế độ cam kết Tài Chính):** Cơ chế "Độc tài" tự động trừ Tiền/Uy Tín nếu có ý định lướt Tiktok trốn tránh ca học (Đánh vào tính kỷ luật của hội thi IELTS/Aptis).
- **Phase 3: Social Accountability (Đồng Bộ Xã Hội):** Tạo phòng học ảo, thách đấu tiến độ với Leaderboard và Group Study.

### Ghi Chú cho Session Kế Tiếp:
- **Tối ưu Hiệu Năng Focus:** Cần tách nhỏ `page.tsx` (hiện >1000 lines) thành các Micro-components. Xử lý đồng hồ `setInterval` bằng `endTimeRef` toàn diện chống trình duyệt ngủ quên gây đếm sai dây (Background Throttling).
- **Đồng bộ hóa User State:** Connect sao vàng/bạc lưu trực tiếp lên PostgreSQL Supabase `user_state`.
- Hiện App đã đẩy gọn nhẹ lên Branch Main của `https://github.com/MinhPhatVilla/AptisSync.git`. Mọi sửa đổi đều Trigger Vercel Build ngầm.
