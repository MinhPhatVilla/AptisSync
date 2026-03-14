# AptisSync v2.0 — 🧠 Brain-Optimized Time Management

**AptisSync** là ứng dụng Quản lý thời gian & Ôn thi Aptis Intensive, được thiết kế lại hoàn toàn theo **nguyên lý khoa học thần kinh (Neuroscience)**, với đồng bộ realtime đa thiết bị.

---

## 🧬 Nền Tảng Khoa Học Não Bộ

### 1. Ultradian Rhythm — Block 52:17
- Thay thế block 90 phút cũ bằng **52 phút Deep Focus + 17 phút nghỉ Ultradian**
- Dựa trên nghiên cứu DeskTime: top 10% người hiệu suất cao nhất làm việc 52 phút, nghỉ 17 phút

### 2. Giấc Ngủ 5 Chu Kỳ (7h30)
- Giờ ngủ: **22:15** → Thức: **06:00** = 5 chu kỳ × 90 phút
- REM tập trung ở chu kỳ 4-5, cần thiết cho ghi nhớ ngôn ngữ
- Cũ: 4 chu kỳ (6h) → thiếu REM = mất ~40% khả năng ghi nhớ từ vựng

### 3. Cognitive Peak Scheduling
- **Buổi sáng (06-10h):** Cortisol cao → ưu tiên Nghe + Đọc (analytical)
- **Buổi chiều (14-17h):** Ưu tiên Nói + Viết (creative)
- **Buổi tối (19-21h):** Ôn lại + Spaced Review (consolidation)

### 4. Active Recovery (Nghỉ Chủ Động)
- App gợi ý hoạt động nghỉ cụ thể: đi bộ, thở 4-7-8, quy tắc 20-20-20
- Cảnh báo: **KHÔNG lướt điện thoại** khi nghỉ (não vẫn tiêu thụ dopamine)

### 5. Power Nap 20-26 phút
- Chỉ vào Stage 2 Sleep → tăng tỉnh táo mà không gây mụ mị
- Cảnh báo nếu ngủ > 30 phút (sẽ rơi vào SWS)

---

## 📂 Cấu Trúc Chuyên Nghiệp (Refactored)

```
src/
├── lib/
│   ├── types.ts          # Type definitions
│   ├── constants.ts      # Brain-optimized constants (có comment khoa học)
│   ├── schedule.ts       # Schedule engine (Ultradian + Cognitive Peak)
│   ├── supabase.ts       # Supabase client
│   └── utils.ts          # Utility functions
├── components/
│   ├── auth/
│   │   └── LoginScreen.tsx
│   ├── layout/
│   │   ├── MainLayout.tsx
│   │   └── Header.tsx
│   ├── timer/
│   │   └── TimerCircle.tsx
│   └── schedule/
│       ├── ScheduleTimeline.tsx
│       └── NightPlanModal.tsx
└── app/
    ├── page.tsx           # Main page (~350 lines, was 1236!)
    ├── focus/page.tsx     # Pomodoro + Ultradian modes
    ├── sleep/page.tsx     # Sleep calculator + Brain science
    ├── tasks/page.tsx     # Todo list
    └── layout.tsx         # Root layout
```

### Từ 1236 dòng → ~350 dòng (page.tsx)
- Tách **6 components** riêng biệt
- Thuật toán schedule tách thành **module có thể test độc lập**
- Constants có **comment giải thích khoa học** cho mỗi giá trị

---

## 🎮 Gamification Cải Tiến

| Feature | Mô tả |
|---|---|
| 🔥 **Streak Counter** | Đếm chuỗi ngày hoàn thành liên tục — reset khi fail |
| 🏆 **Best Streak** | Hiển thị kỷ lục streak cao nhất |
| 🥇 Sao Vàng | Hoàn thành 100% mục tiêu trong ngày |
| 🥈 Sao Bạc | Hoàn thành mỗi chu kỳ học |
| ❌ Ngày Nợ | Không hoàn thành + Reset streak |

---

## 🚀 Cài Đặt & Chạy

```bash
npm install
npm run dev
```

### Biến môi trường (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

---

## 💡 Ghi Chú Cho Session Kế Tiếp
- **Thêm Streak vào Database**: Cần ALTER TABLE thêm cột `streak` và `best_streak`
- **Deep Analytics Dashboard**: Biểu đồ tiến trình học theo tuần/tháng
- **Adaptive Block Duration**: Tự động điều chỉnh thời lượng block dựa trên performance data
- **Binaural Beats Integration**: Tích hợp 40Hz beats tăng tập trung khi học
