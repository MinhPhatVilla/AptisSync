// ============================================
// AptisSync - Brain-Optimized Schedule Engine
// ============================================
// Ultradian Rhythm + Circadian Peak scheduling
// ============================================

import type { Block, ScheduleItem, SchoolShift } from "./types";
import {
  FOCUS_DURATION,
  BREAK_DURATION,
  SHORT_BREAK,
  INITIAL_BLOCKS,
  FIXED_BLOCKS,
  SCHOOL_SHIFTS,
  RECOVERY_ACTIVITIES,
  COGNITIVE_PEAKS,
  calcBedtime,
  getDynamicFixedBlocks,
  DEFAULT_SLEEP_CYCLES,
  SLEEP_CYCLE_MINS,
  WAKE_TIME_MINS,
} from "./constants";

// ── Helpers ──

/** Format minutes → "HH:MM" */
export const formatMins = (mins: number): string => {
  let h = Math.floor(mins / 60) % 24;
  let m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** Add minutes to [h, m] tuple */
export const addMins = (h: number, m: number, add: number): [number, number] => {
  const total = h * 60 + m + add;
  return [Math.floor(total / 60) % 24, total % 60];
};

/** Get a random recovery tip for given break duration */
export const getRecoveryTips = (breakMins: number): string[] => {
  if (breakMins >= 20) return RECOVERY_ACTIVITIES.long;
  if (breakMins >= 15) return RECOVERY_ACTIVITIES.standard;
  return RECOVERY_ACTIVITIES.short;
};

/** Get current cognitive peak info */
export const getCurrentCognitivePeak = (hourOfDay: number) => {
  return COGNITIVE_PEAKS.find(
    (p) => hourOfDay >= p.startHour && hourOfDay < p.endHour
  );
};

/** Sort blocks to match current cognitive peak (analytical first in AM, creative in PM) */
export const sortBlocksByCognitivePeak = (
  blocks: Block[],
  startHour: number
): Block[] => {
  const peak = getCurrentCognitivePeak(startHour);
  if (!peak) return blocks;

  const sorted = [...blocks];
  sorted.sort((a, b) => {
    // Prioritize blocks matching current peak
    const aMatch = a.cognitive === peak.bestFor ? -1 : 0;
    const bMatch = b.cognitive === peak.bestFor ? -1 : 0;
    return aMatch - bMatch;
  });
  return sorted;
};

// ── Main Schedule Generator ──

type ScheduleResult = {
  schedule: ScheduleItem[];
  unassignedBlocks: Block[];
};

/**
 * Generate a brain-optimized daily schedule
 *
 * Key principles:
 * 1. 52:17 Ultradian rhythm (DeskTime research)
 * 2. Cognitive peak matching (analytical AM, creative PM)
 * 3. Active recovery breaks (no phone scrolling!)
 * 4. Hard bedtime based on chosen sleep cycles (6 or 7)
 * 5. Power nap 20-26 min (never >30)
 */
export const generateBrainSchedule = (
  startMins: number,
  schoolShift: SchoolShift,
  blocks: Block[],
  activeBlockIndex: number,
  timeLeft: number,
  urgentTask: string,
  urgentTaskCycles: number,
  planningForTomorrow: boolean,
  sleepCycles: number = DEFAULT_SLEEP_CYCLES
): ScheduleResult => {
  const schedule: ScheduleItem[] = [];
  let currentMins = startMins;

  // ── Build fixed blocks for the day ──
  const fixedBlocks: Array<{
    start: number;
    end: number;
    title: string;
    desc: string;
    type: string;
  }> = [];

  // Always add daily fixed blocks (static ones)
  const alwaysInclude = [
    FIXED_BLOCKS.morning,
    FIXED_BLOCKS.breakfast,
    FIXED_BLOCKS.lunch,
    FIXED_BLOCKS.powerNap,
    FIXED_BLOCKS.napBuffer,
    FIXED_BLOCKS.exercise,
    FIXED_BLOCKS.shower,
    FIXED_BLOCKS.dinner,
  ];

  alwaysInclude.forEach((b) => fixedBlocks.push({ ...b }));

  // Add dynamic blocks based on sleep cycles
  const dynamicBlocks = getDynamicFixedBlocks(sleepCycles);
  fixedBlocks.push({ ...dynamicBlocks.freeTime });
  fixedBlocks.push({ ...dynamicBlocks.digitalSunset });

  // Add school shifts
  if (
    schoolShift === "Chỉ buổi Sáng" ||
    schoolShift === "Sáng & Chiều" ||
    schoolShift === "Thứ 7 (Học cả ngày)"
  ) {
    fixedBlocks.push({ ...SCHOOL_SHIFTS.morning });
  }
  if (
    schoolShift === "Chỉ buổi Chiều" ||
    schoolShift === "Sáng & Chiều" ||
    schoolShift === "Thứ 7 (Học cả ngày)"
  ) {
    fixedBlocks.push({ ...SCHOOL_SHIFTS.afternoon });
  }

  // Sort by start time
  fixedBlocks.sort((a, b) => a.start - b.start);

  // ── Prepare study blocks ──
  let remainingBlocks = planningForTomorrow
    ? [...INITIAL_BLOCKS]
    : blocks.filter((b, i) => !b.completed && i >= activeBlockIndex);

  // Sort by cognitive peak for optimal scheduling
  const startHour = Math.floor(startMins / 60);
  remainingBlocks = sortBlocksByCognitivePeak(remainingBlocks, startHour);

  let remainingUrgentCycles =
    planningForTomorrow && urgentTask ? urgentTaskCycles : 0;
  let firstBlockTime =
    !planningForTomorrow && timeLeft > 0 ? Math.ceil(timeLeft / 60) : 0;

  const END_OF_DAY = calcBedtime(sleepCycles);

  // ── Fill schedule ──
  while (currentMins < END_OF_DAY) {
    // Check for fixed blocks at current time
    const activeFixed = fixedBlocks.find(
      (b) => b.start < b.end && b.end > currentMins && currentMins >= b.start
    );

    if (activeFixed) {
      schedule.push({
        time: `${formatMins(currentMins)} - ${formatMins(activeFixed.end)}`,
        title: activeFixed.title,
        desc: activeFixed.desc,
        type: activeFixed.type as ScheduleItem["type"],
      });
      currentMins = activeFixed.end;
      continue;
    }

    // Find next fixed block boundary
    const nextFixed = fixedBlocks.find((b) => b.start > currentMins);
    const boundary = nextFixed ? nextFixed.start : END_OF_DAY;
    const availableMins = boundary - currentMins;

    if (availableMins <= 0) break;

    // Enough for a full study block (52 + 17 = 69 min)
    const fullCycleTime = FOCUS_DURATION + BREAK_DURATION; // 69 min
    if (availableMins >= fullCycleTime) {
      let studyDuration = FOCUS_DURATION;
      let title = "Tự học / Ôn tập";
      let desc = "Làm bài tập hoặc nghiên cứu thêm";
      let type: ScheduleItem["type"] = "school";

      // Re-evaluate cognitive peak for current time slot
      const currentHour = Math.floor(currentMins / 60);
      const peak = getCurrentCognitivePeak(currentHour);
      const peakEmoji = peak?.emoji || "📚";

      if (remainingUrgentCycles > 0) {
        title = `⚡ [GẤP] ${urgentTask}`;
        desc = "Công việc khẩn — ưu tiên tối đa";
        type = "urgent";
        remainingUrgentCycles--;
      } else if (remainingBlocks.length > 0) {
        const b = remainingBlocks[0];
        title = `${peakEmoji} ${b.title}`;
        desc = `Deep Focus ${studyDuration}p • ${peak?.label || "Tập trung sâu"}`;
        type = "aptis";
        studyDuration =
          firstBlockTime > 0 ? firstBlockTime : FOCUS_DURATION;
        firstBlockTime = 0;
        remainingBlocks.shift();
      }

      // Study block
      schedule.push({
        time: `${formatMins(currentMins)} - ${formatMins(currentMins + studyDuration)}`,
        title,
        desc,
        type,
      });
      currentMins += studyDuration;

      // Ultradian rest (17 min)
      const breakDuration = Math.min(BREAK_DURATION, boundary - currentMins);
      if (breakDuration > 0) {
        const tips = getRecoveryTips(breakDuration);
        schedule.push({
          time: `${formatMins(currentMins)} - ${formatMins(currentMins + breakDuration)}`,
          title: `🌿 Nghỉ Ultradian (${breakDuration}p)`,
          desc: tips[Math.floor(Math.random() * tips.length)],
          type: "rest",
          recoveryTips: tips,
        });
        currentMins += breakDuration;
      }
    } else if (availableMins >= 30) {
      // Tight window: shorter study block with micro-break
      let studyMins = Math.min(availableMins - SHORT_BREAK, FOCUS_DURATION);
      let breakMins = availableMins - studyMins;
      if (breakMins < 5) {
        studyMins = availableMins;
        breakMins = 0;
      }

      let title = "Tự học linh hoạt";
      let type: ScheduleItem["type"] = "school";

      if (remainingUrgentCycles > 0) {
        title = `⚡ [GẤP] ${urgentTask} (Rút ngắn)`;
        type = "urgent";
        remainingUrgentCycles = 0;
      } else if (remainingBlocks.length > 0) {
        title = `${remainingBlocks[0].title} (Rút ngắn ${studyMins}p)`;
        type = "aptis";
        remainingBlocks.shift();
      }

      schedule.push({
        time: `${formatMins(currentMins)} - ${formatMins(currentMins + studyMins)}`,
        title,
        desc: `${studyMins}p • Khung thời gian hẹp — linh động`,
        type,
      });
      currentMins += studyMins;

      if (breakMins >= 5) {
        const tips = getRecoveryTips(breakMins);
        schedule.push({
          time: `${formatMins(currentMins)} - ${formatMins(currentMins + breakMins)}`,
          title: `☕ Nghỉ ngắn (${breakMins}p)`,
          desc: tips[0],
          type: "rest",
          recoveryTips: tips,
        });
        currentMins += breakMins;
      }
    } else {
      // Very short gap — just rest
      const tips = getRecoveryTips(availableMins);
      schedule.push({
        time: `${formatMins(currentMins)} - ${formatMins(boundary)}`,
        title: "Thời gian trống",
        desc: `${availableMins}p • ${tips[0]}`,
        type: "rest",
        recoveryTips: tips,
      });
      currentMins = boundary;
    }
  }

  // Add sleep block
  const bedtime = calcBedtime(sleepCycles);
  const sleepHours = (sleepCycles * SLEEP_CYCLE_MINS) / 60;
  if (!schedule.find((s) => s.title.includes("Ngủ sâu"))) {
    schedule.push({
      time: `${formatMins(bedtime)} - ${formatMins(WAKE_TIME_MINS)}`,
      title: `💤 Ngủ sâu (${sleepCycles} chu kỳ = ${sleepHours}h)`,
      desc: `Lên giường lúc ${formatMins(bedtime)} → Thức 06:45`,
      type: "sleep",
    });
  }

  return { schedule, unassignedBlocks: remainingBlocks };
};

// ── Fallback Timeline (when no night plan exists) ──
export const generateFallbackTimeline = (
  blocks: Block[],
  activeBlockIndex: number,
  timeLeft: number,
  isActive: boolean,
  currentDateTime: Date,
  sleepCycles: number = DEFAULT_SLEEP_CYCLES
): ScheduleItem[] => {
  const schedule: ScheduleItem[] = [];
  let currH = currentDateTime.getHours();
  let currM = currentDateTime.getMinutes();
  const bedtime = calcBedtime(sleepCycles);
  const bedH = Math.floor(bedtime / 60);
  const bedM = bedtime % 60;
  const sleepHours = (sleepCycles * SLEEP_CYCLE_MINS) / 60;

  let bedTotal = bedtime;
  let startTotal = currH * 60 + currM;
  if (bedTotal < startTotal && bedTotal < 12 * 60) bedTotal += 24 * 60;
  let remainingMins = bedTotal - startTotal;

  blocks.forEach((block, i) => {
    if (block.completed) {
      schedule.push({
        time: "✅ Hoàn thành",
        title: block.title,
        desc: `${block.durationMins}p • Đã xong`,
        type: "completed",
        completed: true,
      });
    } else {
      const bDuration =
        i === activeBlockIndex && timeLeft > 0
          ? Math.ceil(timeLeft / 60)
          : block.durationMins;
      const breakMins =
        i > activeBlockIndex &&
        schedule.length > 0 &&
        !schedule[schedule.length - 1]?.completed
          ? BREAK_DURATION
          : 0;

      if (i === activeBlockIndex) {
        const tStart = formatMins(currH * 60 + currM);
        [currH, currM] = addMins(currH, currM, bDuration);
        const tEnd = formatMins(currH * 60 + currM);
        remainingMins -= bDuration;
        schedule.push({
          time: `${tStart} - ${tEnd}`,
          title: block.title,
          desc: isActive ? "⏳ Đang chạy..." : "Sắp tới lượt",
          type: "aptis",
          isActive: true,
        });
      } else if (remainingMins >= bDuration + breakMins) {
        if (breakMins > 0) {
          const tips = getRecoveryTips(breakMins);
          schedule.push({
            time: `${formatMins(currH * 60 + currM)} - ${formatMins(currH * 60 + currM + breakMins)}`,
            title: `🌿 Nghỉ Ultradian (${breakMins}p)`,
            desc: tips[Math.floor(Math.random() * tips.length)],
            type: "rest",
            recoveryTips: tips,
          });
          [currH, currM] = addMins(currH, currM, breakMins);
          remainingMins -= breakMins;
        }
        const tStart = formatMins(currH * 60 + currM);
        [currH, currM] = addMins(currH, currM, bDuration);
        const tEnd = formatMins(currH * 60 + currM);
        remainingMins -= bDuration;
        schedule.push({
          time: `${tStart} - ${tEnd}`,
          title: block.title,
          desc: `Ước tính ${bDuration}p`,
          type: "aptis",
        });
      } else {
        schedule.push({
          time: "⏭️ Bỏ qua",
          title: block.title,
          desc: `Không đủ thời gian trước giờ ngủ (${formatMins(bedtime)})`,
          type: "completed",
          completed: true,
        });
      }
    }
  });

  if (remainingMins > 0) {
    schedule.push({
      time: `${formatMins(currH * 60 + currM)} - ${formatMins(bedH * 60 + bedM)}`,
      title:
        remainingMins > 30
          ? "🌙 Thư giãn & Digital Sunset"
          : "🪥 Vệ sinh & Lên giường",
      desc: `${remainingMins}p còn lại`,
      type: "rest",
    });
  }

  schedule.push({
    time: `${formatMins(bedH * 60 + bedM)} - 06:45`,
    title: `💤 Ngủ sâu (${sleepCycles} chu kỳ)`,
    desc: `${sleepHours}h ngủ → Thức 06:45`,
    type: "sleep",
  });

  return schedule;
};
