"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";

// Types & Constants
import type { Block, ScheduleItem, SchoolShift } from "@/lib/types";
import {
  INITIAL_BLOCKS,
  FOCUS_DURATION,
  BREAK_DURATION,
  NIGHT_PLAN_START_HOUR,
  NIGHT_PLAN_AUTO_HOUR,
  DEFAULT_WAKE_MINS,
} from "@/lib/constants";
import { generateBrainSchedule } from "@/lib/schedule";

// Components
import LoginScreen from "@/components/auth/LoginScreen";
import Header from "@/components/layout/Header";
import TimerCircle from "@/components/timer/TimerCircle";
import ScheduleTimeline from "@/components/schedule/ScheduleTimeline";
import NightPlanModal from "@/components/schedule/NightPlanModal";

// ── Main Page ──
export default function AptisIntensivePage() {
  // ── Core State ──
  const [blocks, setBlocks] = useState<Block[]>(INITIAL_BLOCKS);
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPausedDay, setIsPausedDay] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<ScheduleItem[]>([]);

  // ── UI State ──
  const [isMounted, setIsMounted] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);

  // ── Auth ──
  const [user, setUser] = useState<User | null>(null);

  // ── Gamification ──
  const [stars, setStars] = useState(0);
  const [silverStars, setSilverStars] = useState(0);
  const [failedDays, setFailedDays] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // ── Voice ──
  const [viVoices, setViVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);

  // ── Refs ──
  const endTimeRef = useRef<number | null>(null);
  const lastDayRef = useRef<string>(new Date().toDateString());
  const channelRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ═══════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setUser(session?.user ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_e: string, session: Session | null) => setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  // ═══════════════════════════════════════════
  // SPEECH SYNTHESIS
  // ═══════════════════════════════════════════
  const speakAnnounce = (message: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const msg = new SpeechSynthesisUtterance();
    msg.text = message;
    msg.lang = "vi-VN";
    msg.rate = 1.0;
    msg.pitch = 1.3;

    let viVoice: SpeechSynthesisVoice | null = null;
    if (viVoices.length > 0 && viVoices[selectedVoiceIndex]) {
      viVoice = viVoices[selectedVoiceIndex];
    } else {
      const voices = window.speechSynthesis.getVoices();
      viVoice =
        voices.find((v) => v.name === "Google Tiếng Việt") ||
        voices.find((v) => v.lang === "vi-VN" && (v.name.includes("Female") || v.name.includes("Lieu"))) ||
        voices.find((v) => v.lang.includes("vi")) || null;
    }

    if (viVoice) msg.voice = viVoice;
    window.speechSynthesis.speak(msg);
  };

  // ═══════════════════════════════════════════
  // SYNC & BROADCAST
  // ═══════════════════════════════════════════
  const syncAndBroadcast = async (updates: any) => {
    if (!user) return;

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "state_update",
        payload: updates,
      });
    }

    const dbUpdates = { id: user.id, updated_at: new Date().toISOString() } as any;
    if (updates.schedule !== undefined) dbUpdates.schedule = updates.schedule;
    if (updates.schedule_date !== undefined) dbUpdates.schedule_date = updates.schedule_date;
    if (updates.blocks) dbUpdates.blocks = updates.blocks;
    if (updates.activeBlockIndex !== undefined) dbUpdates.active_block_index = updates.activeBlockIndex;
    if (updates.timeLeft !== undefined) dbUpdates.time_left = updates.timeLeft;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.isPausedDay !== undefined) dbUpdates.is_paused_day = updates.isPausedDay;
    if (updates.stars !== undefined) dbUpdates.stars = updates.stars;
    if (updates.silverStars !== undefined) dbUpdates.silver_stars = updates.silverStars;
    if (updates.failed_days !== undefined) dbUpdates.failed_days = updates.failed_days;
    if (updates.streak !== undefined) dbUpdates.streak = updates.streak;
    if (updates.bestStreak !== undefined) dbUpdates.best_streak = updates.bestStreak;

    await supabase.from("user_state").upsert(dbUpdates);
  };

  // ═══════════════════════════════════════════
  // RESET FOR NEW DAY
  // ═══════════════════════════════════════════
  const resetForNewDay = (preservedData?: {
    stars?: number;
    silver_stars?: number;
    failed_days?: number;
    streak?: number;
    best_streak?: number;
  }) => {
    setBlocks(INITIAL_BLOCKS);
    setActiveBlockIndex(0);
    setTimeLeft(0);
    setIsPausedDay(false);
    setIsActive(false);
    setGeneratedSchedule([]);
    endTimeRef.current = null;
    if (preservedData?.stars !== undefined) setStars(preservedData.stars);
    if (preservedData?.silver_stars !== undefined) setSilverStars(preservedData.silver_stars);
    if (preservedData?.failed_days !== undefined) setFailedDays(preservedData.failed_days);
    if (preservedData?.streak !== undefined) setStreak(preservedData.streak);
    if (preservedData?.best_streak !== undefined) setBestStreak(preservedData.best_streak);
    syncAndBroadcast({
      schedule: [],
      schedule_date: null,
      blocks: INITIAL_BLOCKS,
      activeBlockIndex: 0,
      timeLeft: 0,
      endTime: null,
      isActive: false,
      isPausedDay: false,
    });
  };

  // ═══════════════════════════════════════════
  // LOAD STATE & REALTIME SYNC
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (!user) return;

    const loadState = async () => {
      const { data } = await supabase.from("user_state").select("*").eq("id", user.id).single();
      if (data) {
        const today = new Date().toDateString();

        let isNewDay = false;
        if (data.schedule_date) {
          isNewDay = new Date(data.schedule_date).toDateString() !== today;
        } else if (data.updated_at) {
          isNewDay = new Date(data.updated_at).toDateString() !== today;
        }

        const hasSchedule = data.schedule && Array.isArray(data.schedule) && data.schedule.length > 0;
        const blocksAreInitial =
          !data.blocks || (Array.isArray(data.blocks) && data.blocks.every((b: Block) => !b.completed));
        const scheduleDateIsToday = data.schedule_date && new Date(data.schedule_date).toDateString() === today;
        const isStaleSchedule = hasSchedule && blocksAreInitial && !data.is_active && !scheduleDateIsToday;

        if (isNewDay || isStaleSchedule) {
          resetForNewDay({
            stars: data.stars,
            silver_stars: data.silver_stars,
            failed_days: data.failed_days,
            streak: data.streak,
            best_streak: data.best_streak,
          });
          return;
        }

        if (data.blocks) setBlocks(data.blocks);
        if (data.active_block_index !== undefined) setActiveBlockIndex(data.active_block_index);
        if (data.is_paused_day !== undefined) setIsPausedDay(data.is_paused_day);
        if (data.is_active !== undefined) setIsActive(data.is_active);
        if (data.stars !== undefined) setStars(data.stars);
        if (data.silver_stars !== undefined) setSilverStars(data.silver_stars);
        if (data.failed_days !== undefined) setFailedDays(data.failed_days);
        if (data.streak !== undefined) setStreak(data.streak);
        if (data.best_streak !== undefined) setBestStreak(data.best_streak);
        if (hasSchedule) {
          setGeneratedSchedule(data.schedule);
        }

        if (data.is_active && data.end_time) {
          const endMs = new Date(data.end_time).getTime();
          const remaining = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
          setTimeLeft(remaining);
          endTimeRef.current = endMs;
        } else if (data.time_left !== undefined) {
          setTimeLeft(data.time_left);
        }
      }
    };
    loadState();

    // Realtime channel
    const channel = supabase.channel(`sync_${user.id}`);
    channel
      .on("broadcast", { event: "state_update" }, (payload) => {
        const ns = payload.payload;
        if (ns.blocks) setBlocks(ns.blocks);
        if (ns.activeBlockIndex !== undefined) setActiveBlockIndex(ns.activeBlockIndex);
        if (ns.isActive !== undefined) setIsActive(ns.isActive);
        if (ns.isPausedDay !== undefined) setIsPausedDay(ns.isPausedDay);
        if (ns.stars !== undefined) setStars(ns.stars);
        if (ns.silver_stars !== undefined) setSilverStars(ns.silver_stars);
        if (ns.failed_days !== undefined) setFailedDays(ns.failed_days);
        if (ns.streak !== undefined) setStreak(ns.streak);
        if (ns.bestStreak !== undefined) setBestStreak(ns.bestStreak);
        if (ns.schedule) setGeneratedSchedule(ns.schedule);

        if (ns.endTime && ns.isActive) {
          const endMs = new Date(ns.endTime).getTime();
          const remaining = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
          setTimeLeft(remaining);
          endTimeRef.current = endMs;
        } else if (ns.endTime === null) {
          endTimeRef.current = null;
          if (ns.timeLeft !== undefined) setTimeLeft(ns.timeLeft);
        } else if (ns.timeLeft !== undefined) {
          setTimeLeft(ns.timeLeft);
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // ═══════════════════════════════════════════
  // CLOCK & VOICES SETUP
  // ═══════════════════════════════════════════
  useEffect(() => {
    setIsMounted(true);
    setCurrentDateTime(new Date());
    const dtInterval = setInterval(() => setCurrentDateTime(new Date()), 1000);

    const loadVoices = () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const voices = window.speechSynthesis.getVoices();
        const vi = voices.filter((v) => v.lang.includes("vi"));
        vi.sort((a, b) => {
          const aFemale =
            a.name.includes("HoaiMy") || a.name.includes("Google") || a.name.toLowerCase().includes("female") || a.name.includes("Linh");
          const bFemale =
            b.name.includes("HoaiMy") || b.name.includes("Google") || b.name.toLowerCase().includes("female") || b.name.includes("Linh");
          if (aFemale && !bFemale) return -1;
          if (!aFemale && bFemale) return 1;
          return 0;
        });
        setViVoices(vi);
      }
    };
    loadVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => clearInterval(dtInterval);
  }, []);

  // Day change detection
  useEffect(() => {
    if (currentDateTime) {
      const todayStr = currentDateTime.toDateString();
      if (lastDayRef.current !== todayStr) {
        lastDayRef.current = todayStr;
        resetForNewDay();
      }
    }
  }, [currentDateTime]);

  // ═══════════════════════════════════════════
  // NIGHT PLAN AUTO-POPUP
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (!isMounted) return;
    const checkTime = () => {
      const now = new Date();
      if (now.getHours() === NIGHT_PLAN_AUTO_HOUR && now.getMinutes() === 0) {
        setIsPlanning(true);
      }
    };
    const interval = setInterval(checkTime, 60000);
    checkTime();
    return () => clearInterval(interval);
  }, [isMounted]);

  // ═══════════════════════════════════════════
  // TIMER INITIALIZATION
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (activeBlockIndex < blocks.length && !blocks[activeBlockIndex].completed && !isActive && timeLeft === 0) {
      setTimeLeft(blocks[activeBlockIndex].durationMins * 60);
    }
  }, [activeBlockIndex, blocks, isActive, timeLeft]);

  // ═══════════════════════════════════════════
  // COUNTDOWN ENGINE
  // ═══════════════════════════════════════════
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + timeLeft * 1000;
        syncAndBroadcast({ endTime: new Date(endTimeRef.current).toISOString(), isActive: true });
      }
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current! - Date.now()) / 1000));
        setTimeLeft(remaining);
      }, 500);
    } else if (isActive && timeLeft === 0) {
      endTimeRef.current = null;
      setIsActive(false);

      const nextTime = new Date();
      nextTime.setMinutes(nextTime.getMinutes() + BREAK_DURATION);
      const hStr = nextTime.getHours();
      const mStr = nextTime.getMinutes();

      speakAnnounce(
        `Anh đã hoàn thành chu kỳ ${blocks[activeBlockIndex].title}. Nghỉ Ultradian ${BREAK_DURATION} phút. Bắt đầu lại lúc ${hStr} giờ ${mStr} phút nhé.`
      );

      markBlockCompleted(activeBlockIndex);

      if (audioRef.current) {
        audioRef.current.play().catch((e) => console.log("Audio:", e));
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, activeBlockIndex]);

  // ═══════════════════════════════════════════
  // BLOCK COMPLETION
  // ═══════════════════════════════════════════
  const markBlockCompleted = (index: number) => {
    const newBlocks = [...blocks];
    newBlocks[index].completed = true;
    setBlocks(newBlocks);

    const newSilverStars = silverStars + 1;
    setSilverStars(newSilverStars);
    speakAnnounce("Chúc mừng anh! Hoàn thành chu kỳ — cộng 1 sao bạc.");

    let nextIndex = index;
    if (index + 1 < blocks.length) {
      nextIndex = index + 1;
      setActiveBlockIndex(nextIndex);
      setTimeLeft(newBlocks[nextIndex].durationMins * 60);
    }
    syncAndBroadcast({
      blocks: newBlocks,
      activeBlockIndex: nextIndex,
      silverStars: newSilverStars,
      endTime: null,
      timeLeft: newBlocks[nextIndex]?.durationMins ? newBlocks[nextIndex].durationMins * 60 : 0,
    });
  };

  // ═══════════════════════════════════════════
  // TIMER TOGGLE
  // ═══════════════════════════════════════════
  const toggleTimer = () => {
    if (activeBlockIndex >= blocks.length || isPausedDay) return;
    const newIsActive = !isActive;
    setIsActive(newIsActive);
    if (newIsActive) {
      const endMs = Date.now() + timeLeft * 1000;
      endTimeRef.current = endMs;
      syncAndBroadcast({ isActive: true, timeLeft, endTime: new Date(endMs).toISOString() });
    } else {
      endTimeRef.current = null;
      syncAndBroadcast({ isActive: false, timeLeft, endTime: null });
    }
  };

  // ═══════════════════════════════════════════
  // BUSY / RESUME
  // ═══════════════════════════════════════════
  const handleBusy = () => {
    setIsActive(false);
    setIsPausedDay(true);
    endTimeRef.current = null;
    speakAnnounce("Hệ thống tạm dừng. Anh cứ đi giải quyết việc nhé.");
    syncAndBroadcast({ isActive: false, isPausedDay: true, timeLeft });
  };

  const handleResume = () => {
    setIsPausedDay(false);
    setIsActive(true);
    speakAnnounce("Đã nhận lệnh. Hệ thống tái phân bổ thời gian theo chu kỳ 52:17.");

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const { schedule, unassignedBlocks } = generateBrainSchedule(
      currentMins,
      "" as SchoolShift,
      blocks,
      activeBlockIndex,
      timeLeft,
      "",
      0,
      false
    );

    let updatedBlocks = [...blocks];
    if (unassignedBlocks.length > 0) {
      let droppedCount = 0;
      for (const block of unassignedBlocks) {
        const idx = updatedBlocks.findIndex((b) => b.id === block.id);
        if (idx !== -1) {
          updatedBlocks[idx].completed = true;
          droppedCount++;
        }
      }
      if (droppedCount > 0) {
        speakAnnounce(`Loại bỏ ${droppedCount} chu kỳ để đảm bảo giờ ngủ.`);
      }
    }

    let newActiveIndex = activeBlockIndex;
    while (newActiveIndex < updatedBlocks.length && updatedBlocks[newActiveIndex].completed) {
      newActiveIndex++;
    }

    let newTimeLeft = timeLeft;
    if (newActiveIndex !== activeBlockIndex) {
      setActiveBlockIndex(newActiveIndex);
      if (newActiveIndex < updatedBlocks.length) {
        newTimeLeft = updatedBlocks[newActiveIndex].durationMins * 60;
        setTimeLeft(newTimeLeft);
      } else {
        newTimeLeft = 0;
        setIsActive(false);
      }
    }

    setGeneratedSchedule(schedule);
    const newEndTime =
      newActiveIndex < updatedBlocks.length && newTimeLeft > 0
        ? new Date(Date.now() + newTimeLeft * 1000).toISOString()
        : null;
    syncAndBroadcast({
      blocks: updatedBlocks,
      activeBlockIndex: newActiveIndex,
      isActive: newActiveIndex < updatedBlocks.length,
      isPausedDay: false,
      timeLeft: newTimeLeft,
      endTime: newEndTime,
      schedule,
    });
  };

  // ═══════════════════════════════════════════
  // NIGHT PLAN HANDLERS
  // ═══════════════════════════════════════════
  const handleGenerateSchedule = (
    shift: SchoolShift,
    urgentTask: string,
    urgentCycles: number,
    wakeMins: number = DEFAULT_WAKE_MINS
  ): ScheduleItem[] => {
    const { schedule } = generateBrainSchedule(
      wakeMins, // Start from wake time for tomorrow
      shift,
      blocks,
      activeBlockIndex,
      timeLeft,
      urgentTask,
      urgentCycles,
      true,
      wakeMins
    );
    setGeneratedSchedule(schedule);
    return schedule;
  };

  const handleSleepConfirmation = (schedule: ScheduleItem[]) => {
    if (blocks.some((b) => b.completed) || isActive) {
      const allDone = blocks.every((b) => b.completed);
      let newStars = stars;
      let newFailed = failedDays;
      let newStreak = streak;

      if (allDone) {
        newStars += 1;
        newStreak += 1;
        if (newStreak > bestStreak) setBestStreak(newStreak);
        speakAnnounce("Xuất sắc! Hoàn thành mục tiêu — cộng 1 sao vàng và chuỗi streak!");
      } else {
        newFailed += 1;
        newStreak = 0; // Reset streak
        speakAnnounce("Chưa hoàn thành 100%. Streak bị reset! Cố gắng ngày mai nhé.");
      }

      setStars(newStars);
      setFailedDays(newFailed);
      setStreak(newStreak);

      syncAndBroadcast({
        schedule,
        schedule_date: new Date().toISOString(),
        blocks: INITIAL_BLOCKS,
        activeBlockIndex: 0,
        timeLeft: 0,
        isActive: false,
        isPausedDay: false,
        stars: newStars,
        failed_days: newFailed,
        streak: newStreak,
        bestStreak: Math.max(newStreak, bestStreak),
      });
    } else {
      syncAndBroadcast({
        schedule,
        schedule_date: new Date().toISOString(),
        blocks: INITIAL_BLOCKS,
        activeBlockIndex: 0,
        timeLeft: 0,
        isActive: false,
        isPausedDay: false,
      });
    }

    setIsPlanning(false);
  };

  const handleNightPlanOpen = () => {
    const hour = currentDateTime?.getHours() || 0;
    if (hour >= NIGHT_PLAN_START_HOUR || hour < 4) {
      setIsPlanning(true);
    } else {
      speakAnnounce("Night Plan chỉ mở từ 21 giờ nhé.");
    }
  };

  const handleAddBlock = () => {
    const newBlocks = [
      ...blocks,
      {
        id: blocks.length + 1,
        title: "Luyện thêm Aptis (Cày cuốc)",
        durationMins: FOCUS_DURATION,
        completed: false,
        cognitive: "review" as const,
      },
    ];
    setBlocks(newBlocks);
    syncAndBroadcast({ blocks: newBlocks });
  };

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  if (!isMounted) return null;
  if (!user) return <LoginScreen onAuthComplete={() => {}} />;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] max-w-lg mx-auto w-full pt-6 relative px-4 md:px-0">
      <Header
        currentDateTime={currentDateTime}
        stars={stars}
        silverStars={silverStars}
        failedDays={failedDays}
        streak={streak}
        bestStreak={bestStreak}
        viVoices={viVoices}
        selectedVoiceIndex={selectedVoiceIndex}
        onVoiceChange={setSelectedVoiceIndex}
        onNightPlan={handleNightPlanOpen}
        speakAnnounce={speakAnnounce}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto pb-10 w-full [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-blue-900">
        <TimerCircle
          blocks={blocks}
          activeBlockIndex={activeBlockIndex}
          timeLeft={timeLeft}
          isActive={isActive}
          isPausedDay={isPausedDay}
          onToggle={toggleTimer}
          onBusy={handleBusy}
          onResume={handleResume}
          onAddBlock={handleAddBlock}
          onReset={() => resetForNewDay()}
        />

        {currentDateTime && (
          <ScheduleTimeline
            generatedSchedule={generatedSchedule}
            blocks={blocks}
            activeBlockIndex={activeBlockIndex}
            timeLeft={timeLeft}
            isActive={isActive}
            currentDateTime={currentDateTime}
          />
        )}
      </div>

      {/* Night Plan Modal */}
      <NightPlanModal
        isOpen={isPlanning}
        onClose={() => setIsPlanning(false)}
        onGenerateSchedule={handleGenerateSchedule}
        onConfirmSleep={handleSleepConfirmation}
        generatedSchedule={generatedSchedule}
      />

      <audio
        ref={audioRef}
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
        preload="auto"
      />
    </div>
  );
}
