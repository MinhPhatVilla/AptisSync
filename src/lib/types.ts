// ============================================
// AptisSync - Core Type Definitions
// ============================================

export type Block = {
  id: number;
  title: string;
  durationMins: number;
  completed: boolean;
  /** Cognitive category for peak-time scheduling */
  cognitive: "analytical" | "creative" | "review";
};

export type ScheduleItem = {
  time: string;
  title: string;
  desc: string;
  type: "aptis" | "school" | "urgent" | "rest" | "sleep" | "completed";
  isActive?: boolean;
  completed?: boolean;
  /** Active recovery suggestions for rest blocks */
  recoveryTips?: string[];
};

export type SchoolShift =
  | "Sáng & Chiều"
  | "Chỉ buổi Sáng"
  | "Chỉ buổi Chiều"
  | "Thứ 7 (Học cả ngày)"
  | "Nghỉ ở nhà"
  | "";

export type CognitivePeak = {
  startHour: number;
  endHour: number;
  label: string;
  bestFor: "analytical" | "creative" | "review" | "rest";
  emoji: string;
};

export type UserState = {
  blocks: Block[];
  activeBlockIndex: number;
  timeLeft: number;
  isActive: boolean;
  isPausedDay: boolean;
  stars: number;
  silverStars: number;
  failedDays: number;
  streak: number;
  bestStreak: number;
  schedule: ScheduleItem[];
  scheduleDate: string | null;
  endTime: string | null;
};
