// ============================================
// AptisSync - Brain-Optimized Constants
// ============================================
// Based on: Ultradian Rhythm, Circadian Peak,
// Sleep-dependent Memory Consolidation research
// ============================================

import type { Block, CognitivePeak } from "./types";

// ── Deep Focus Block Duration ──
// DeskTime research: top 10% performers work 52min, rest 17min
export const FOCUS_DURATION = 52; // minutes
export const BREAK_DURATION = 17; // minutes (Ultradian rest)
export const SHORT_BREAK = 10;    // minutes (micro-break for tight windows)

// ── Target Minutes ──
// 4 blocks × 52 min = 208 min (vs old 270 min of lower quality)
export const TARGET_MINUTES = 208;

// ── Sleep Science ──
// 1 sleep cycle = 90 min, 15 min to fall asleep
export const SLEEP_CYCLE_MINS = 90;
export const FALL_ASLEEP_MINS = 15;

// ── Bedtime Cố Định ──
// Em muốn ngủ 23:45 cố định mỗi ngày
export const BEDTIME_MINS = 23 * 60 + 45;     // 23:45 (lên giường)
export const DIGITAL_SUNSET_MINS = 23 * 60 + 30; // 23:30 (tắt màn hình)
export const END_OF_STUDY_MINS = 23 * 60;     // 23:00 (hết phiên học tối)

// ── Wake Time Tuỳ Chọn ──
// Bed 23:45 → ngủ ~00:00 (15p ru ngủ)
// Dậy 06:00 = 4 chu kỳ (6h) — nước rút
// Dậy 07:30 = 5 chu kỳ (7h30) — đủ REM ghi nhớ ngôn ngữ ✓
export type WakeOption = { time: number; label: string; cycles: number; sleepHours: number; note: string };

export const WAKE_OPTIONS: WakeOption[] = [
  {
    time: 6 * 60,       // 06:00
    label: "06:00",
    cycles: 4,
    sleepHours: 6,
    note: "4 chu kỳ — nước rút, phù hợp khi có ca sáng",
  },
  {
    time: 7 * 60 + 30,  // 07:30
    label: "07:30",
    cycles: 5,
    sleepHours: 7.5,
    note: "5 chu kỳ — đủ REM cho ghi nhớ ngôn ngữ ✓",
  },
];

export const DEFAULT_WAKE_MINS = 7 * 60 + 30; // 07:30 mặc định

// ── Helper: tính số chu kỳ từ wake time ──
export const calcCyclesFromWake = (wakeMins: number): number => {
  let sleepDuration = wakeMins - (BEDTIME_MINS + FALL_ASLEEP_MINS);
  if (sleepDuration < 0) sleepDuration += 24 * 60;
  return Math.round(sleepDuration / SLEEP_CYCLE_MINS);
};

// ── Power Nap ──
// Stage 2 sleep only: 20-26 min optimal
// >30 min = enters SWS → sleep inertia (groggy)
export const POWER_NAP_MIN = 20;
export const POWER_NAP_MAX = 26;
export const POWER_NAP_DANGER = 30; // warn if exceeding

// ── Initial Study Blocks (Brain-Optimized) ──
// Ordered by cognitive demand matching circadian peaks
export const INITIAL_BLOCKS: Block[] = [
  {
    id: 1,
    title: "Luyện Nghe & Đọc Hiểu",
    durationMins: FOCUS_DURATION,
    completed: false,
    cognitive: "analytical", // Best in morning (high cortisol)
  },
  {
    id: 2,
    title: "Từ Vựng & Ngữ Pháp",
    durationMins: FOCUS_DURATION,
    completed: false,
    cognitive: "analytical",
  },
  {
    id: 3,
    title: "Luyện Nói & Viết",
    durationMins: FOCUS_DURATION,
    completed: false,
    cognitive: "creative", // Best in afternoon (relaxed focus)
  },
  {
    id: 4,
    title: "Ôn Lại & Spaced Review",
    durationMins: FOCUS_DURATION,
    completed: false,
    cognitive: "review", // Best in evening (consolidation)
  },
];

// ── Cognitive Peaks (Circadian Rhythm Map) ──
export const COGNITIVE_PEAKS: CognitivePeak[] = [
  { startHour: 6,  endHour: 10, label: "Đỉnh Sáng",     bestFor: "analytical", emoji: "🧠" },
  { startHour: 10, endHour: 12, label: "Giảm Dần",       bestFor: "analytical", emoji: "📚" },
  { startHour: 12, endHour: 14, label: "Đáy Trưa",       bestFor: "rest",       emoji: "😴" },
  { startHour: 14, endHour: 17, label: "Đỉnh Chiều",     bestFor: "creative",   emoji: "✍️" },
  { startHour: 19, endHour: 21, label: "Ôn Tập Tối",     bestFor: "review",     emoji: "📖" },
  { startHour: 21, endHour: 23, label: "Wind Down",       bestFor: "rest",       emoji: "🌙" },
];

