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
// 1 sleep cycle = 90 min
// Em chọn cố định 6 hoặc 7 chu kỳ tùy ngày
// 15 min to fall asleep
export const SLEEP_CYCLE_MINS = 90;
export const FALL_ASLEEP_MINS = 15;

// ── Chu Kỳ Ngủ Tuỳ Chọn ──
// 6 chu kỳ = 9h ngủ → bed 21:30
// 7 chu kỳ = 10h30 ngủ → bed 20:00
export const SLEEP_CYCLE_OPTIONS = [6, 7] as const;
export const DEFAULT_SLEEP_CYCLES = 6;

// ── Wake Time Cố Định ──
export const WAKE_TIME_MINS = 6 * 60 + 45;  // 06:45 cố định

// ── Bedtime Calculator ──
// Tính giờ ngủ từ giờ dậy và số chu kỳ
export const calcBedtime = (cycles: number): number => {
  // bedtime = wake - (cycles * 90 + 15 fall asleep)
  const totalSleepMins = cycles * SLEEP_CYCLE_MINS + FALL_ASLEEP_MINS;
  let bed = WAKE_TIME_MINS - totalSleepMins;
  if (bed < 0) bed += 24 * 60; // wrap around midnight
  return bed;
};

// ── Pre-calculated Bedtimes ──
// 6 chu kỳ: 06:45 - 9h15 = 21:30
// 7 chu kỳ: 06:45 - 10h45 = 20:00
export const BEDTIME_6_CYCLES = calcBedtime(6);  // 21:30 = 1290 min
export const BEDTIME_7_CYCLES = calcBedtime(7);  // 20:00 = 1200 min

// Default bedtime (6 chu kỳ)
export const BEDTIME_MINS = BEDTIME_6_CYCLES;     // 21:30
export const DIGITAL_SUNSET_MINS = BEDTIME_6_CYCLES - 15; // 21:15
export const END_OF_STUDY_MINS = BEDTIME_6_CYCLES - 60;   // 20:30 (hết phiên học tối)

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
export const FIXED_BLOCKS = {
  morning: { start: 6 * 60 + 45, end: 7 * 60 + 15, title: "Thức dậy & Vệ sinh", desc: "06:45 — Tiếp xúc ánh sáng tự nhiên, reset circadian clock", type: "rest" as const },
  breakfast: { start: 7 * 60 + 15, end: 7 * 60 + 45, title: "Ăn sáng", desc: "Carbs phức + protein → glucose ổn định cho não", type: "rest" as const },
  lunch: { start: 11 * 60, end: 11 * 60 + 30, title: "Ăn trưa", desc: "Nạp năng lượng — tránh carbs đơn giản gây buồn ngủ", type: "rest" as const },
  powerNap: { start: 11 * 60 + 30, end: 12 * 60, title: "Power Nap (20-26p)", desc: "⚠️ KHÔNG ngủ quá 30p → Stage 2 Sleep = tăng tỉnh táo", type: "rest" as const },
  napBuffer: { start: 12 * 60, end: 12 * 60 + 15, title: "Buffer chống mù ngủ", desc: "Uống nước lạnh, đi bộ nhẹ, ánh sáng mạnh", type: "rest" as const },
  exercise: { start: 17 * 60, end: 17 * 60 + 30, title: "Thể thao nhẹ", desc: "Tăng BDNF → trực tiếp hỗ trợ ghi nhớ dài hạn", type: "rest" as const },
  shower: { start: 17 * 60 + 30, end: 18 * 60, title: "Tắm rửa", desc: "Hạ nhiệt cơ thể → chuẩn bị cho phiên tối", type: "rest" as const },
  dinner: { start: 18 * 60, end: 18 * 60 + 30, title: "Ăn tối", desc: "Ăn nhẹ, tránh cafein sau 14h", type: "rest" as const },
};

// ── School Shift Blocks ──
export const SCHOOL_SHIFTS = {
  morning: { start: 7 * 60, end: 11 * 60, title: "Học trên trường (Ca Sáng)", desc: "Tập trung học trên lớp", type: "school" as const },
  afternoon: { start: 13 * 60, end: 17 * 60, title: "Học trên trường (Ca Chiều)", desc: "Tập trung học trên lớp", type: "school" as const },
};

// ── Night Plan Time ──
export const NIGHT_PLAN_START_HOUR = 19; // Cho phép lập kế hoạch từ 19h (vì 7 chu kỳ = ngủ 20:00)
export const NIGHT_PLAN_AUTO_HOUR = 20;  // Tự động popup lúc 20h

// ── Helper: tạo dynamic fixed blocks theo số chu kỳ ──
export const getDynamicFixedBlocks = (cycles: number) => {
  const bedtime = calcBedtime(cycles);
  const digitalSunset = bedtime - 15;
  const freeTimeStart = bedtime - 60;
  const sleepHours = (cycles * SLEEP_CYCLE_MINS) / 60;

  return {
    freeTime: { start: freeTimeStart, end: digitalSunset, title: "Thời gian tự do", desc: "Giải trí nhẹ — não cần downtime", type: "rest" as const },
    digitalSunset: { start: digitalSunset, end: bedtime, title: "Digital Sunset", desc: "📵 Tắt màn hình xanh, đọc sách giấy", type: "rest" as const },
    sleep: { start: bedtime, end: WAKE_TIME_MINS, title: `💤 Ngủ sâu (${cycles} chu kỳ = ${sleepHours}h)`, desc: `Lên giường lúc ${formatMinsStatic(bedtime)} → Thức 06:45`, type: "sleep" as const },
  };
};

/** Format mins to HH:MM (static helper for constants) */
const formatMinsStatic = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
