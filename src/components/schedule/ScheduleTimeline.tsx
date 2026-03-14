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
    border: "border-gray-800/60",
    bg: "bg-gray-900/30 border-gray-800/40 text-gray-400",
    dot: "bg-gray-500",
    line: "border-gray-800/40",
    glow: "",
  };

  if (item.completed) {
    return {
      border: "border-gray-700/30",
      bg: "bg-gray-900/20 border-gray-800/30 text-gray-500 line-through",
      dot: "bg-gray-600 shadow-none",
      line: "border-gray-800/20",
      glow: "",
    };
  }

  switch (item.type) {
    case "aptis":
      return {
        border: "border-blue-500/40",
        bg: item.isActive
          ? "bg-blue-900/30 border-blue-400/50 text-blue-50 shadow-[0_0_25px_rgba(59,130,246,0.25)]"
          : "bg-blue-950/20 border-blue-500/25 text-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.08)]",
        dot: item.isActive ? "bg-blue-400 animate-pulse shadow-[0_0_12px_rgba(96,165,250,0.8)]" : "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]",
        line: "border-blue-500/30",
        glow: item.isActive ? "ring-1 ring-blue-500/20" : "",
      };
    case "school":
      return {
        border: "border-violet-500/40",
        bg: "bg-violet-950/15 border-violet-500/20 text-violet-200",
        dot: "bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.5)]",
        line: "border-violet-500/30",
        glow: "",
      };
    case "urgent":
      return {
        border: "border-red-500/40",
        bg: "bg-red-950/15 border-red-500/25 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
        dot: "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]",
        line: "border-red-500/30",
        glow: "ring-1 ring-red-500/15",
      };
    case "sleep":
      return {
        border: "border-indigo-500/40",
        bg: "bg-indigo-950/20 border-indigo-500/25 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.12)]",
        dot: "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]",
        line: "border-indigo-500/30",
        glow: "",
      };
    case "rest":
      return {
        border: "border-emerald-700/30",
        bg: "bg-emerald-950/10 border-emerald-800/20 text-emerald-300/70",
        dot: "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.4)]",
        line: "border-emerald-800/25",
        glow: "",
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
    <div className="mt-10 w-full max-w-[380px] space-y-2 px-4 pb-16">
      {/* Schedule header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-800/40 to-transparent" />
        <span className="text-[10px] font-mono text-blue-500/50 uppercase tracking-[0.25em]">Timeline</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-800/40 to-transparent" />
      </div>

      {listToRender.map((item, i) => {
        const styles = getTypeStyles(item);

        return (
          <div
            key={i}
            className={`flex flex-col group transition-all duration-200 ${
              item.completed ? "opacity-40" : "hover:-translate-y-0.5"
            }`}
          >
            {/* Time + dot */}
            <div className="flex items-center mb-0.5">
              <span
                className={`w-2 h-2 rounded-full mr-2.5 transition-all ${styles.dot}`}
              />
              <span
                className={`font-mono text-[11px] font-semibold tracking-wider ${
                  item.completed
                    ? "text-gray-600"
                    : item.isActive
                    ? "text-blue-300"
                    : "text-gray-400"
                }`}
              >
                {item.time}
              </span>
            </div>

            {/* Content card */}
            <div className={`ml-[3.5px] pl-4 border-l py-1 ${styles.line}`}>
              <div className={`px-3.5 py-3 rounded-lg border backdrop-blur-sm ${styles.bg} ${styles.glow}`}>
                <h4 className={`font-semibold text-[13px] md:text-sm tracking-wide leading-tight ${
                  item.completed ? "text-gray-500" : ""
                }`}>
                  {item.title}
                </h4>
                {item.desc && (
                  <p className="text-[11px] mt-1 opacity-60 leading-relaxed">{item.desc}</p>
                )}
                {/* Recovery tips */}
                {item.recoveryTips && item.recoveryTips.length > 0 && !item.completed && (
                  <div className="mt-2 pt-1.5 border-t border-white/5">
                    <p className="text-[9px] text-emerald-400/40 font-mono uppercase tracking-wider">
                      Gợi ý:
                    </p>
                    <p className="text-[10px] text-emerald-300/40 mt-0.5">
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
