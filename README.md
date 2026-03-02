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

### 5. Cài Đặt Ứng Dụng (PWA - Progressive Web App)
- Cho phép biến trang web Cục Code Web thành một 1 Ứng dụng Desktop thuần túy mà không còn viền URL bằng phương thức nhấn Cài Đặt (Install URL Chrome PC). 
- Đem trực tiếp ứng dụng đặt ngay Màn hình chính Điện thoại (Home Screen) để vuốt là chạy qua Vercel Deployment `vercel.app`.

---

## 🛠 File Kiến Trúc Chính Đã Chỉnh Sửa

| Tên File | Vai Trò | Chỉnh Sửa Chính |
| --- | --- | --- |
| `src/app/page.tsx` | Front-end Logic (Main UI) | - Xây dựng Main System và 5-Min Night Plan.<br/>- Socket Listener của Supabase Channels<br/>- Audio Syntheses Logic & Gamification Tính Điểm<br/>- Dynamic Reschedule Time Logic. |
| `init_database.sql` | Khởi tạo Cấu Trúc DB | Thêm mới 3 Column: `stars` (Gold), `silver_stars` & `failed_days`. Thiết lập UUID kết nối với Supabase Auth. |
| `src/lib/supabase.ts` | Khởi tạo Client | Kết nối `NEXT_PUBLIC` Enviroment Database Config. |

---

## 🐞 Bug Quan Trọng Phải Lưu Ý
1. **[SOLVED] Lỗi Re-Trigger Giọng Nói Ngắt Quãng:** Trợ lý ảo bị nuốt lời vì hàm OnClick chồng lên nhau. Chốt chặn bằng hàm `window.speechSynthesis.cancel()` dọn sạch WaveForm trước khi nhả câu khác.
2. **[WARNING] Hiện tượng Đè Tiến Độ khi Đi Ngủ sớm:** Xử lý chốt bằng cách: Nếu chưa học block nào mà Đi ngủ thì vẫn tự động chuyển lịch sang ngày kế và 0 cộng sao Thất Bại thay vì Cướp điểm. Lập Schedule Sinh ra nhưng Không `setBlocks()` sớm trong hệ thống Reducer.
3. **[SYSTEM] Giọng máy tính là giọng Nam:** Xử lý qua Test trực tiếp (Không có API) vì Máy Tính Windows nếu không cài đặt gói `vi-VN pack Voice` thì không chèn ép API nói bằng nữ được. Lên iOS / Android hoạt động 100% Nữ.

---
## 💡 Ghi Chú cho Session Kế Tiếp
- **Bảng Vinh Danh (Leaderboard / Tracking Lịch Sử):** Hiện tại thông số Sao mới chỉ nằm dạng Số nguyên (INT) lưu trữ nội bộ trên Góc Màn Hình, cần mở rộng thành Biểu đồ Lịch sử Hành Trình để biết được Sao kiếm ở vị trí ngày nào.
- **Micro-animations:** Cải tiến độ linh hoạt của việc Check Block (Hiện mới đổi nút qua màu Xanh) có thể chèn hiệu ứng Sparkle Mưa sao băng khi lấy Sao bạc để hấp dẫn hơn. 
- Hiện App đã đẩy gọn nhẹ lên Branch Main của `https://github.com/MinhPhatVilla/AptisSync.git` liên quan trực tiếp đến Máy Chủ Triển Khai URL trên **Vercel** (`minhphatvillatg.vercel.app`). Lưu ý khi code đổi bất kì dòng nào trong nhánh này đều sẽ **Làm thay đổi Website Người Dùng tự động**.
