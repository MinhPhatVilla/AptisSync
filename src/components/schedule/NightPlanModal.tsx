"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, CheckCircle, Sun, Moon } from "lucide-react";
import type { ScheduleItem, SchoolShift } from "@/lib/types";
import {
  WAKE_OPTIONS,
  DEFAULT_WAKE_MINS,
  BEDTIME_MINS,
  SLEEP_CYCLE_MINS,
  FALL_ASLEEP_MINS,
  calcCyclesFromWake,
  formatMinsStatic,
} from "@/lib/constants";
import { formatMins } from "@/lib/schedule";

type NightPlanModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onGenerateSchedule: (
    shift: SchoolShift,
    urgentTask: string,
    urgentCycles: number,
    wakeMins: number
  ) => ScheduleItem[];
  onConfirmSleep: (schedule: ScheduleItem[]) => void;
  generatedSchedule: ScheduleItem[];
};

const SHIFT_OPTIONS: SchoolShift[] = [
  "Sáng & Chiều",
  "Chỉ buổi Sáng",
  "Chỉ buổi Chiều",
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
  const [wakeMins, setWakeMins] = useState<number>(DEFAULT_WAKE_MINS);
  const [localSchedule, setLocalSchedule] = useState<ScheduleItem[]>([]);

  const schedule = localSchedule.length > 0 ? localSchedule : externalSchedule;
  const totalSteps = 4;

  const handleClose = () => {
    setPlanStep(0);
    setSchoolShift("");
    setUrgentTask("");
    setUrgentTaskCycles(1);
    setWakeMins(DEFAULT_WAKE_MINS);
    setLocalSchedule([]);
    onClose();
  };

  const handleGenerate = () => {
    const result = onGenerateSchedule(schoolShift, urgentTask, urgentTaskCycles, wakeMins);
    setLocalSchedule(result);
    setPlanStep(4);
  };

  if (!isOpen) return null;

  const selectedCycles = calcCyclesFromWake(wakeMins);
  const selectedSleepH = (selectedCycles * SLEEP_CYCLE_MINS) / 60;

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
            🧠 Night Plan • Bước {Math.min(planStep + 1, totalSteps)}/{totalSteps}
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
                {urgentTask ? (
                  <div className="space-y-3 mb-8">
                    <p className="text-blue-300/60 text-sm mb-2">Dành bao nhiêu chu kỳ?</p>
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
                ) : null}
                <button
                  onClick={() => setPlanStep(2)}
                  className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-lg hover:bg-blue-500 transition-colors"
                >
                  Tiếp theo
                </button>
              </motion.div>
            )}

            {/* Step 3: Choose wake time (06:00 or 07:30) */}
            {planStep === 2 && (
              <motion.div
                key="step3"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
              >
                <h2 className="text-3xl font-light text-blue-50 mb-4 leading-tight">
                  Sáng mai dậy lúc mấy giờ?
                </h2>
                <p className="text-gray-500 text-sm mb-8">
                  Ngủ cố định lúc <span className="text-indigo-400 font-bold">{formatMins(BEDTIME_MINS)}</span>
                </p>

                <div className="space-y-4 mb-8">
                  {WAKE_OPTIONS.map((opt) => {
                    const isSelected = wakeMins === opt.time;

                    return (
                      <button
                        key={opt.time}
                        onClick={() => setWakeMins(opt.time)}
                        className={`w-full text-left px-6 py-5 rounded-2xl border transition-all ${
                          isSelected
                            ? "bg-amber-600/15 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                            : "border-gray-800 bg-gray-900/20 text-gray-200 hover:bg-gray-800/40 hover:border-gray-600"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <Sun className={`w-5 h-5 ${isSelected ? "text-amber-400" : "text-gray-600"}`} />
                            <div>
                              <span className="text-3xl font-bold font-mono">{opt.label}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-bold ${isSelected ? "text-amber-300" : "text-gray-500"}`}>
                              {opt.cycles} chu kỳ
                            </div>
                            <div className="text-xs text-gray-500">{opt.sleepHours}h ngủ</div>
                          </div>
                        </div>
                        <p className={`text-xs mt-2 ${isSelected ? "text-amber-200/70" : "text-gray-600"}`}>
                          {opt.note}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Sleep summary card */}
                <div className="bg-indigo-900/15 border border-indigo-800/40 rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-indigo-300/50 text-[10px] uppercase font-mono tracking-wider">Ngủ</p>
                      <p className="text-white font-mono font-bold text-2xl">23:45</p>
                    </div>
                    <Moon className="w-5 h-5 text-indigo-500" />
                    <div className="text-center">
                      <p className="text-amber-300/50 text-[10px] uppercase font-mono tracking-wider">Dậy</p>
                      <p className="text-white font-mono font-bold text-2xl">{formatMinsStatic(wakeMins)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 text-[10px] uppercase font-mono tracking-wider">Tổng</p>
                      <p className="text-indigo-300 font-mono font-bold text-xl">{selectedSleepH}h</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setPlanStep(3)}
                  className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-lg hover:bg-blue-500 transition-colors"
                >
                  Tiếp theo
                </button>
              </motion.div>
            )}

            {/* Step 4: Confirm & Generate */}
            {planStep === 3 && (
              <motion.div
                key="step-confirm"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
              >
                <h2 className="text-3xl font-light text-blue-50 mb-6 leading-tight">
                  Xác nhận tổng kết
                </h2>

                <div className="space-y-3 mb-8">
                  <div className="flex justify-between items-center bg-gray-900/40 rounded-xl px-5 py-3 border border-gray-800">
                    <span className="text-gray-400">Ca học</span>
                    <span className="text-white font-medium">{schoolShift || "Nghỉ"}</span>
                  </div>
                  {urgentTask && (
                    <div className="flex justify-between items-center bg-red-900/10 rounded-xl px-5 py-3 border border-red-900/30">
                      <span className="text-red-400/60">Bài tập gấp</span>
                      <span className="text-red-200 font-medium">{urgentTask} ({urgentTaskCycles} CK)</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-indigo-900/10 rounded-xl px-5 py-3 border border-indigo-900/30">
                    <span className="text-indigo-400/60">Giấc ngủ</span>
                    <span className="text-indigo-200 font-medium">
                      23:45 → {formatMinsStatic(wakeMins)} ({selectedCycles} CK • {selectedSleepH}h)
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-lg shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:bg-blue-500 transition-colors flex items-center justify-center"
                >
                  Tạo Lịch Trình Tự Động <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              </motion.div>
            )}

            {/* Step 5: Generated schedule */}
            {planStep === 4 && (
              <motion.div
                key="step-result"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col h-[85vh] md:h-[80vh] overflow-hidden bg-black mt-2"
              >
                <h2 className="text-2xl font-bold text-blue-400 mb-2 uppercase tracking-widest flex items-center shrink-0">
                  <CheckCircle className="w-5 h-5 mr-2" /> Kế hoạch ngày mai
                </h2>
                <p className="text-gray-400 mb-4 text-sm shrink-0">
                  52:17 Ultradian • Ngủ 23:45 → Dậy {formatMinsStatic(wakeMins)}
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
