"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, CheckCircle, ChevronRight, MoonStar, Clock, BellRing, LogOut, Loader2, RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";

type Block = {
  id: number;
  title: string;
  durationMins: number; // Duration in minutes
  completed: boolean;
};

const INITIAL_BLOCKS: Block[] = [
  { id: 1, title: "Luyện Nghe & Đọc Hiểu", durationMins: 90, completed: false },
  { id: 2, title: "Từ Vựng Trắc Nghiệm", durationMins: 60, completed: false },
  { id: 3, title: "Luyện Nói & Viết", durationMins: 120, completed: false },
];

const TARGET_MINUTES = 270;

export default function AptisIntensivePage() {
  const [blocks, setBlocks] = useState<Block[]>(INITIAL_BLOCKS);

  const [activeBlockIndex, setActiveBlockIndex] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [isActive, setIsActive] = useState(false);

  const [isPlanning, setIsPlanning] = useState(false);
  const [planStep, setPlanStep] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);

  // Auth & System State
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [isPausedDay, setIsPausedDay] = useState(false);

  const endTimeRef = useRef<number | null>(null);

  // Voice Settings
  const [viVoices, setViVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);

  // Gamification Settings
  const [stars, setStars] = useState(0); // Gold Stars
  const [silverStars, setSilverStars] = useState(0); // Silver Stars
  const [failedDays, setFailedDays] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: string, session: Session | null) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const channelRef = useRef<any>(null);

  const syncAndBroadcast = async (updates: any) => {
    if (!user) return;

    // Broadcast via websocket for instant sync
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'state_update',
        payload: updates
      });
    }

    // Persist to DB
    const dbUpdates = { id: user.id, updated_at: new Date().toISOString() } as any;
    if (updates.schedule) dbUpdates.schedule = updates.schedule;
    if (updates.blocks) dbUpdates.blocks = updates.blocks;
    if (updates.activeBlockIndex !== undefined) dbUpdates.active_block_index = updates.activeBlockIndex;
    if (updates.timeLeft !== undefined) dbUpdates.time_left = updates.timeLeft;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.isPausedDay !== undefined) dbUpdates.is_paused_day = updates.isPausedDay;
    if (updates.stars !== undefined) dbUpdates.stars = updates.stars;
    if (updates.silverStars !== undefined) dbUpdates.silver_stars = updates.silverStars;
    if (updates.failed_days !== undefined) dbUpdates.failed_days = updates.failed_days;

    await supabase.from('user_state').upsert(dbUpdates);
  };

  useEffect(() => {
    if (!user) return;

    // Load initial state
    const loadState = async () => {
      const { data } = await supabase.from('user_state').select('*').eq('id', user.id).single();
      if (data) {
        if (data.blocks) setBlocks(data.blocks);
        if (data.active_block_index !== undefined) setActiveBlockIndex(data.active_block_index);
        if (data.time_left !== undefined) setTimeLeft(data.time_left);
        if (data.is_paused_day !== undefined) setIsPausedDay(data.is_paused_day);
        if (data.is_active !== undefined) setIsActive(data.is_active);
        if (data.stars !== undefined) setStars(data.stars);
        if (data.silver_stars !== undefined) setSilverStars(data.silver_stars);
        if (data.failed_days !== undefined) setFailedDays(data.failed_days);
        if (data.schedule) {
          setGeneratedSchedule(data.schedule);
          if (data.schedule.length > 0) setPlanStep(3);
        }
      }
    };
    loadState();

    const channel = supabase.channel(`sync_${user.id}`);

    channel.on('broadcast', { event: 'state_update' }, (payload) => {
      const newState = payload.payload;
      if (newState.blocks) setBlocks(newState.blocks);
      if (newState.activeBlockIndex !== undefined) setActiveBlockIndex(newState.activeBlockIndex);
      if (newState.timeLeft !== undefined) setTimeLeft(newState.timeLeft);
      if (newState.isActive !== undefined) setIsActive(newState.isActive);
      if (newState.isPausedDay !== undefined) setIsPausedDay(newState.isPausedDay);
      if (newState.stars !== undefined) setStars(newState.stars);
      if (newState.silver_stars !== undefined) setSilverStars(newState.silver_stars);
      if (newState.failed_days !== undefined) setFailedDays(newState.failed_days);
      if (newState.schedule) {
        setGeneratedSchedule(newState.schedule);
        if (newState.schedule.length > 0) setPlanStep(3);
      }
    }).subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log("Realtime Sync Subscribed!");
      }
    });

    channelRef.current = channel;

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        const { error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (signUpErr) alert("Lỗi đăng ký: " + signUpErr.message);
      } else {
        alert("Lỗi đăng nhập: " + error.message);
      }
    }
    setAuthLoading(false);
  };

  // Night Plan inputs & schedule
  const [schoolShift, setSchoolShift] = useState("");
  const [urgentTask, setUrgentTask] = useState("");
  const [wakeUpTime, setWakeUpTime] = useState("06:00");

  type ScheduleItem = { time: string; title: string; desc: string; type: "aptis" | "school" | "urgent" | "rest" };
  const [generatedSchedule, setGeneratedSchedule] = useState<ScheduleItem[]>([]);

  const generateSchedule = () => {
    const [h, m] = wakeUpTime.split(":").map(Number);
    const schedule: ScheduleItem[] = [];

    // Format time helper
    const ft = (hr: number, mn: number) => {
      let dHr = hr;
      let dMn = mn;
      if (dMn >= 60) { dHr += Math.floor(dMn / 60); dMn %= 60; }
      if (dHr >= 24) dHr %= 24;
      return `${String(dHr).padStart(2, '0')}:${String(dMn).padStart(2, '0')}`;
    };

    const addMins = (hr: number, mn: number, minsToAdd: number) => {
      return [hr + Math.floor((mn + minsToAdd) / 60), (mn + minsToAdd) % 60];
    };

    let currH = h; let currM = m;

    schedule.push({ time: `${ft(currH, currM)} - ${ft(currH, currM + 15)}`, title: "Dậy & Vệ sinh cá nhân", desc: "Uống 1 cốc nước lọc lúc bụng đói", type: "rest" });
    [currH, currM] = addMins(currH, currM, 15);

    schedule.push({ time: `${ft(currH, currM)} - ${ft(currH, currM + 30)}`, title: "Ăn sáng dinh dưỡng đầy đủ", desc: "Nạp năng lượng tuyệt đối cho cơ thể", type: "rest" });
    [currH, currM] = addMins(currH, currM, 30);

    // Sáng
    if (schoolShift === "Chỉ buổi Sáng" || schoolShift === "Sáng & Chiều") {
      schedule.push({ time: `07:00 - 11:00`, title: "Học trên trường (Ca Sáng)", desc: "Tập trung chú ý cô giáo, làm luôn bài tập về nhà lúc rảnh", type: "school" });
      currH = 11; currM = 0;
    } else {
      schedule.push({ time: `${ft(currH, currM)} - ${ft(currH, currM + 90)}`, title: "Khối 1: Nghe & Đọc Aptis", desc: "90 phút cực kỳ tập trung não bộ ưu tiên số 1", type: "aptis" });
      let [nH, nM] = addMins(currH, currM, 90);

      schedule.push({ time: `${ft(nH, nM)} - ${ft(nH, nM + 15)}`, title: "Nghỉ giải lao (Power Break)", desc: "Đi dạo, không nhìn màn hình 15p", type: "rest" });
      [nH, nM] = addMins(nH, nM, 15);

      schedule.push({ time: `${ft(nH, nM)} - ${ft(nH, nM + 60)}`, title: "Khối 2: Từ Vựng Trắc Nghiệm", desc: "60 phút nạp từ vựng chuyên ngành", type: "aptis" });
      [nH, nM] = addMins(nH, nM, 60);

      let totalMinsTo11 = (11 * 60) - (nH * 60 + nM);
      if (totalMinsTo11 > 0) {
        schedule.push({ time: `${ft(nH, nM)} - 11:00`, title: "Tự học / Làm bài tập trường", desc: "Giải quyết bài tập về nhà", type: "school" });
      }
      currH = 11; currM = 0;
    }

    // Trưa
    schedule.push({ time: `11:00 - 13:00`, title: "Ăn trưa & Ngủ trưa", desc: "Từ 11h đến 1h: Ăn trưa vừa đủ, bắt buộc ngủ 20-30p để não tỉnh táo", type: "rest" });
    currH = 13; currM = 0;

    // Chiều
    if (schoolShift === "Chỉ buổi Chiều" || schoolShift === "Sáng & Chiều") {
      schedule.push({ time: `13:00 - 17:00`, title: "Học trên trường (Ca Chiều)", desc: "Tập trung và cố gắng rà soát lại bài", type: "school" });
      currH = 17; currM = 0;
    } else if (schoolShift === "Chỉ buổi Sáng") {
      schedule.push({ time: `13:00 - 14:30`, title: "Khối 1: Nghe & Đọc Aptis", desc: "90 phút tập trung trưa vắng lặng", type: "aptis" });
      schedule.push({ time: `14:30 - 14:45`, title: "Nghỉ giải lao (Power Break)", desc: "Đứng dậy đi lại, giãn cơ 15p", type: "rest" });
      schedule.push({ time: `14:45 - 15:45`, title: "Khối 2: Từ Vựng Aptis", desc: "60 phút nạp từ mới liên tục", type: "aptis" });
      schedule.push({ time: `15:45 - 17:00`, title: "Tự học tuỳ chọn / IT", desc: "Thư giãn hoặc code dự án phụ", type: "rest" });
      currH = 17; currM = 0;
    } else {
      // Nghỉ nhà, sáng đã học Khối 1 & 2
      schedule.push({ time: `13:00 - 15:00`, title: "Khối 3: Luyện Nói & Viết Aptis", desc: "120 phút tư duy Output", type: "aptis" });
      schedule.push({ time: `15:00 - 17:00`, title: "Tự học tuỳ chọn / IT", desc: "Đã xong Aptis, giờ có thể tự học kiến thức khác", type: "rest" });
      currH = 17; currM = 0;
    }

    // Tối
    schedule.push({ time: `17:00 - 18:30`, title: "Thể dục, Tắm & Ăn tối", desc: "Lấy lại năng lượng sau 1 ngày dài", type: "rest" });
    currH = 18; currM = 30;

    if (urgentTask) {
      schedule.push({ time: `${ft(currH, currM)} - ${ft(currH + 1, currM)}`, title: `Xử lý BÀI TẬP GẤP: ${urgentTask}`, desc: "Chốt deadline trường lớp khẩn cấp", type: "urgent" });
      currH += 1;
    }

    if (schoolShift === "Sáng & Chiều") {
      schedule.push({ time: `${ft(currH, currM)} - ${ft(currH, currM + 90)}`, title: "Khối 1: Nghe & Đọc Aptis", desc: "90 phút luyện đề nhanh", type: "aptis" });
      [currH, currM] = addMins(currH, currM, 90);

      schedule.push({ time: `${ft(currH, currM)} - ${ft(currH, currM + 15)}`, title: "Nghỉ giải lao (Power Break)", desc: "Giãn mắt 15 phút", type: "rest" });
      [currH, currM] = addMins(currH, currM, 15);

      schedule.push({ time: `${ft(currH, currM)} - ${ft(currH, currM + 60)}`, title: "Khối 2: Từ Vựng Aptis", desc: "60 phút dồn từ vựng", type: "aptis" });
      [currH, currM] = addMins(currH, currM, 60);

      schedule.push({ time: `${ft(currH, currM)} - ${ft(currH, currM + 15)}`, title: "Nghỉ giải lao (Power Break)", desc: "Đứng dậy đi lại 15p", type: "rest" });
      [currH, currM] = addMins(currH, currM, 15);

      schedule.push({ time: `${ft(currH, currM)} - ${ft(currH + 2, currM)}`, title: "Khối 3: Luyện Nói & Viết Aptis", desc: "120 phút tư duy Output cuối ngày", type: "aptis" });
      [currH, currM] = addMins(currH, currM, 120);
    } else if (schoolShift === "Chỉ buổi Sáng" || schoolShift === "Chỉ buổi Chiều") {
      schedule.push({ time: `${ft(currH, currM)} - ${ft(currH + 2, currM)}`, title: "Khối 3: Luyện Nói & Viết Aptis", desc: "120 phút tư duy Output luyện phản xạ", type: "aptis" });
      [currH, currM] = addMins(currH, currM, 120);
    } else {
      // Rảnh cả sáng chiều đã cày hết 4.5 tiếng Aptis
      let endH = currH + 2;
      schedule.push({ time: `${ft(currH, currM)} - ${ft(endH, currM)}`, title: "Làm bài tập trường / Thư giãn", desc: "Bạn quá đỉnh, hãy xem lại bài hoặc nghỉ ngơi", type: "rest" });
      currH += 2;
    }

    // Tính toán giờ cần phải đi ngủ
    const totalMinsToSleep = 6 * 60 + 15; // 6h + 15m
    let bedH = h - Math.floor(totalMinsToSleep / 60);
    let bedM = m - (totalMinsToSleep % 60);
    if (bedM < 0) { bedM += 60; bedH -= 1; }
    if (bedH < 0) { bedH += 24; }

    // Khoảng thời gian từ khi xong việc đến lúc đi ngủ
    const currTotalMins = currH * 60 + currM;
    let bedTotalMins = bedH * 60 + bedM;
    if (bedTotalMins < currTotalMins && bedTotalMins < 12 * 60) {
      bedTotalMins += 24 * 60; // Ngủ quá nửa đêm
    }

    if (bedTotalMins > currTotalMins) {
      schedule.push({ time: `${ft(currH, currM)} - ${ft(bedH, bedM)}`, title: "Thư giãn tự do", desc: "Để não bộ xả hơi hoàn toàn, không làm việc nữa", type: "rest" });
    }

    // Ngủ
    schedule.push({ time: `${ft(bedH, bedM)} - Sáng mai`, title: "Vệ sinh cá nhân, Night Plan & Ngủ sâu", desc: "Chuẩn bị kế hoạch cho hôm sau & lên giường nghỉ ngơi", type: "rest" });

    setGeneratedSchedule(schedule);
    setPlanStep(3);

    // Lưu tạm schedule sinh ra (chưa reset blocks để không ghi đè tiến độ hnay)
  };

  const handleSleepConfirmation = () => {
    // 1. Phân tích kết quả thực hiện của ngày hôm nay
    if (blocks.some(b => b.completed) || isActive) {
      // Nếu hôm nay có chơi/học, tiến hành đánh giá
      const allDone = blocks.every(b => b.completed);
      let newStars = stars;
      let newFailed = failedDays;
      if (allDone) {
        newStars += 1;
        speakAnnounce("Chúc mừng anh đã hoàn thành xuất sắc mục tiêu hôm nay. Được cộng 1 sao hoàn hảo! Chúc anh ngủ ngon.");
      } else {
        newFailed += 1;
        speakAnnounce("Hôm nay anh chưa hoàn thành 100 phần trăm mục tiêu. Đã đánh dấu chưa hoàn thiện! Hãy cố gắng phục thù vào ngày kế tiếp nhé! Chúc anh ngủ ngon.");
      }
      setStars(newStars);
      setFailedDays(newFailed);

      syncAndBroadcast({
        schedule: generatedSchedule,
        blocks: INITIAL_BLOCKS,
        activeBlockIndex: 0,
        timeLeft: 0,
        isActive: false,
        isPausedDay: false,
        stars: newStars,
        failed_days: newFailed
      });
    } else {
      // Chỉ setup lịch mai mà hôm nay chưa đụng vô block nào thì không trừ điểm
      syncAndBroadcast({
        schedule: generatedSchedule,
        blocks: INITIAL_BLOCKS,
        activeBlockIndex: 0,
        timeLeft: 0,
        isActive: false,
        isPausedDay: false
      });
    }

    setPlanStep(0);
    setIsPlanning(false);
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setCurrentDateTime(new Date());
    const dtInterval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    const loadVoices = () => {
      if (typeof window !== "undefined" && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        const vi = voices.filter(v => v.lang.includes('vi'));
        // Ưu tiên lên đầu các giọng nữ như HoaiMy (Edge), Google Tiếng Việt (Chrome), Linh (Apple)
        vi.sort((a, b) => {
          const aFemale = a.name.includes('HoaiMy') || a.name.includes('Google') || a.name.toLowerCase().includes('female') || a.name.includes('Linh');
          const bFemale = b.name.includes('HoaiMy') || b.name.includes('Google') || b.name.toLowerCase().includes('female') || b.name.includes('Linh');
          if (aFemale && !bFemale) return -1;
          if (!aFemale && bFemale) return 1;
          return 0;
        });
        setViVoices(vi);
      }
    };
    loadVoices();
    if (typeof window !== "undefined" && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => clearInterval(dtInterval);
  }, []);

  const formatRealTime = (d: Date | null) => {
    if (!d) return "";
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} • ${days[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  };

  const speakAnnounce = (message: string) => {
    if (typeof window !== "undefined" && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any currently playing audio

      const msg = new SpeechSynthesisUtterance();
      msg.text = message;
      msg.lang = 'vi-VN';
      msg.rate = 1.0;
      msg.pitch = 1.3;

      const voices = window.speechSynthesis.getVoices();
      // Ưu tiên các giọng nữ của tiếng Việt. Google Tiếng Việt thường là giọng nữ chuẩn.
      let viVoice = voices.find(v => v.name === 'Google Tiếng Việt')
        || voices.find(v => v.lang === 'vi-VN' && (v.name.includes('Female') || v.name.includes('Lieu')))
        || voices.find(v => v.lang.includes('vi'));

      if (viVoice) {
        msg.voice = viVoice;
      }

      window.speechSynthesis.speak(msg);
    }
  };

  // Automatic Night Plan Prompt at 22:00
  useEffect(() => {
    if (!isMounted) return;

    const checkTime = () => {
      const now = new Date();
      // Nếu đúng 22:00 (hoặc 10:00 PM) app sẽ tự động bật popup lên
      if (now.getHours() === 22 && now.getMinutes() === 0) {
        setIsPlanning(true);
      }
    };

    const interval = setInterval(checkTime, 60000); // Check every minute
    checkTime(); // Check immediately on mount

    return () => clearInterval(interval);
  }, [isMounted]);

  // Update total progress
  const completedMinutes = blocks
    .filter((b) => b.completed)
    .reduce((acc, curr) => acc + curr.durationMins, 0);

  // Initialize timer for active block
  useEffect(() => {
    if (activeBlockIndex < blocks.length && !blocks[activeBlockIndex].completed && !isActive && timeLeft === 0) {
      setTimeLeft(blocks[activeBlockIndex].durationMins * 60);
    }
  }, [activeBlockIndex, blocks, isActive, timeLeft]);

  // Handle countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + timeLeft * 1000;
      }
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current! - Date.now()) / 1000));
        setTimeLeft(remaining);
      }, 500);
    } else if (isActive && timeLeft === 0) {
      // Block finished
      endTimeRef.current = null;
      setIsActive(false);

      // Announce with Speech Synthesis
      const nextTime = new Date();
      nextTime.setMinutes(nextTime.getMinutes() + 15);
      const hStr = nextTime.getHours();
      const mStr = nextTime.getMinutes();

      speakAnnounce(`Anh đã hoàn thành xong chu kỳ ${blocks[activeBlockIndex].title}. Anh hãy nghỉ ngơi 15 phút, rồi bắt đầu chu kỳ kế tiếp vào lúc ${hStr} giờ, ${mStr} phút nhé.`);

      markBlockCompleted(activeBlockIndex);

      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log("Audio logic block:", e));
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, activeBlockIndex]); // Remove extra deps to avoid re-renders disrupting timer

  // Handle Dynamic Rescheduling
  const handleResumeAndRecalculate = () => {
    setIsPausedDay(false);
    setIsActive(true);
    speakAnnounce("Đã nhận lệnh về nhà. Hệ thống tái dàn trải quỹ thời gian đến giờ ngủ khoa học thành công.");

    const now = new Date();
    let currH = now.getHours();
    let currM = now.getMinutes();

    const ft = (hr: number, mn: number) => {
      let dHr = hr; let dMn = mn;
      if (dMn >= 60) { dHr += Math.floor(dMn / 60); dMn %= 60; }
      if (dHr >= 24) dHr %= 24;
      return `${String(dHr).padStart(2, '0')}:${String(dMn).padStart(2, '0')}`;
    };
    const addMins = (hr: number, mn: number, minsToAdd: number) => {
      return [hr + Math.floor((mn + minsToAdd) / 60), (mn + minsToAdd) % 60];
    };

    const bedStr = generatedSchedule.find(s => s.time.includes("Sáng mai"))?.time.split(" - ")[0];
    let bedH = 23, bedM = 45;
    if (bedStr) {
      bedH = parseInt(bedStr.split(":")[0]);
      bedM = parseInt(bedStr.split(":")[1]);
    }

    let currTotal = currH * 60 + currM;
    let bedTotal = bedH * 60 + bedM;
    if (bedTotal < currTotal && bedTotal < 12 * 60) {
      bedTotal += 24 * 60;
    }

    let remainingAptisMins = Math.ceil(timeLeft / 60);
    for (let i = activeBlockIndex + 1; i < blocks.length; i++) {
      remainingAptisMins += blocks[i].durationMins;
    }

    let remainingRealMins = bedTotal - currTotal;
    let newSchedule: ScheduleItem[] = [];

    let updatedBlocks = [...blocks];
    let newActiveIndex = activeBlockIndex;
    let newTimeLeft = timeLeft;

    if (remainingRealMins > remainingAptisMins) {
      let totalBreakMins = remainingRealMins - remainingAptisMins;
      let numBreaks = blocks.length - activeBlockIndex;
      let breakPerBlock = numBreaks > 0 ? Math.floor(totalBreakMins / numBreaks) : 0;
      if (breakPerBlock > 45) breakPerBlock = 45;

      for (let i = activeBlockIndex; i < blocks.length; i++) {
        let bDuration = (i === activeBlockIndex) ? Math.ceil(timeLeft / 60) : blocks[i].durationMins;
        newSchedule.push({ time: `${ft(currH, currM)} - ${ft(currH, currM + bDuration)}`, title: `Tiếp Tục: ${blocks[i].title}`, desc: "Khối thời gian linh hoạt", type: "aptis" });
        [currH, currM] = addMins(currH, currM, bDuration);

        if (i < blocks.length - 1 || breakPerBlock > 0) {
          newSchedule.push({ time: `${ft(currH, currM)} - ${ft(currH, currM + breakPerBlock)}`, title: "Nghỉ giải lao (Auto)", desc: `Dãn cách ${breakPerBlock} phút trải đều lịch`, type: "rest" });
          [currH, currM] = addMins(currH, currM, breakPerBlock);
        }
      }

      let cTot = currH * 60 + currM;
      if (cTot < bedTotal && bedTotal - cTot <= 24 * 60) {
        newSchedule.push({ time: `${ft(currH, currM)} - ${ft(bedH, bedM)}`, title: "Thư giãn tự do", desc: "Xả hơi bù", type: "rest" });
      }
    } else {
      // Not enough time, crunch them and drop if necessary
      let availableMins = remainingRealMins;
      let droppedBlocksCount = 0;

      for (let i = activeBlockIndex; i < blocks.length; i++) {
        let bDuration = (i === activeBlockIndex) ? Math.ceil(timeLeft / 60) : blocks[i].durationMins;

        if (availableMins - bDuration >= 0) {
          newSchedule.push({ time: `${ft(currH, currM)} - ${ft(currH, currM + bDuration)}`, title: `Ép tiến độ: ${blocks[i].title}`, desc: "Chạy đua thời gian", type: "urgent" });
          [currH, currM] = addMins(currH, currM, bDuration);
          availableMins -= bDuration;

          if (i < blocks.length - 1 && availableMins >= 5) {
            newSchedule.push({ time: `${ft(currH, currM)} - ${ft(currH, currM + 5)}`, title: "Giải lao nhanh", desc: "5 phút", type: "rest" });
            [currH, currM] = addMins(currH, currM, 5);
            availableMins -= 5;
          }
        } else {
          // Drop block
          droppedBlocksCount++;
          updatedBlocks[i].completed = true;
        }
      }

      let cTot = currH * 60 + currM;
      if (cTot < bedTotal && bedTotal - cTot <= 24 * 60) {
        newSchedule.push({ time: `${ft(currH, currM)} - ${ft(bedH, bedM)}`, title: "Thư giãn tự do", desc: `Xả hơi ${bedTotal - cTot} phút lẻ còn lại`, type: "rest" });
      }

      if (droppedBlocksCount > 0) {
        speakAnnounce(`Vì thời gian đã trễ, hệ thống tự động loại bỏ ${droppedBlocksCount} chu kỳ học tiếp theo để ép anh đi ngủ đúng giờ, tuyệt đối đảm bảo sức khỏe.`);
        setBlocks(updatedBlocks);

        while (newActiveIndex < updatedBlocks.length && updatedBlocks[newActiveIndex].completed) {
          newActiveIndex++;
        }
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
      }
    }

    newSchedule.push({ time: `${ft(bedH, bedM)} - Sáng mai`, title: "Vệ sinh cá nhân, Night Plan & Ngủ sâu", desc: "Lên giường ngủ nghỉ đúng giờ", type: "rest" });

    setGeneratedSchedule(newSchedule);
    syncAndBroadcast({
      blocks: updatedBlocks,
      activeBlockIndex: newActiveIndex,
      isActive: newActiveIndex < updatedBlocks.length,
      isPausedDay: false,
      timeLeft: newTimeLeft,
      schedule: newSchedule
    });
  };


  const markBlockCompleted = (index: number) => {
    const newBlocks = [...blocks];
    newBlocks[index].completed = true;
    setBlocks(newBlocks);

    // Reward a silver star
    const newSilverStars = silverStars + 1;
    setSilverStars(newSilverStars);
    speakAnnounce(`Chúc mừng anh. Đã hoàn thành một chu kỳ học thành công. Được cộng 1 sao bạc vào quỹ thành tích.`);

    let nextIndex = index;
    // Auto move to next block if available
    if (index + 1 < blocks.length) {
      nextIndex = index + 1;
      setActiveBlockIndex(nextIndex);
      setTimeLeft(newBlocks[nextIndex].durationMins * 60);
    }
    syncAndBroadcast({ blocks: newBlocks, activeBlockIndex: nextIndex, silverStars: newSilverStars });
  };

  const toggleTimer = () => {
    if (activeBlockIndex >= blocks.length || isPausedDay) return; // All done
    const newIsActive = !isActive;
    setIsActive(newIsActive);
    if (!newIsActive) endTimeRef.current = null;
    syncAndBroadcast({ isActive: newIsActive, timeLeft });
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercentage = (completedMinutes / TARGET_MINUTES) * 100;
  const currentBlock = blocks[activeBlockIndex];
  const allCompleted = completedMinutes >= TARGET_MINUTES;

  if (!isMounted) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans relative">
        <div className="absolute top-6 left-6 opacity-40 hover:opacity-100 transition-opacity">
          <h3 className="font-mono text-xs tracking-[0.3em] text-blue-400">MINHPHATVILLA</h3>
        </div>
        <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h1 className="text-4xl font-light text-center tracking-widest text-blue-50">APTIS<span className="font-bold text-blue-600">SYNC</span></h1>
          <p className="text-gray-400 text-center text-sm font-mono tracking-wide">Sync Đa Thiết Bị • Realtime</p>
          <form onSubmit={handleAuth} className="space-y-4 mt-8">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="w-full px-5 py-4 bg-gray-900 border border-gray-800 rounded-xl focus:border-blue-500 text-white focus:outline-none placeholder:text-gray-600 shadow-[0_4px_10px_rgba(0,0,0,0.5)] h-14" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu" required className="w-full px-5 py-4 bg-gray-900 border border-gray-800 rounded-xl focus:border-blue-500 text-white focus:outline-none placeholder:text-gray-600 shadow-[0_4px_10px_rgba(0,0,0,0.5)] h-14" />
            <button type="submit" disabled={authLoading} className="w-full h-14 bg-blue-600 outline outline-4 outline-blue-900/30 text-white rounded-xl font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:bg-blue-500 hover:-translate-y-1 transition-all flex justify-center items-center mt-6">
              {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "VÀO HỆ THỐNG"}
            </button>
          </form>
          <p className="text-xs text-gray-500 text-center font-mono mt-4">Chưa có tài khoản? App sẽ tự động tạo mới bảo mật.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] max-w-lg mx-auto w-full pt-6 relative px-4 md:px-0">

      {/* Realtime Clock Header */}
      {currentDateTime && (
        <div className="absolute top-0 w-full left-0 right-0 flex justify-center py-2 z-10 pointer-events-none">
          <div className="flex items-center text-blue-300/80 bg-blue-950/20 px-4 py-1.5 rounded-full border border-blue-900/30 backdrop-blur-sm drop-shadow-[0_0_10px_rgba(59,130,246,0.1)]">
            <Clock className="w-3.5 h-3.5 mr-2 opacity-80" />
            <span className="font-mono text-[11px] md:text-xs font-bold tracking-widest">{formatRealTime(currentDateTime)}</span>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex justify-between items-center mb-8 pt-8">
        <div>
          <p className="text-[10px] uppercase font-mono tracking-[0.3em] text-blue-500/80 mb-1.5 flex gap-3">
            <span>Powered by MINH PHÁT VILLA</span>
          </p>
          <div className="flex items-center">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white uppercase flex items-center">
              Aptis Intensive <span className="ml-3 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"></span>
            </h1>
          </div>
          <div className="flex gap-4 mt-2">
            <p className="text-blue-500/70 text-xs md:text-sm tracking-widest uppercase font-mono bg-blue-900/20 px-2 py-0.5 rounded border border-blue-900/50">Countdown: 21 Days</p>
            <div className="flex gap-2">
              <span className="text-yellow-500 text-xs md:text-sm tracking-widest uppercase font-mono bg-yellow-900/20 px-2 py-0.5 rounded border border-yellow-900/50 flex items-center">🥇 {stars} Vàng</span>
              <span className="text-gray-300 text-xs md:text-sm tracking-widest uppercase font-mono bg-gray-800/40 px-2 py-0.5 rounded border border-gray-600/50 flex items-center">🥈 {silverStars} Bạc</span>
              <span className="text-red-500 text-xs md:text-sm tracking-widest uppercase font-mono bg-red-900/20 px-2 py-0.5 rounded border border-red-900/50 flex items-center">❌ {failedDays} Nợ</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block mr-4 text-right">
            <p className="text-[10px] uppercase font-mono tracking-[0.2em] text-blue-500/50">Powered by</p>
            <p className="text-xs font-bold tracking-widest text-blue-300/80">MINH PHÁT VILLA</p>
          </div>
          <button
            onClick={() => {
              if (viVoices.length > 0) {
                const nextIdx = (selectedVoiceIndex + 1) % viVoices.length;
                setSelectedVoiceIndex(nextIdx);

                const tester = new SpeechSynthesisUtterance();
                tester.text = `Đã đổi sang giọng ${viVoices[nextIdx].name}`;
                tester.lang = 'vi-VN';
                tester.rate = 1.0; tester.pitch = 1.25;
                tester.voice = viVoices[nextIdx];
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(tester);
              } else {
                speakAnnounce("Chưa nạp thành công giọng nói Tiếng Việt.");
              }
            }}
            className="bg-blue-950/40 text-blue-400 p-3.5 rounded-xl hover:bg-blue-900/60 border border-blue-900/50 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all"
            title="Đổi giọng nói (Test Audio)"
          >
            <BellRing className="w-5 h-5 md:w-5 md:h-5" />
          </button>

          <button
            onClick={() => {
              const hour = currentDateTime?.getHours() || 0;
              if (hour >= 21 || hour < 4) {
                setIsPlanning(true);
              } else {
                speakAnnounce("App chỉ cho phép lập Night Plan vào buổi tối từ 21 giờ, hoặc rạng sáng hệ thống nhé.");
              }
            }}
            className={`p-3.5 rounded-xl border transition-all ${(currentDateTime && (currentDateTime.getHours() >= 21 || currentDateTime.getHours() < 4))
              ? "bg-blue-950/40 text-blue-400 border-blue-900/50 hover:bg-blue-900/60 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              : "bg-gray-900/40 text-gray-500 border-gray-800/50 cursor-pointer"
              }`}
            title="5-Min Night Plan"
          >
            <MoonStar className="w-5 h-5 md:w-5 md:h-5" />
          </button>

          <button
            onClick={() => supabase.auth.signOut()}
            className="bg-red-950/40 text-red-400 p-3.5 rounded-xl hover:bg-red-900/60 border border-red-900/50 hover:border-red-500 transition-all opacity-70 hover:opacity-100"
            title="Đăng Xuất"
          >
            <LogOut className="w-5 h-5 md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      {/* Main Circular Progress & Timer */}
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto pb-10 w-full [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-blue-900">
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 flex flex-col items-center justify-center shrink-0 drop-shadow-[0_0_30px_rgba(59,130,246,0.15)] mt-4">

          {/* SVG Progress Circle */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            {/* Background track */}
            <circle
              cx="50%"
              cy="50%"
              r="46%"
              className="fill-none stroke-blue-950/40"
              strokeWidth="4"
            />
            {/* Filled progress */}
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

          {/* Inner Text */}
          <div className="flex flex-col items-center text-center z-10">
            {isActive ? (
              // Countdown State
              <div className="animate-in fade-in zoom-in duration-300">
                <p className="text-blue-300/80 text-xs md:text-sm uppercase tracking-widest mb-3 font-mono">
                  {currentBlock?.title}
                </p>
                <div className="text-6xl md:text-7xl font-light tracking-tighter font-mono text-white mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                  {formatTime(timeLeft)}
                </div>
              </div>
            ) : (
              // Progress State
              <div className="animate-in fade-in zoom-in duration-300">
                <p className="text-gray-500 text-xs md:text-sm uppercase tracking-widest mb-1 font-mono">Aptis Target</p>
                <div className="text-5xl md:text-6xl font-bold tracking-tighter text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                  {completedMinutes} <span className="text-2xl md:text-3xl text-gray-500 font-normal">/ {TARGET_MINUTES}</span>
                </div>
                <p className="text-blue-500/70 text-sm mt-1 font-mono">mins</p>
              </div>
            )}
          </div>
        </div>

        {/* Start / Pause Button */}
        <div className="mt-14 w-full flex flex-col items-center">
          {!allCompleted ? (
            <button
              onClick={toggleTimer}
              disabled={isPausedDay}
              className={`w-full max-w-[320px] px-8 py-5 rounded-2xl flex items-center justify-center transition-all duration-300 ${isPausedDay ? 'opacity-30 cursor-not-allowed grayscale' : ''} ${isActive
                ? "bg-transparent border border-blue-500/40 text-blue-300 hover:bg-blue-950/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                : "bg-blue-600 border border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:bg-blue-500 hover:scale-105 active:scale-95"
                }`}
            >
              <span className="font-bold tracking-wider text-base md:text-lg mr-3">
                {isActive ? "TẠM DỪNG BLOCK" : `BẮT ĐẦU BLOCK ${currentBlock?.id}`}
              </span>
              {isActive ? <Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" /> : <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
            </button>
          ) : (
            <div className="flex items-center text-blue-400 border border-blue-500/30 bg-blue-500/10 px-8 py-5 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <CheckCircle className="w-6 h-6 mr-3" />
              <span className="font-bold tracking-wider text-base md:text-lg">Đã hoàn thành xuất sắc!</span>
            </div>
          )}

          {/* Dynamic Rescheduling Options */}
          {!allCompleted && (
            <div className="w-full max-w-[320px] flex gap-3 mt-4">
              {!isPausedDay ? (
                <button
                  onClick={() => {
                    setIsActive(false); setIsPausedDay(true);
                    endTimeRef.current = null;
                    speakAnnounce("Hệ thống đã tạm dừng. Bạn cứ an tâm đi giải quyết việc đột xuất nhé.");
                    syncAndBroadcast({ isActive: false, isPausedDay: true, timeLeft });
                  }}
                  className="flex-1 bg-gray-900/80 border border-gray-800 py-3 rounded-xl flex justify-center items-center text-gray-400 font-mono text-xs hover:bg-gray-800 transition-colors"
                >
                  <Pause className="w-3.5 h-3.5 mr-2" /> BẬN ĐỘT XUẤT
                </button>
              ) : (
                <button
                  onClick={handleResumeAndRecalculate}
                  className="flex-1 bg-blue-900/40 border border-blue-500/50 py-3 rounded-xl flex justify-center items-center text-blue-300 font-mono text-xs hover:bg-blue-800 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-2" /> ĐÃ VỀ, LÀM LẠI
                </button>
              )}
            </div>
          )}
        </div>

        {/* Schedule / Mini block list under */}
        <div className="mt-12 w-full max-w-[360px] space-y-4 px-4 pb-12">
          {(() => {
            let listToRender = generatedSchedule as any[];
            const now = currentDateTime || new Date();
            let currH = now.getHours();
            let currM = now.getMinutes();
            const currentTotal = currH * 60 + currM;

            if (listToRender.length > 0) {
              // Filter out past items from the generated plan
              listToRender = listToRender.filter(item => {
                const matchAptis = blocks.find(b => item.title.includes(b.title));
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
            } else {
              // Generate fallback dynamic timeline if no schedule exists
              const schedule: any[] = [];
              const ft = (hr: number, mn: number) => {
                let dHr = hr; let dMn = mn;
                if (dMn >= 60) { dHr += Math.floor(dMn / 60); dMn %= 60; }
                if (dHr >= 24) dHr %= 24;
                return `${String(dHr).padStart(2, '0')}:${String(dMn).padStart(2, '0')}`;
              };
              const addMins = (hr: number, mn: number, minsToAdd: number) => {
                return [hr + Math.floor((mn + minsToAdd) / 60), (mn + minsToAdd) % 60];
              };

              blocks.forEach((block, i) => {
                if (block.completed) {
                  schedule.push({ time: "Hoàn thành", title: block.title, desc: `${block.durationMins} phút • Đã xong`, type: "completed", completed: true });
                } else {
                  let bDuration = (i === activeBlockIndex && timeLeft > 0) ? Math.ceil(timeLeft / 60) : block.durationMins;
                  let tStart = `${ft(currH, currM)}`;
                  [currH, currM] = addMins(currH, currM, bDuration);
                  let tEnd = `${ft(currH, currM)}`;
                  schedule.push({
                    time: `${tStart} - ${tEnd}`,
                    title: block.title,
                    desc: i === activeBlockIndex ? (isActive ? "Đang chạy..." : "Sắp tới lượt") : `Ước tính ${bDuration} phút`,
                    type: "aptis",
                    isActive: i === activeBlockIndex
                  });
                }
              });
              listToRender = schedule;
            }

            return listToRender.map((item, i) => (
              <div key={i} className={`flex flex-col mb-1 group hover:-translate-y-1 transition-transform ${item.completed ? 'opacity-60 saturate-50' : ''}`}>
                <div className="flex items-center mb-1">
                  <span className={`w-2.5 h-2.5 rounded-full mr-2 shadow-[0_0_8px_rgba(37,99,235,0.8)] ${item.completed ? 'bg-gray-500 shadow-none' : (item.isActive ? 'bg-blue-400 animate-pulse' : 'bg-blue-600')}`}></span>
                  <span className={`font-mono text-sm font-bold tracking-wider opacity-90 ${item.completed ? 'text-gray-400' : 'text-blue-300'}`}>
                    {item.time}
                  </span>
                </div>
                <div className={`ml-3.5 pl-4 border-l-2 py-2 ${item.type === 'aptis' ? 'border-blue-500/50' :
                  item.type === 'school' ? 'border-purple-500/50' :
                    item.type === 'urgent' ? 'border-red-500/50' :
                      item.completed ? 'border-gray-700/50' : 'border-gray-800'
                  }`}
                >
                  <div className={`p-3.5 rounded-xl border backdrop-blur-sm ${item.type === 'aptis' ? (item.isActive ? 'bg-blue-800/30 border-blue-400/50 text-blue-50 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-blue-900/20 border-blue-500/30 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.1)]') :
                    item.type === 'school' ? 'bg-purple-900/10 border-purple-500/20 text-purple-200' :
                      item.type === 'urgent' ? 'bg-red-900/10 border-red-500/20 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.1)]' :
                        item.completed ? 'bg-gray-900/30 border-gray-800/50 text-gray-400 line-through' : 'bg-transparent border-gray-800 text-gray-400'
                    }`}
                  >
                    <h4 className="font-bold text-sm md:text-base tracking-wide">{item.title}</h4>
                    {item.desc && <p className="text-xs mt-1.5 opacity-80 font-mono">{item.desc}</p>}
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* 5-Min Night Plan Modal Overlay */}
      <AnimatePresence>
        {isPlanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-xl"
          >
            <div className="flex-1 flex flex-col max-w-lg mx-auto w-full h-full relative pt-12 pb-10 px-4 md:px-0">
              <button
                onClick={() => { setIsPlanning(false); setPlanStep(0); }}
                className="absolute top-8 left-4 md:top-12 md:-left-4 z-[110] p-2 bg-gray-900/60 rounded-full text-gray-400 hover:text-white hover:bg-red-900/80 transition-colors"
                title="Đóng Kế Hoạch"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              <p className="text-blue-500 font-mono text-sm tracking-widest uppercase mb-4 opacity-80 pl-2">
                Lên Lịch • Câu {planStep + 1}/3
              </p>

              <AnimatePresence mode="wait">
                {planStep === 0 && (
                  <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                    <h2 className="text-3xl font-light text-blue-50 mb-8 leading-tight">Ngày mai có cần đi học ca nào trên trường không?</h2>
                    <div className="space-y-3">
                      {["Sáng & Chiều", "Chỉ buổi Sáng", "Chỉ buổi Chiều", "Nghỉ ở nhà"].map(opt => (
                        <button key={opt} onClick={() => { setSchoolShift(opt); setPlanStep(1); }} className="w-full text-left px-6 py-4 rounded-xl border border-blue-900 bg-blue-950/20 text-blue-200 hover:bg-blue-900/50 hover:border-blue-500 transition-all text-lg font-light">
                          {opt}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {planStep === 1 && (
                  <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                    <h2 className="text-3xl font-light text-blue-50 mb-8 leading-tight">Có bài tập nào gấp cần xử lý nộp cho cô luôn không?</h2>
                    <input autoFocus type="text" value={urgentTask} onChange={(e) => setUrgentTask(e.target.value)} placeholder="Gõ tên bài tập... (Bỏ trống nếu không có)" className="w-full bg-transparent border-b-2 border-blue-800 text-blue-100 text-xl py-4 focus:outline-none focus:border-blue-400 placeholder:text-blue-900 mb-8" />
                    <button onClick={() => setPlanStep(2)} className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-lg hover:bg-blue-500 transition-colors">
                      Tiếp theo
                    </button>
                  </motion.div>
                )}

                {planStep === 2 && (
                  <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                    <h2 className="text-3xl font-light text-blue-50 mb-6 leading-tight">Sáng mai gọi dậy lúc mấy giờ để bào Aptis?</h2>
                    <input type="time" value={wakeUpTime} onChange={(e) => setWakeUpTime(e.target.value)} className="w-full bg-blue-950/40 border border-blue-800 text-white text-5xl font-light p-6 rounded-2xl text-center focus:outline-none focus:border-blue-400 mb-6 style-time drop-shadow-[0_0_15px_rgba(59,130,246,0.1)]" style={{ colorScheme: "dark" }} />

                    {(() => {
                      const [h, m] = wakeUpTime.split(":").map(Number);
                      const getBedTime = (cycles: number) => {
                        const totalMins = cycles * 90 + 15; // 15 mins to fall asleep
                        let sleepH = h - Math.floor(totalMins / 60);
                        let sleepM = m - (totalMins % 60);
                        if (sleepM < 0) { sleepM += 60; sleepH -= 1; }
                        if (sleepH < 0) { sleepH += 24; }
                        return `${String(sleepH).padStart(2, '0')}:${String(sleepM).padStart(2, '0')}`;
                      };

                      return (
                        <div className="bg-blue-900/20 border border-blue-800/50 rounded-2xl p-5 mb-8 flex flex-col items-center shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                          <p className="text-blue-300/80 text-xs md:text-sm mb-3 font-medium uppercase tracking-wider font-mono text-center">Giờ đi ngủ khoa học (Đã fix 6 tiếng nước rút):</p>
                          <div className="flex flex-col items-center flex-1 bg-blue-600/20 px-8 py-3 rounded-xl border border-blue-500/40 shadow-[0_0_25px_rgba(59,130,246,0.3)]">
                            <span className="text-white font-mono font-bold text-4xl mb-1 tracking-tighter">{getBedTime(4)}</span>
                            <span className="text-blue-200 text-[11px] md:text-xs font-bold mt-1 uppercase tracking-widest text-center">4 Chu kỳ (6 Tiếng)<br /><span className="text-[10px] text-blue-400 font-normal">+ 15p Ru ngủ</span></span>
                          </div>
                        </div>
                      )
                    })()}

                    <button onClick={generateSchedule} className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-lg shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:bg-blue-500 transition-colors flex items-center justify-center">
                      Tạo Lịch Trình Tự Động <ChevronRight className="w-5 h-5 ml-2" />
                    </button>
                  </motion.div>
                )}

                {planStep === 3 && (
                  <motion.div
                    key="step4"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col h-[85vh] md:h-[80vh] overflow-hidden bg-black mt-2"
                  >
                    <h2 className="text-2xl font-bold text-blue-400 mb-2 uppercase tracking-widest flex items-center shrink-0">
                      <CheckCircle className="w-5 h-5 mr-2" /> Kế hoạch đã lập
                    </h2>
                    <p className="text-gray-400 mb-4 text-sm shrink-0">App đã dùng AI để chèn 4,5 tiếng tiếng Anh, giải quyết bài tập khẩn và sắp xếp nghỉ ngơi đúng tiêu chuẩn khoa học:</p>

                    <div className="overflow-y-auto space-y-4 pr-2 pb-32 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-blue-900 flex-1">
                      {generatedSchedule.map((item, i) => (
                        <div key={i} className="flex flex-col mb-1 group">
                          <div className="flex items-center mb-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2 shadow-[0_0_8px_rgba(37,99,235,0.8)]"></span>
                            <span className="font-mono text-sm text-blue-300 font-bold tracking-wider opacity-90">
                              {item.time}
                            </span>
                          </div>
                          <div className={`ml-3.5 pl-4 border-l-2 py-2 ${item.type === 'aptis' ? 'border-blue-500/50' :
                            item.type === 'school' ? 'border-purple-500/50' :
                              item.type === 'urgent' ? 'border-red-500/50' :
                                'border-gray-800'
                            }`}
                          >
                            <div className={`p-3.5 rounded-xl border ${item.type === 'aptis' ? 'bg-blue-900/20 border-blue-500/30 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.1)]' :
                              item.type === 'school' ? 'bg-purple-900/10 border-purple-500/20 text-purple-200' :
                                item.type === 'urgent' ? 'bg-red-900/10 border-red-500/20 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.1)]' :
                                  'bg-transparent border-gray-800 text-gray-400'
                              }`}
                            >
                              <h4 className="font-bold text-base md:text-lg tracking-wide">{item.title}</h4>
                              {item.desc && <p className="text-sm mt-1.5 opacity-80">{item.desc}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="absolute left-0 right-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent flex justify-center pb-6">
                      <button
                        onClick={handleSleepConfirmation}
                        className="w-full max-w-sm bg-blue-600 outline outline-4 outline-blue-900/30 text-white rounded-xl py-4 font-bold text-lg shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:bg-blue-500 hover:-translate-y-1 transition-all"
                      >
                        Xác nhận & Đi Ngủ
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />
    </div>
  );
}
