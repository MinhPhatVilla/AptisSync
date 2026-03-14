"use client";

import { motion } from "framer-motion";
import { Play, Pause, CheckCircle, PlusCircle, RefreshCw } from "lucide-react";
import type { Block } from "@/lib/types";
import { TARGET_MINUTES } from "@/lib/constants";

type TimerCircleProps = {
  blocks: Block[];
  activeBlockIndex: number;
  timeLeft: number;
  isActive: boolean;
  isPausedDay: boolean;
  onToggle: () => void;
  onBusy: () => void;
  onResume: () => void;
  onAddBlock: () => void;
  onReset: () => void;
};

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export default function TimerCircle({
  blocks,
  activeBlockIndex,
  timeLeft,
  isActive,
  isPausedDay,
  onToggle,
  onBusy,
  onResume,
  onAddBlock,
  onReset,
}: TimerCircleProps) {
  const completedMinutes = blocks
    .filter((b) => b.completed)
    .reduce((acc, curr) => acc + curr.durationMins, 0);

  const progressPercentage = (completedMinutes / TARGET_MINUTES) * 100;
  const currentBlock = blocks[activeBlockIndex];
  const allCompleted = activeBlockIndex >= blocks.length;

  return (
    <>
      {/* Circular Progress */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 flex flex-col items-center justify-center shrink-0 drop-shadow-[0_0_30px_rgba(59,130,246,0.15)] mt-4">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="46%"
            className="fill-none stroke-blue-950/40"
            strokeWidth="4"
          />
          <motion.circle
            cx="50%"
            cy="50%"
            r="46%"
            className="fill-none stroke-blue-500"
            strokeWidth="6"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progressPercentage / 100 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            style={{ filter: "drop-shadow(0 0 8px rgba(59,130,246,0.5))" }}
          />
        </svg>

        <div className="flex flex-col items-center text-center z-10">
          {isActive ? (
            <div className="animate-in fade-in zoom-in duration-300">
              <p className="text-blue-300/80 text-xs md:text-sm uppercase tracking-widest mb-3 font-mono">
                {currentBlock?.title}
              </p>
              <div className="text-6xl md:text-7xl font-light tracking-tighter font-mono text-white mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                {formatTime(timeLeft)}
              </div>
              <p className="text-blue-500/40 text-[10px] font-mono mt-1">
                Deep Focus • 52 phút
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in duration-300">
              <p className="text-gray-500 text-xs md:text-sm uppercase tracking-widest mb-1 font-mono">
                Aptis Target
              </p>
              <div className="text-5xl md:text-6xl font-bold tracking-tighter text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                {completedMinutes}{" "}
                <span className="text-2xl md:text-3xl text-gray-500 font-normal">
                  / {TARGET_MINUTES}
                </span>
              </div>
              <p className="text-blue-500/70 text-sm mt-1 font-mono">mins</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-14 w-full flex flex-col items-center">
        {!allCompleted ? (
          <button
            onClick={onToggle}
            disabled={isPausedDay}
            className={`w-full max-w-[320px] px-8 py-5 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              isPausedDay ? "opacity-30 cursor-not-allowed grayscale" : ""
            } ${
              isActive
                ? "bg-transparent border border-blue-500/40 text-blue-300 hover:bg-blue-950/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                : "bg-blue-600 border border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:bg-blue-500 hover:scale-105 active:scale-95"
            }`}
          >
            <span className="font-bold tracking-wider text-base md:text-lg mr-3">
              {isActive
                ? "TẠM DỪNG"
                : `BẮT ĐẦU BLOCK ${currentBlock?.id}`}
            </span>
            {isActive ? (
              <Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" />
            ) : (
              <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
            )}
          </button>
        ) : (
          <div className="flex flex-col items-center w-full">
            <div className="flex items-center text-blue-400 border border-blue-500/30 bg-blue-500/10 px-8 py-5 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.2)] mb-4">
              <CheckCircle className="w-6 h-6 mr-3" />
              <span className="font-bold tracking-wider text-base md:text-lg">
                Đã hoàn thành xuất sắc! 🎉
              </span>
            </div>

            <div className="flex w-full max-w-[320px] gap-3">
              <button
                onClick={onAddBlock}
                className="flex-1 px-4 py-4 rounded-xl flex items-center justify-center transition-all duration-300 bg-blue-600 border border-blue-500 text-white hover:bg-blue-500 hover:scale-105"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                <span className="font-bold tracking-wider text-sm">
                  HỌC TIẾP
                </span>
              </button>
              <button
                onClick={onReset}
                className="flex-1 px-4 py-4 rounded-xl flex items-center justify-center transition-all duration-300 bg-red-900/60 border border-red-700 text-red-300 hover:bg-red-800 hover:text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                <span className="font-bold tracking-wider text-sm">
                  LÀM LẠI
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Busy / Resume */}
        <div className="w-full max-w-[320px] flex gap-3 mt-4">
          {!isPausedDay ? (
            <button
              onClick={onBusy}
              className="flex-1 bg-gray-900/80 border border-gray-800 py-3 rounded-xl flex justify-center items-center text-gray-400 font-mono text-xs hover:bg-gray-800 transition-colors"
            >
              <Pause className="w-3.5 h-3.5 mr-2" /> BẬN ĐỘT XUẤT
            </button>
          ) : (
            <button
              onClick={onResume}
              className="flex-1 bg-blue-900/40 border border-blue-500/50 py-3 rounded-xl flex justify-center items-center text-blue-300 font-mono text-xs hover:bg-blue-800 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.2)]"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> ĐÃ VỀ, LÀM LẠI
            </button>
          )}
        </div>
      </div>
    </>
  );
}
