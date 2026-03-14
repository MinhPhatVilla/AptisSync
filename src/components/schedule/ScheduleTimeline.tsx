"use client";

import type { ScheduleItem, Block } from "@/lib/types";
import { generateFallbackTimeline } from "@/lib/schedule";

type ScheduleTimelineProps = {
  generatedSchedule: ScheduleItem[];
  blocks: Block[];
  activeBlockIndex: number;
  timeLeft: number;
  isActive: boolean;
  currentDateTime: Date;
};

const getTypeStyles = (item: ScheduleItem) => {
  const base = {
    border: "border-gray-800",
    bg: "bg-transparent border-gray-800 text-gray-400",
    dot: "bg-blue-600",
    line: "border-gray-800",
  };

  if (item.completed) {
    return {
      border: "border-gray-700/50",
      bg: "bg-gray-900/30 border-gray-800/50 text-gray-400 line-through",
      dot: "bg-gray-500 shadow-none",
      line: "border-gray-700/50",
    };
  }

  switch (item.type) {
    case "aptis":
      return {
        border: "border-blue-500/50",
        bg: item.isActive
          ? "bg-blue-800/30 border-blue-400/50 text-blue-50 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          : "bg-blue-900/20 border-blue-500/30 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.1)]",
        dot: item.isActive ? "bg-blue-400 animate-pulse" : "bg-blue-600",
        line: "border-blue-500/50",
      };
    case "school":
      return {
        border: "border-purple-500/50",
        bg: "bg-purple-900/10 border-purple-500/20 text-purple-200",
        dot: "bg-purple-500",
        line: "border-purple-500/50",
      };
    case "urgent":
      return {
        border: "border-red-500/50",
        bg: "bg-red-900/10 border-red-500/20 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
        dot: "bg-red-500",
        line: "border-red-500/50",
      };
    case "sleep":
      return {
        border: "border-indigo-500/50",
        bg: "bg-indigo-900/20 border-indigo-500/30 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.15)]",
        dot: "bg-indigo-400",
        line: "border-indigo-500/50",
      };
    case "rest":
      return {
        border: "border-emerald-800/40",
        bg: "bg-emerald-950/10 border-emerald-800/30 text-emerald-300/80",
        dot: "bg-emerald-600",
        line: "border-emerald-800/40",
      };
    default:
      return base;
  }
};

export default function ScheduleTimeline({
  generatedSchedule,
  blocks,
  activeBlockIndex,
  timeLeft,
  isActive,
  currentDateTime,
}: ScheduleTimelineProps) {
  const now = currentDateTime;
  const currH = now.getHours();
  const currM = now.getMinutes();
  const currentTotal = currH * 60 + currM;

  let listToRender: ScheduleItem[];

  if (generatedSchedule.length > 0) {
    // Detect next-day schedule (Night Plan created at night)
    const firstTime = generatedSchedule[0]?.time?.split(" - ")[0];
    let isNextDaySchedule = false;
    if (firstTime) {
      const [fH] = firstTime.split(":").map(Number);
      if (!isNaN(fH) && fH < 12 && currentTotal >= 20 * 60) {
        isNextDaySchedule = true;
      }
    }

    if (isNextDaySchedule) {
      listToRender = generatedSchedule.filter((item) => {
        const matchAptis = blocks.find((b) => item.title.includes(b.title));
        if (matchAptis) return !matchAptis.completed;
        return true;
      });
    } else {
      listToRender = generatedSchedule.filter((item) => {
        const matchAptis = blocks.find((b) => item.title.includes(b.title));
        if (matchAptis) return !matchAptis.completed;

        const parts = item.time.split(" - ");
        if (parts.length < 2) return true;
        if (parts[1].includes("Sáng mai") || parts[1].toLowerCase().includes("hoàn thành")) return true;

        const endStr = parts[1].trim();
        const [endH, endM] = endStr.split(":").map(Number);
        if (isNaN(endH) || isNaN(endM)) return true;

        let endTotal = endH * 60 + endM;
        if (endTotal < 12 * 60 && currentTotal >= 12 * 60) endTotal += 24 * 60;

        return currentTotal <= endTotal;
      });
    }
  } else {
    // Fallback timeline
    listToRender = generateFallbackTimeline(
      blocks,
      activeBlockIndex,
      timeLeft,
      isActive,
      currentDateTime
    );
  }

  return (
    <div className="mt-12 w-full max-w-[360px] space-y-4 px-4 pb-12">
      {listToRender.map((item, i) => {
        const styles = getTypeStyles(item);

        return (
          <div
            key={i}
            className={`flex flex-col mb-1 group hover:-translate-y-1 transition-transform ${
              item.completed ? "opacity-60 saturate-50" : ""
            }`}
          >
            {/* Time dot */}
            <div className="flex items-center mb-1">
              <span
                className={`w-2.5 h-2.5 rounded-full mr-2 shadow-[0_0_8px_rgba(37,99,235,0.8)] ${styles.dot}`}
              />
              <span
                className={`font-mono text-sm font-bold tracking-wider opacity-90 ${
                  item.completed ? "text-gray-400" : "text-blue-300"
                }`}
              >
                {item.time}
              </span>
            </div>

            {/* Content card */}
            <div className={`ml-3.5 pl-4 border-l-2 py-2 ${styles.line}`}>
              <div className={`p-3.5 rounded-xl border backdrop-blur-sm ${styles.bg}`}>
                <h4 className="font-bold text-sm md:text-base tracking-wide">
                  {item.title}
                </h4>
                {item.desc && (
                  <p className="text-xs mt-1.5 opacity-80 font-mono">{item.desc}</p>
                )}
                {/* Recovery tips for rest blocks */}
                {item.recoveryTips && item.recoveryTips.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <p className="text-[10px] text-emerald-400/60 font-mono uppercase tracking-wider mb-1">
                      Gợi ý nghỉ ngơi:
                    </p>
                    <p className="text-[10px] text-emerald-300/50 font-mono">
                      {item.recoveryTips[0]}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
