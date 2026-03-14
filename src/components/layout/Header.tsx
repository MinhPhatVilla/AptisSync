"use client";

import { Clock, BellRing, MoonStar, LogOut, Flame, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";

type HeaderProps = {
  currentDateTime: Date | null;
  stars: number;
  silverStars: number;
  failedDays: number;
  streak: number;
  bestStreak: number;
  viVoices: SpeechSynthesisVoice[];
  selectedVoiceIndex: number;
  onVoiceChange: (newIndex: number) => void;
  onNightPlan: () => void;
  speakAnnounce: (msg: string) => void;
};

const formatRealTime = (d: Date | null): string => {
  if (!d) return "";
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} • ${days[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

export default function Header({
  currentDateTime,
  stars,
  silverStars,
  failedDays,
  streak,
  bestStreak,
  viVoices,
  selectedVoiceIndex,
  onVoiceChange,
  onNightPlan,
  speakAnnounce,
}: HeaderProps) {
  return (
    <>
      {/* Realtime Clock — floating pill */}
      {currentDateTime && (
        <div className="absolute top-0 w-full left-0 right-0 flex justify-center py-2.5 z-10 pointer-events-none">
          <div className="flex items-center text-gray-300 bg-gray-900/70 px-4 py-1.5 rounded-full border border-gray-800/60 backdrop-blur-md">
            <Clock className="w-3 h-3 mr-2 text-blue-400/60" />
            <span className="font-mono text-[10px] md:text-[11px] font-medium tracking-widest">
              {formatRealTime(currentDateTime)}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-5 pt-9">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <p className="text-[8px] md:text-[9px] uppercase font-mono tracking-[0.4em] text-gray-600 mb-1.5">
              Minh Phát Villa
            </p>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center">
              <span className="bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
                APTIS INTENSIVE
              </span>
              <span className="ml-2 relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-40" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
            </h1>
            <p className="text-[9px] font-mono text-gray-600 mt-1 tracking-wider flex items-center gap-1.5">
              <Zap className="w-2.5 h-2.5 text-blue-500/50" />
              52:17 Ultradian • Ngủ 23:45
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0 ml-2">
            <button
              onClick={() => {
                if (viVoices.length > 0) {
                  const nextIdx = (selectedVoiceIndex + 1) % viVoices.length;
                  onVoiceChange(nextIdx);
                  const tester = new SpeechSynthesisUtterance();
                  tester.text = `Đã đổi sang giọng ${viVoices[nextIdx].name}`;
                  tester.lang = "vi-VN";
                  tester.rate = 1.0;
                  tester.pitch = 1.25;
                  tester.voice = viVoices[nextIdx];
                  window.speechSynthesis.cancel();
                  window.speechSynthesis.speak(tester);
                } else {
                  speakAnnounce("Chưa nạp thành công giọng nói.");
                }
              }}
              className="text-gray-400 p-2 md:p-2.5 rounded-lg hover:bg-gray-800/60 border border-transparent hover:border-gray-700 hover:text-blue-400 transition-all"
              title="Đổi giọng nói"
            >
              <BellRing className="w-4 h-4" />
            </button>

            <button
              onClick={onNightPlan}
              className={`p-2 md:p-2.5 rounded-lg border transition-all ${
                currentDateTime &&
                (currentDateTime.getHours() >= 22 || currentDateTime.getHours() < 4)
                  ? "text-blue-400 border-blue-800/50 bg-blue-950/30 hover:bg-blue-900/40 shadow-[0_0_10px_rgba(59,130,246,0.15)]"
                  : "text-gray-500 border-transparent hover:border-gray-700 hover:bg-gray-800/40"
              }`}
              title="Night Plan"
            >
              <MoonStar className="w-4 h-4" />
            </button>

            <button
              onClick={() => supabase.auth.signOut()}
              className="text-gray-600 p-2 md:p-2.5 rounded-lg hover:bg-red-950/30 border border-transparent hover:border-red-900/40 hover:text-red-400 transition-all"
              title="Đăng Xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {/* Streak */}
          {streak > 0 && (
            <span className="text-orange-400/90 text-[10px] tracking-widest uppercase font-mono bg-orange-950/20 px-2 py-1 rounded-md border border-orange-900/30 flex items-center gap-1">
              <Flame className="w-3 h-3" />
              {streak}d
              {bestStreak > streak && (
                <span className="text-orange-600/60 text-[8px]">/{bestStreak}</span>
              )}
            </span>
          )}
          <span className="text-yellow-400/80 text-[10px] tracking-widest uppercase font-mono bg-yellow-950/15 px-2 py-1 rounded-md border border-yellow-900/25 flex items-center gap-1">
            <span className="text-[8px]">★</span> {stars}
          </span>
          <span className="text-gray-400/60 text-[10px] tracking-widest uppercase font-mono bg-gray-900/30 px-2 py-1 rounded-md border border-gray-800/30 flex items-center gap-1">
            <span className="text-[8px]">☆</span> {silverStars}
          </span>
          {failedDays > 0 && (
            <span className="text-red-400/50 text-[10px] tracking-widest uppercase font-mono bg-red-950/10 px-2 py-1 rounded-md border border-red-900/20 flex items-center gap-1">
              ✕ {failedDays}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
