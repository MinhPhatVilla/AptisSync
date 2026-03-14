"use client";

import { Clock, BellRing, MoonStar, LogOut, Flame } from "lucide-react";
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
  const days = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
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
      {/* Realtime Clock */}
      {currentDateTime && (
        <div className="absolute top-0 w-full left-0 right-0 flex justify-center py-2 z-10 pointer-events-none">
          <div className="flex items-center text-blue-300/80 bg-blue-950/20 px-4 py-1.5 rounded-full border border-blue-900/30 backdrop-blur-sm drop-shadow-[0_0_10px_rgba(59,130,246,0.1)]">
            <Clock className="w-3.5 h-3.5 mr-2 opacity-80" />
            <span className="font-mono text-[11px] md:text-xs font-bold tracking-widest">
              {formatRealTime(currentDateTime)}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 pt-8">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] md:text-[10px] uppercase font-mono tracking-[0.3em] text-blue-500/80 mb-1 hidden md:block">
              Powered by MINH PHÁT VILLA
            </p>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight text-white uppercase flex items-center">
              Aptis Intensive{" "}
              <span className="ml-2 w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
            </h1>
            <p className="text-[9px] md:text-[10px] font-mono text-blue-400/40 mt-0.5 tracking-wider">
              🧠 Brain-Optimized • 52:17 Ultradian
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-2">
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
              className="bg-blue-950/40 text-blue-400 p-2.5 md:p-3.5 rounded-xl hover:bg-blue-900/60 border border-blue-900/50 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all"
              title="Đổi giọng nói"
            >
              <BellRing className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <button
              onClick={onNightPlan}
              className={`p-2.5 md:p-3.5 rounded-xl border transition-all ${
                currentDateTime &&
                (currentDateTime.getHours() >= 21 || currentDateTime.getHours() < 4)
                  ? "bg-blue-950/40 text-blue-400 border-blue-900/50 hover:bg-blue-900/60 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  : "bg-gray-900/40 text-gray-500 border-gray-800/50 cursor-pointer"
              }`}
              title="Night Plan"
            >
              <MoonStar className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <button
              onClick={() => supabase.auth.signOut()}
              className="bg-red-950/40 text-red-400 p-2.5 md:p-3.5 rounded-xl hover:bg-red-900/60 border border-red-900/50 hover:border-red-500 transition-all opacity-70 hover:opacity-100"
              title="Đăng Xuất"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* Streak */}
          {streak > 0 && (
            <span className="text-orange-400 text-[10px] md:text-xs tracking-widest uppercase font-mono bg-orange-900/20 px-2 py-0.5 rounded border border-orange-900/50 flex items-center">
              <Flame className="w-3 h-3 mr-1" />
              {streak} ngày
              {bestStreak > streak && (
                <span className="text-orange-600 ml-1">(Best: {bestStreak})</span>
              )}
            </span>
          )}
          <span className="text-yellow-500 text-[10px] md:text-xs tracking-widest uppercase font-mono bg-yellow-900/20 px-1.5 py-0.5 rounded border border-yellow-900/50 flex items-center">
            🥇 {stars} Vàng
          </span>
          <span className="text-gray-300 text-[10px] md:text-xs tracking-widest uppercase font-mono bg-gray-800/40 px-1.5 py-0.5 rounded border border-gray-600/50 flex items-center">
            🥈 {silverStars} Bạc
          </span>
          <span className="text-red-500 text-[10px] md:text-xs tracking-widest uppercase font-mono bg-red-900/20 px-1.5 py-0.5 rounded border border-red-900/50 flex items-center">
            ❌ {failedDays} Nợ
          </span>
        </div>
      </div>
    </>
  );
}
