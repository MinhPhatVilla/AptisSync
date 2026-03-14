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

  // Timer percentage for the inner ring
  const totalBlockSec = currentBlock ? currentBlock.durationMins * 60 : 1;
  const timerProgress = isActive ? (1 - timeLeft / totalBlockSec) : 0;

  return (
    <>
      {/* Circular Progress */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 flex flex-col items-center justify-center shrink-0 mt-4">
        {/* Ambient glow */}
        {isActive && (
          <div className="absolute inset-0 rounded-full bg-blue-500/5 blur-3xl animate-pulse" />
        )}

        <svg className="absolute inset-0 w-full h-full -rotate-90">
          {/* Track */}
          <circle
            cx="50%"
            cy="50%"
            r="46%"
            className="fill-none stroke-gray-800/30"
            strokeWidth="2"
          />
          {/* Daily progress */}
          <motion.circle
            cx="50%"
            cy="50%"
            r="46%"
            className="fill-none"
            stroke="url(#progressGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progressPercentage / 100 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ filter: "drop-shadow(0 0 6px rgba(59,130,246,0.4))" }}
          />
          {/* Inner timer ring (active only) */}
          {isActive && (
            <>
              <circle
                cx="50%"
                cy="50%"
                r="41%"
                className="fill-none stroke-blue-900/15"
                strokeWidth="1.5"
              />
              <motion.circle
                cx="50%"
                cy="50%"
                r="41%"
                className="fill-none stroke-blue-400/40"
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: timerProgress }}
                transition={{ duration: 0.5, ease: "linear" }}
              />
            </>
          )}
          {/* Gradient defs */}
          <defs>
            <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>

        <div className="flex flex-col items-center text-center z-10">
          {isActive ? (
            <div className="animate-in fade-in zoom-in duration-300">
              <p className="text-blue-400/60 text-[10px] md:text-xs uppercase tracking-[0.2em] mb-3 font-mono">
                {currentBlock?.title}
              </p>
              <div className="text-5xl md:text-6xl font-extralight tracking-tighter font-mono text-white tabular-nums">
                {formatTime(timeLeft)}
              </div>
              <p className="text-gray-600 text-[9px] font-mono mt-2 tracking-wider">
                DEEP FOCUS • 52p
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in duration-300">
              <p className="text-gray-600 text-[10px] md:text-xs uppercase tracking-[0.2em] mb-2 font-mono">
                Tiến độ
              </p>
              <div className="text-4xl md:text-5xl font-bold tracking-tighter text-white tabular-nums">
                {completedMinutes}
                <span className="text-xl md:text-2xl text-gray-600 font-light ml-0.5">
                  /{TARGET_MINUTES}
                </span>
              </div>
              <p className="text-gray-600 text-[10px] font-mono mt-1 tracking-widest uppercase">phút</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-10 w-full flex flex-col items-center gap-3">
        {!allCompleted ? (
          <button
            onClick={onToggle}
            disabled={isPausedDay}
            className={`w-full max-w-[300px] px-6 py-4 rounded-xl flex items-center justify-center transition-all duration-200 ${
              isPausedDay ? "opacity-25 cursor-not-allowed grayscale" : ""
            } ${
              isActive
                ? "bg-transparent border border-gray-700 text-gray-300 hover:bg-gray-900/50 hover:border-gray-600"
                : "bg-blue-600 border border-blue-500/80 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:bg-blue-500 active:scale-[0.98]"
            }`}
          >
            {isActive ? (
              <Pause className="w-4 h-4 mr-2.5 fill-current" />
            ) : (
              <Play className="w-4 h-4 mr-2.5 fill-current" />
            )}
            <span className="font-semibold tracking-wider text-sm">
              {isActive
                ? "TẠM DỪNG"
                : `BẮT ĐẦU BLOCK ${currentBlock?.id}`}
            </span>
          </button>
        ) : (
          <div className="flex flex-col items-center w-full gap-3">
            <div className="flex items-center text-blue-400 border border-blue-500/20 bg-blue-500/5 px-6 py-4 rounded-xl">
              <CheckCircle className="w-5 h-5 mr-2.5" />
              <span className="font-semibold tracking-wider text-sm">
                Hoàn thành xuất sắc! 🎉
              </span>
            </div>

            <div className="flex w-full max-w-[300px] gap-2">
              <button
                onClick={onAddBlock}
                className="flex-1 px-3 py-3.5 rounded-lg flex items-center justify-center transition-all bg-blue-600 border border-blue-500/60 text-white hover:bg-blue-500 active:scale-[0.98] text-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                <span className="font-semibold tracking-wider">HỌC TIẾP</span>
              </button>
              <button
                onClick={onReset}
                className="flex-1 px-3 py-3.5 rounded-lg flex items-center justify-center transition-all bg-transparent border border-red-800/40 text-red-400/70 hover:bg-red-950/20 hover:text-red-300 text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                <span className="font-semibold tracking-wider">LÀM LẠI</span>
              </button>
            </div>
          </div>
        )}

        {/* Busy / Resume */}
        <div className="w-full max-w-[300px]">
          {!isPausedDay ? (
            <button
              onClick={onBusy}
              className="w-full bg-transparent border border-gray-800/50 py-2.5 rounded-lg flex justify-center items-center text-gray-600 font-mono text-[10px] tracking-wider hover:bg-gray-900/40 hover:text-gray-400 hover:border-gray-700 transition-all"
            >
              <Pause className="w-3 h-3 mr-2" /> BẬN ĐỘT XUẤT
            </button>
          ) : (
            <button
              onClick={onResume}
              className="w-full bg-blue-950/20 border border-blue-800/40 py-3 rounded-lg flex justify-center items-center text-blue-400 font-mono text-xs tracking-wider hover:bg-blue-900/30 transition-all shadow-[0_0_10px_rgba(59,130,246,0.1)]"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> ĐÃ VỀ, LÀM LẠI
            </button>
          )}
        </div>
      </div>
    </>
  );
}
