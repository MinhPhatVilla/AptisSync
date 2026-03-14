"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, CheckCircle } from "lucide-react";
import type { ScheduleItem, SchoolShift } from "@/lib/types";
import { BEDTIME_MINS, OPTIMAL_CYCLES, SLEEP_CYCLE_MINS, FALL_ASLEEP_MINS } from "@/lib/constants";
import { formatMins } from "@/lib/schedule";

type NightPlanModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onGenerateSchedule: (shift: SchoolShift, urgentTask: string, urgentCycles: number) => ScheduleItem[];
  onConfirmSleep: (schedule: ScheduleItem[]) => void;
  generatedSchedule: ScheduleItem[];
};

const SHIFT_OPTIONS: SchoolShift[] = [
  "Sáng & Chiều",
  "Chỉ buổi Sáng",
  "Chỉ buổi Chiều",
  "Thứ 7 (Học cả ngày)",
  "Nghỉ ở nhà",
];

export default function NightPlanModal({
  isOpen,
  onClose,
  onGenerateSchedule,
  onConfirmSleep,
  generatedSchedule: externalSchedule,
}: NightPlanModalProps) {
  const [planStep, setPlanStep] = useState(0);
  const [schoolShift, setSchoolShift] = useState<SchoolShift>("");
  const [urgentTask, setUrgentTask] = useState("");
  const [urgentTaskCycles, setUrgentTaskCycles] = useState(1);
  const [localSchedule, setLocalSchedule] = useState<ScheduleItem[]>([]);

  const schedule = localSchedule.length > 0 ? localSchedule : externalSchedule;

  const handleClose = () => {
    setPlanStep(0);
    setSchoolShift("");
    setUrgentTask("");
    setUrgentTaskCycles(1);
    setLocalSchedule([]);
    onClose();
  };

  const handleGenerate = () => {
    const result = onGenerateSchedule(schoolShift, urgentTask, urgentTaskCycles);
    setLocalSchedule(result);
    setPlanStep(3);
  };

  const sleepHours = (OPTIMAL_CYCLES * SLEEP_CYCLE_MINS) / 60;
  const totalSleepMins = OPTIMAL_CYCLES * SLEEP_CYCLE_MINS + FALL_ASLEEP_MINS;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-xl"
      >
        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full h-full relative pt-12 pb-10 px-4 md:px-0">
          <button
            onClick={handleClose}
            className="absolute top-8 left-4 md:top-12 md:-left-4 z-[110] p-2 bg-gray-900/60 rounded-full text-gray-400 hover:text-white hover:bg-red-900/80 transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          <p className="text-blue-500 font-mono text-sm tracking-widest uppercase mb-4 opacity-80 pl-2">
            🧠 Night Plan • Bước {planStep + 1}/3
          </p>

          <AnimatePresence mode="wait">
            {/* Step 1: School shift */}
            {planStep === 0 && (
              <motion.div
                key="step1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
              >
                <h2 className="text-3xl font-light text-blue-50 mb-8 leading-tight">
                  Ngày mai có cần đi học ca nào trên trường không?
                </h2>
                <div className="space-y-3">
                  {SHIFT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setSchoolShift(opt);
                        setPlanStep(1);
                      }}
                      className="w-full text-left px-6 py-4 rounded-xl border border-blue-900 bg-blue-950/20 text-blue-200 hover:bg-blue-900/50 hover:border-blue-500 transition-all text-lg font-light"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Urgent task */}
            {planStep === 1 && (
              <motion.div
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
              >
                <h2 className="text-3xl font-light text-blue-50 mb-8 leading-tight">
                  Có bài tập nào gấp cần xử lý không?
                </h2>
                <input
                  autoFocus
                  type="text"
                  value={urgentTask}
                  onChange={(e) => setUrgentTask(e.target.value)}
                  placeholder="Gõ tên bài tập... (Bỏ trống nếu không có)"
                  className="w-full bg-transparent border-b-2 border-blue-800 text-blue-100 text-xl py-4 focus:outline-none focus:border-blue-400 placeholder:text-blue-900 mb-8"
                />
                <button
                  onClick={() => setPlanStep(2)}
                  className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-lg hover:bg-blue-500 transition-colors"
                >
                  Tiếp theo
                </button>
              </motion.div>
            )}

            {/* Step 3: Confirm & Generate */}
            {planStep === 2 && (
              <motion.div
                key="step3"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
              >
                {urgentTask ? (
                  <>
                    <h2 className="text-3xl font-light text-blue-50 mb-6 leading-tight">
                      Dành bao nhiêu chu kỳ cho &quot;{urgentTask}&quot;?
                    </h2>
                    <div className="space-y-3 mb-8">
                      {[1, 2].map((num) => (
                        <button
                          key={num}
                          onClick={() => setUrgentTaskCycles(num)}
                          className={`w-full text-left px-6 py-4 rounded-xl border flex justify-between items-center transition-all text-lg font-light ${
                            urgentTaskCycles === num
                              ? "bg-blue-600/30 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                              : "border-blue-900 bg-blue-950/20 text-blue-200 hover:bg-blue-900/50 hover:border-blue-500"
                          }`}
                        >
                          <span>{num} Chu kỳ</span>
                          <span className="text-sm font-bold opacity-80">
                            {num * 52}p học + {num * 17}p nghỉ
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <h2 className="text-3xl font-light text-blue-50 mb-6 leading-tight">
                    Xác nhận giờ ngủ khoa học!
                  </h2>
                )}

                {/* Sleep info card */}
                <div className="bg-blue-900/20 border border-blue-800/50 rounded-2xl p-5 mb-8 flex flex-col items-center shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                  <p className="text-blue-300/80 text-xs md:text-sm mb-3 font-medium uppercase tracking-wider font-mono text-center">
                    🧠 Giờ ngủ tối ưu theo khoa học não bộ:
                  </p>
                  <div className="flex flex-col items-center flex-1 bg-blue-600/20 px-8 py-3 rounded-xl border border-blue-500/40 shadow-[0_0_25px_rgba(59,130,246,0.3)]">
                    <span className="text-white font-mono font-bold text-4xl mb-1 tracking-tighter">
                      {formatMins(BEDTIME_MINS)}
                    </span>
                    <span className="text-blue-200 text-[11px] md:text-xs font-bold mt-1 uppercase tracking-widest text-center">
                      {OPTIMAL_CYCLES} Chu kỳ ({sleepHours}h)
                      <br />
                      <span className="text-[10px] text-blue-400 font-normal">
                        + {FALL_ASLEEP_MINS}p ru ngủ = {Math.floor(totalSleepMins / 60)}h
                        {totalSleepMins % 60}p
                      </span>
                    </span>
                  </div>
                  <p className="text-emerald-400/50 text-[10px] font-mono mt-3 text-center">
                    REM ở chu kỳ 4-5 = ghi nhớ ngôn ngữ tối đa ✓
                  </p>
                </div>

                <button
                  onClick={handleGenerate}
                  className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-lg shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:bg-blue-500 transition-colors flex items-center justify-center"
                >
                  Tạo Lịch Trình Tự Động <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              </motion.div>
            )}

            {/* Step 4: Generated schedule */}
            {planStep === 3 && (
              <motion.div
                key="step4"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col h-[85vh] md:h-[80vh] overflow-hidden bg-black mt-2"
              >
                <h2 className="text-2xl font-bold text-blue-400 mb-2 uppercase tracking-widest flex items-center shrink-0">
                  <CheckCircle className="w-5 h-5 mr-2" /> Kế hoạch Brain-Optimized
                </h2>
                <p className="text-gray-400 mb-4 text-sm shrink-0">
                  Lịch 52:17 Ultradian + Cognitive Peak + Active Recovery:
                </p>

                <div className="overflow-y-auto space-y-4 pr-2 pb-32 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-blue-900 flex-1">
                  {schedule.map((item, i) => (
                    <div key={i} className="flex flex-col mb-1 group">
                      <div className="flex items-center mb-1">
                        <span
                          className={`w-2.5 h-2.5 rounded-full mr-2 shadow-[0_0_8px_rgba(37,99,235,0.8)] ${
                            item.type === "sleep"
                              ? "bg-indigo-400"
                              : item.type === "rest"
                              ? "bg-emerald-600"
                              : item.type === "aptis"
                              ? "bg-blue-600"
                              : item.type === "urgent"
                              ? "bg-red-500"
                              : item.type === "school"
                              ? "bg-purple-500"
                              : "bg-gray-500"
                          }`}
                        />
                        <span className="font-mono text-sm text-blue-300 font-bold tracking-wider opacity-90">
                          {item.time}
                        </span>
                      </div>
                      <div
                        className={`ml-3.5 pl-4 border-l-2 py-2 ${
                          item.type === "aptis"
                            ? "border-blue-500/50"
                            : item.type === "school"
                            ? "border-purple-500/50"
                            : item.type === "urgent"
                            ? "border-red-500/50"
                            : item.type === "sleep"
                            ? "border-indigo-500/50"
                            : item.type === "rest"
                            ? "border-emerald-800/40"
                            : "border-gray-800"
                        }`}
                      >
                        <div
                          className={`p-3.5 rounded-xl border ${
                            item.type === "aptis"
                              ? "bg-blue-900/20 border-blue-500/30 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                              : item.type === "school"
                              ? "bg-purple-900/10 border-purple-500/20 text-purple-200"
                              : item.type === "urgent"
                              ? "bg-red-900/10 border-red-500/20 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                              : item.type === "sleep"
                              ? "bg-indigo-900/20 border-indigo-500/30 text-indigo-200"
                              : item.type === "rest"
                              ? "bg-emerald-950/10 border-emerald-800/30 text-emerald-300/80"
                              : "bg-transparent border-gray-800 text-gray-400"
                          }`}
                        >
                          <h4 className="font-bold text-base md:text-lg tracking-wide">
                            {item.title}
                          </h4>
                          {item.desc && (
                            <p className="text-sm mt-1.5 opacity-80">{item.desc}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="absolute left-0 right-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent flex justify-center pb-6">
                  <button
                    onClick={() => onConfirmSleep(schedule)}
                    className="w-full max-w-sm bg-blue-600 outline outline-4 outline-blue-900/30 text-white rounded-xl py-4 font-bold text-lg shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:bg-blue-500 hover:-translate-y-1 transition-all"
                  >
                    ✅ Xác nhận & Đi Ngủ
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