// ── Active Recovery Suggestions ──
// Real rest ≠ scrolling phone (still consumes dopamine)
export const RECOVERY_ACTIVITIES = {
  short: [ // For 10-min breaks
    "🚶 Đi bộ nhẹ 5 phút, uống nước",
    "👁️ Quy tắc 20-20-20: Nhìn xa 20 feet trong 20 giây",
    "🧘 Thở sâu 4-7-8 (hít 4s, giữ 7s, thở 8s)",
  ],
  standard: [ // For 17-min Ultradian breaks
    "🚶 Đi bộ nhẹ 5 phút → Quay lại review nhanh 5 phút",
    "🧘 Thiền 5 phút + Giãn cơ cổ vai gáy",
    "🎵 Nghe nhạc không lời + Nhắm mắt thư giãn",
    "👁️ 20-20-20 → Uống nước → Đi bộ quanh phòng",
    "📵 Tuyệt đối KHÔNG lướt điện thoại (não vẫn tiêu thụ dopamine)",
  ],
  long: [ // For 20-30+ min breaks
    "🏃 Thể dục nhẹ 10 phút (jumping jacks, plank)",
    "🚶 Đi bộ ngoài trời + Hít thở sâu",
    "🧘 Yoga/Giãn cơ toàn thân 15 phút",
    "📵 Digital detox hoàn toàn + Nghe thiên nhiên",
  ],
};

// ── Fixed Daily Blocks ──
// Morning blocks depend on wake time, so we use earliest possible (06:00)
export const FIXED_BLOCKS = {
  lunch: { start: 11 * 60, end: 11 * 60 + 30, title: "Ăn trưa", desc: "Nạp năng lượng — tránh carbs đơn giản gây buồn ngủ", type: "rest" as const },
  powerNap: { start: 11 * 60 + 30, end: 12 * 60, title: "Power Nap (20-26p)", desc: "⚠️ KHÔNG ngủ quá 30p → Stage 2 Sleep = tăng tỉnh táo", type: "rest" as const },
  napBuffer: { start: 12 * 60, end: 12 * 60 + 15, title: "Buffer chống mù ngủ", desc: "Uống nước lạnh, đi bộ nhẹ, ánh sáng mạnh", type: "rest" as const },
  exercise: { start: 17 * 60, end: 17 * 60 + 30, title: "Thể thao nhẹ", desc: "Tăng BDNF → trực tiếp hỗ trợ ghi nhớ dài hạn", type: "rest" as const },
  shower: { start: 17 * 60 + 30, end: 18 * 60, title: "Tắm rửa", desc: "Hạ nhiệt cơ thể → chuẩn bị cho phiên tối", type: "rest" as const },
  dinner: { start: 18 * 60, end: 18 * 60 + 30, title: "Ăn tối", desc: "Ăn nhẹ, tránh cafein sau 14h", type: "rest" as const },
};

// ── Dynamic Morning Blocks (depends on wake time) ──
export const getMorningBlocks = (wakeMins: number) => ({
  morning: { start: wakeMins, end: wakeMins + 30, title: "Thức dậy & Vệ sinh", desc: `${formatMinsStatic(wakeMins)} — Tiếp xúc ánh sáng tự nhiên`, type: "rest" as const },
  breakfast: { start: wakeMins + 30, end: wakeMins + 60, title: "Ăn sáng", desc: "Carbs phức + protein → glucose ổn định cho não", type: "rest" as const },
});

// ── Dynamic Evening Blocks (fixed bedtime 23:45) ──
export const getEveningBlocks = (wakeMins: number) => {
  const cycles = calcCyclesFromWake(wakeMins);
  const sleepHours = (cycles * SLEEP_CYCLE_MINS) / 60;

  return {
    freeTime: { start: 23 * 60, end: 23 * 60 + 30, title: "Thời gian tự do", desc: "Giải trí nhẹ — não cần downtime", type: "rest" as const },
    digitalSunset: { start: 23 * 60 + 30, end: BEDTIME_MINS, title: "Digital Sunset", desc: "📵 Tắt màn hình xanh, đọc sách giấy", type: "rest" as const },
    sleep: { start: BEDTIME_MINS, end: wakeMins, title: `💤 Ngủ sâu (${cycles} chu kỳ = ${sleepHours}h)`, desc: `Lên giường 23:45 → Thức ${formatMinsStatic(wakeMins)}`, type: "sleep" as const },
  };
};

// ── School Shift Blocks ──
export const SCHOOL_SHIFTS = {
  morning: { start: 7 * 60, end: 11 * 60, title: "Học trên trường (Ca Sáng)", desc: "Tập trung học trên lớp", type: "school" as const },
  afternoon: { start: 13 * 60, end: 17 * 60, title: "Học trên trường (Ca Chiều)", desc: "Tập trung học trên lớp", type: "school" as const },
};

// ── Night Plan Time ──
export const NIGHT_PLAN_START_HOUR = 22; // Cho phép lập kế hoạch từ 22h
export const NIGHT_PLAN_AUTO_HOUR = 22;  // Tự động popup lúc 22h

/** Format mins to HH:MM (static helper for constants) */
export const formatMinsStatic = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
