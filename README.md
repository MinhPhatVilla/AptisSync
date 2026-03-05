# AptisSync - Quản Lý Thời Gian & Học Tập (Focus App)

**AptisSync** là ứng dụng Quản lý thời gian, tối ưu hóa quá trình học tập (đặc biệt ôn thi Aptis Intensive) ứng dụng nguyên tắc Pomodoro nâng cao và Gamification (game hóa), với khả năng đồng bộ vĩnh viễn theo thời gian thực (Real-time).

Dự án được tạo ra để hỗ trợ tối đa việc ép tiến độ ôn luyện nước rút kết hợp phân bổ thời gian nghỉ ngơi chuẩn khoa học.

---

## 🌟 Chức Năng Mới & Tối Ưu Hóa (Đã Hoàn Thành Lần Này)

### 1. Tối Ưu Giao Diện Điện Thoại (Mobile UX/UI Redesign)
- **Header Mobile Thông Minh:** Thiết kế lại layout header trên điện thoại (đưa 3 nút chức năng chuông, chế độ đêm, đăng xuất vào cùng hàng với tiêu đề) để không bị tràn màn hình, 100% người dùng thao tác dễ dàng.
- **Badge Thống Kê Flex-wrap:** Các badge (Countdown, Huy hiệu) tự động xuống dòng đẹp mắt nếu màn hình nhỏ.
- **Loại bỏ chữ thừa:** Ẩn text "Powered by Minh Phát Villa" trên moblie để tiết kiệm không gian.

### 2. Định Hình Lại Lịch Trình Khoa Học & Thực Tế (Scientific Scheduling)
- **Khung Giờ Sinh Hoạt Cố Định:** Thuật toán giờ đây tuân thủ các mốc thời gian thực tế:
  - `06:00 - 07:00`: Thức dậy & Ăn sáng
  - `11:00 - 13:00`: Ăn trưa & Ngủ trưa bắt buộc (20-30p)
  - `17:00 - 19:00`: Thể dục, Tắm rửa & Ăn tối (Mở rộng từ 1.5h lên 2h)
  - `23:45`: Giờ giới nghiêm (Giường ngủ), đảm bảo ngủ đủ 4 chu kỳ ngủ (6h15p).
- **Phân Bổ Kịch Bản Linh Hoạt:** Tuỳ biến lịch dựa vào ca học trên trường, từ ca "Sáng & Chiều", "Chỉ Sáng", "Chỉ Chiều", đến "Nghỉ ở nhà" và đặc biệt bổ sung option **"Thứ 7 (Học cả ngày)"**.
- **Micro-breaks:** Tích hợp các khoảng nghỉ giải lao cực ngắn (5-10 phút) giữa các block liên tiếp sát nhau mà không làm mất đà học. 

### 3. Sửa Lỗi Thuật Toán (Critical Algorithms Fixed)
- **Fix lỗi bị "nuốt" lịch trình ngày hôm sau:** Hệ thống (Night Plan) phân biệt sự khác biệt giữa lịch trình ngày *hiện tại* và ngày *tiếp theo* để không vô tình xoá mất (reset) toàn bộ thời khóa biểu sáng hôm sau.
- **Fix tính toán thời gian giải lao sai logic (2 khung nghỉ nối tiếp):** Break bây giờ luôn được chèn đúng GIỮA các blocks (numBreaks = số block - 1), và hạn chế vượt giới hạn tổng số phút nghỉ bằng việc bỏ logic "ép 5 phút tối thiểu vô lý" gây tràn giờ.
- **Giới hạn thời gian (Bedtime Limit):** Thuật toán tự động (Fallback Timeline) drop các block học tập nếu tính toán thời gian thấy vượt quá giờ đi ngủ (23:45), bỏ đi chu kỳ dư thừa bảo vệ sức khỏe.
- **Time Sync & Bug 5 phút:** Ứng dụng quản lý thời gian đồng bộ chính xác thời gian thực ở component lịch học thay vì dựa dẫm vào time block trên thiết bị trôi mất.

### 4. Code Audit Toàn Diện
- Báo cáo kiểm tra chi tiết đã được viết riêng vào một file `code_audit_report.md` tổng kết từ bảo mật (Security), đến khả năng tính toán (Algorithm), cho đến hiệu suất (Performance). Code đảm bảo khả năng Render nhanh, Auth chuẩn xác Supabase. 

---

## 🛠 File Kiến Trúc Chính Đã Chỉnh Sửa

| Tên File | Vai Trò | Chỉnh Sửa Chính |
| --- | --- | --- |
| `src/app/page.tsx` | Front-end Logic (Main UI) | - Đập đi xây lại hoàn toàn thuật toán `generateSchedule` để bám sát thực tế sinh hoạt.<br/>- Sửa logic kiểm tra `isStaleSchedule` và ngày tạo `schedule_date` để Night Plan chạy ổn định.<br/>- Re-design Header Mobile cho tối ưu hiển thị CSS (w-4, p-2.5, flex-wrap).<br/>- Sửa toàn bộ thuật toán break (nghỉ ngơi) chống tràn 23h45. |
| `src/components/layout/MainLayout.tsx` | App Layout | Sửa lại thanh cuộn (Scrollbar) bị khuất. |
| `code_audit_report.md`| Audit Report | Báo cáo chi tiết bảo mật, hiệu năng, phân tích bugs và những ý tưởng trong tương lai.|

---

## 💡 Ghi Chú cho Session Kế Tiếp
- **Tối ưu Component Khổng Lồ:** `page.tsx` đã vượt quá 1200 lines. Nên cân nhắc tách các khối như `HeaderSection`, `TimerSection`, `ScheduleList`, `NightPlanModal` thành các files cụ thể nằm trong mục `src/components/...`.
- **Giảm tần suất API Calls (Supabase):** Hook `useEffect` cho thời gian thực có thể bị Throttle/Debounce để giảm thiểu traffic (re-render mỗi giây hiện thời chưa tốt cho mobile devices pin yếu).
- **Phát triển Phase 1 - Deep Analytics:** Bắt đầu suy nghĩ xây dựng thêm Dashboard hiển thị tiến độ học tập.
- **Git Push/Deploy:** Thói quen gõ `git pushall` hoặc nhấn Vercel Auto Deploy luôn được tuân thủ. Mọi chỉnh sửa đã được update.
