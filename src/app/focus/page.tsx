"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Brain, BookOpen, Coffee, MessageSquare, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_DURATION, BREAK_DURATION, SHORT_BREAK, RECOVERY_ACTIVITIES } from "@/lib/constants";

type TimerMode = "deep" | "school" | "break" | "ultradian";

const MODE_SETTINGS = {
  deep: {
    time: FOCUS_DURATION * 60, // 52 minutes
    label: "Deep Focus 52'",
    color: "text-blue-500",
    bg: "bg-blue-500",
    icon: BookOpen,
    desc: "Ultradian rhythm — ngưỡng tập trung tối ưu",
  },
  school: {
    time: 25 * 60,
    label: "School 25'",
    color: "text-purple-500",
    bg: "bg-purple-500",
    icon: Brain,
    desc: "Pomodoro cổ điển cho bài tập trên trường",
  },
  break: {
    time: SHORT_BREAK * 60, // 10 min micro-break
    label: "Micro Break",
    color: "text-green-500",
    bg: "bg-green-500",
    icon: Coffee,
    desc: "Nghỉ nhanh — đi bộ, uống nước",
  },
  ultradian: {
    time: BREAK_DURATION * 60, // 17 min ultradian rest
    label: "Ultradian Rest",
    color: "text-emerald-500",
    bg: "bg-emerald-500",
    icon: Zap,
    desc: "17p nghỉ não sâu — KHÔNG lướt điện thoại!",
  },
};

export default function FocusPage() {
  const [mode, setMode] = useState<TimerMode>("deep");
  const [timeLeft, setTimeLeft] = useState(MODE_SETTINGS["deep"].time);
  const [isActive, setIsActive] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showTip, setShowTip] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Wake lock
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch (err) {
        console.error(`${err}`);
      }
    };

    if (isActive) {
      requestWakeLock();
    } else if (wakeLock) {
      wakeLock.release().then(() => {
        wakeLock = null;
      });
    }

    return () => {
      if (wakeLock) {
        wakeLock.release().then(() => {
          wakeLock = null;
        });
      }
    };
  }, [isActive]);

  // Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setCompletedSessions((c) => c + 1);
      setShowTip(true);

      if (audioRef.current) {
        audioRef.current.play().catch((e) => console.log("Audio:", e));
      }
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Hết giờ! 🧠", {
          body: `Phiên ${MODE_SETTINGS[mode].label} kết thúc. ${mode === "deep" ? "Nghỉ Ultradian 17p!" : ""}`,
        });
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, mode]);

  const handleStart = () => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
    setShowTip(false);
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(MODE_SETTINGS[mode].time);
    setShowTip(false);
  };

  const changeMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(MODE_SETTINGS[newMode].time);
    setShowTip(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progress = ((MODE_SETTINGS[mode].time - timeLeft) / MODE_SETTINGS[mode].time) * 100;
  const CurrentIcon = MODE_SETTINGS[mode].icon;

  // Get recovery tip
  const getRandomTip = () => {
    const tips = mode === "ultradian" || mode === "break"
      ? RECOVERY_ACTIVITIES.standard
      : RECOVERY_ACTIVITIES.short;
    return tips[Math.floor(Math.random() * tips.length)];
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] px-4 md:px-0">
      <header className="mb-8 hidden sm:block">
        <h1 className="text-3xl font-bold tracking-tight">Focus</h1>
        <p className="text-muted-foreground mt-1">
          52:17 Ultradian Rhythm — khoa học tập trung não bộ
        </p>
      </header>

      {/* Mode Selector */}
      <div className="flex justify-center mb-8 w-full max-w-md mx-auto">
        <div className="glass flex p-1 rounded-full w-full">
          {(Object.keys(MODE_SETTINGS) as TimerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => changeMode(m)}
              className={cn(
                "relative flex-1 py-2 text-[11px] md:text-sm font-medium rounded-full transition-colors z-10 block whitespace-nowrap overflow-hidden text-ellipsis px-1",
                mode === m ? "text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === m && (
                <motion.div
                  layoutId="mode-indicator"
                  className={cn("absolute inset-0 rounded-full -z-10", MODE_SETTINGS[m].bg)}
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {MODE_SETTINGS[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode description */}
      <p className="text-center text-gray-500 text-xs font-mono mb-6">
        {MODE_SETTINGS[mode].desc}
      </p>

      {/* Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-10">
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="50%" cy="50%" r="48%" className="fill-none stroke-secondary" strokeWidth="4" />
            <motion.circle
              cx="50%"
              cy="50%"
              r="48%"
              className={cn("fill-none", MODE_SETTINGS[mode].color)}
              strokeWidth="6"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress / 100 }}
              transition={{ duration: 1, ease: "linear" }}
              style={{ strokeDasharray: "1", strokeDashoffset: "0" }}
            />
          </svg>

          <div className="flex flex-col items-center">
            <CurrentIcon className={cn("w-8 h-8 mb-4", MODE_SETTINGS[mode].color)} />
            <span className="text-6xl sm:text-7xl font-light tracking-tighter font-mono filter drop-shadow-lg">
              {formatTime(timeLeft)}
            </span>
            {completedSessions > 0 && (
              <p className="text-gray-500 text-xs font-mono mt-3">
                ✅ {completedSessions} phiên hoàn thành
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-6 mt-12">
          <button
            onClick={handleReset}
            className="p-4 rounded-full glass text-muted-foreground hover:text-white transition-colors"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
          <button
            onClick={handleStart}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95",
              MODE_SETTINGS[mode].bg
            )}
          >
            {isActive ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>
        </div>

        {/* Recovery tip after completion */}
        <AnimatePresence>
          {showTip && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-8 max-w-sm mx-auto p-4 rounded-xl border border-emerald-800/30 bg-emerald-950/10"
            >
              <div className="flex items-start gap-3">
                <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-emerald-300 text-sm font-medium mb-1">
                    Gợi ý nghỉ ngơi cho não:
                  </p>
                  <p className="text-gray-400 text-xs">{getRandomTip()}</p>
                  <p className="text-emerald-500/40 text-[10px] font-mono mt-2">
                    📵 KHÔNG lướt điện thoại — não vẫn tiêu thụ dopamine!
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <audio
        ref={audioRef}
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
        preload="auto"
      />
    </div>
  );
}
