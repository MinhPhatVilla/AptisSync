"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Brain, Moon } from "lucide-react";
import { SLEEP_CYCLE_MINS, FALL_ASLEEP_MINS, BEDTIME_MINS } from "@/lib/constants";
import { formatMins } from "@/lib/schedule";

export default function SleepPage() {
  const [wakeTime, setWakeTime] = useState("07:30");
  const [bedTimes, setBedTimes] = useState<
    { time: string; cycles: number; hours: string; isOptimal: boolean; note: string }[]
  >([]);

  useEffect(() => {
    calculateSleep(wakeTime);
  }, [wakeTime]);

  const calculateSleep = (targetWake: string) => {
    if (!targetWake) return;

    const [hours, minutes] = targetWake.split(":").map(Number);
    const wakeDate = new Date();
    wakeDate.setHours(hours, minutes, 0, 0);

    const results = [];

    for (const cycle of [6, 5, 4, 3]) {
      const msToSubtract = (cycle * SLEEP_CYCLE_MINS + FALL_ASLEEP_MINS) * 60000;
      const bedTimeDate = new Date(wakeDate.getTime() - msToSubtract);

      const bHours = bedTimeDate.getHours().toString().padStart(2, "0");
      const bMins = bedTimeDate.getMinutes().toString().padStart(2, "0");
      const totalHours = (cycle * SLEEP_CYCLE_MINS) / 60;

      let note = "";
      if (cycle === 6) note = "Rất nhiều → phù hợp phục hồi sau bệnh";
      if (cycle === 5) note = "🧠 Tối ưu — đủ REM ghi nhớ ngôn ngữ";
      if (cycle === 4) note = "Nước rút — phù hợp khi có ca sáng";
      if (cycle === 3) note = "⚠️ Thiếu ngủ nghiêm trọng — không khuyến khích";

      results.push({
        time: `${bHours}:${bMins}`,
        cycles: cycle,
        hours: `${totalHours}h`,
        isOptimal: cycle === 5,
        note,
      });
    }

    setBedTimes(results);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] max-w-lg mx-auto w-full pt-10 px-4 md:px-0">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <Moon className="w-8 h-8 text-indigo-400" />
          <h1 className="text-4xl md:text-5xl font-light tracking-tight">Sleep.</h1>
        </div>
        <p className="text-gray-500">
          Ngủ cố định {formatMins(BEDTIME_MINS)} — tính giờ dậy theo chu kỳ {SLEEP_CYCLE_MINS} phút.
        </p>
      </header>

      {/* Input */}
      <div className="mb-16">
        <label className="block text-gray-500 text-sm mb-4 uppercase tracking-wider">
          Tôi muốn thức dậy lúc
        </label>
        <div className="relative inline-block w-full border-b border-gray-800 focus-within:border-white transition-colors">
          <input
            type="time"
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
            className="bg-transparent text-5xl md:text-6xl font-light py-2 w-full focus:outline-none focus:ring-0 appearance-none text-white tracking-widest"
            style={{ colorScheme: "dark" }}
            required
          />
        </div>
      </div>

      {/* Results */}
      {bedTimes.length > 0 && (
        <div className="flex-1 animate-in slide-in-from-bottom-8 duration-700">
          <p className="text-gray-500 text-sm mb-6 uppercase tracking-wider">
            Bạn nên nằm xuống giường lúc
          </p>

          <div className="flex flex-col gap-6">
            {bedTimes.map((b, i) => (
              <div
                key={i}
                className={`flex items-baseline justify-between py-3 border-b transition-colors ${
                  b.isOptimal
                    ? "border-indigo-500/50 text-white"
                    : "border-gray-800 text-gray-400 opacity-60 hover:opacity-100 hover:text-gray-200"
                }`}
              >
                <div className="flex items-center">
                  <span
                    className={`text-4xl md:text-5xl font-light ${
                      b.isOptimal ? "font-medium text-indigo-100" : ""
                    }`}
                  >
                    {b.time}
                  </span>
                  {b.isOptimal && (
                    <ArrowRight className="w-5 h-5 ml-4 text-indigo-400 hidden sm:block" />
                  )}
                </div>

                <div className="text-right max-w-[160px]">
                  <div className={`text-sm ${b.isOptimal ? "text-indigo-300" : "text-gray-600"}`}>
                    {b.cycles} chu kỳ • {b.hours}
                  </div>
                  <div
                    className={`text-[10px] font-mono mt-1 ${
                      b.isOptimal
                        ? "text-indigo-400 uppercase tracking-widest"
                        : "text-gray-600"
                    }`}
                  >
                    {b.note}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Brain science info */}
          <div className="mt-12 p-4 rounded-xl border border-indigo-900/30 bg-indigo-950/10">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-indigo-300 text-sm font-medium mb-1">Lịch ngủ cố định của em</p>
                <p className="text-gray-500 text-xs leading-relaxed">
                  <strong className="text-gray-400">Ngủ:</strong> 23:45 cố định mỗi ngày
                  <br />
                  <strong className="text-gray-400">Dậy 06:00:</strong> 4 chu kỳ (6h) — khi có ca sáng
                  <br />
                  <strong className="text-gray-400">Dậy 07:30:</strong> 5 chu kỳ (7h30) — đủ REM ghi nhớ ✓
                  <br />
                  <span className="text-indigo-400">→ Chọn giờ dậy trong Night Plan mỗi tối lúc 22h.</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-sm text-gray-600 font-light text-center leading-relaxed max-w-sm mx-auto">
            Đã cộng thêm {FALL_ASLEEP_MINS} phút — thời gian trung bình chìm vào giấc ngủ.
          </div>
        </div>
      )}
    </div>
  );
}
