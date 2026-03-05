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
  const lastDayRef = useRef<string>(new Date().toDateString());

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

    await supabase.from('user_state').upsert(dbUpdates);
  };

  // Helper: reset toàn bộ state cho ngày mới
  const resetForNewDay = (preservedData?: { stars?: number; silver_stars?: number; failed_days?: number }) => {
    setBlocks(INITIAL_BLOCKS);
    setActiveBlockIndex(0);
    setTimeLeft(0);
    setIsPausedDay(false);
    setIsActive(false);
    setGeneratedSchedule([]);
    setPlanStep(0);
    endTimeRef.current = null;
    if (preservedData?.stars !== undefined) setStars(preservedData.stars);
    if (preservedData?.silver_stars !== undefined) setSilverStars(preservedData.silver_stars);
    if (preservedData?.failed_days !== undefined) setFailedDays(preservedData.failed_days);
    syncAndBroadcast({
      schedule: [],
      schedule_date: null,
      blocks: INITIAL_BLOCKS,
      activeBlockIndex: 0,
      timeLeft: 0,
      endTime: null,
      isActive: false,
      isPausedDay: false
    });
  };

  useEffect(() => {
    if (!user) return;

    // Load initial state
    const loadState = async () => {
      const { data } = await supabase.from('user_state').select('*').eq('id', user.id).single();
      if (data) {
        const today = new Date().toDateString();

        // Kiểm tra ngày mới: dùng schedule_date (ưu tiên) hoặc updated_at (fallback)
        let isNewDay = false;
        if (data.schedule_date) {
          isNewDay = new Date(data.schedule_date).toDateString() !== today;
        } else if (data.updated_at) {
          isNewDay = new Date(data.updated_at).toDateString() !== today;
        }

        // Kiểm tra bổ sung: nếu schedule có data nhưng blocks đã reset (tất cả uncompleted)
        // thì schedule cũ đang bị "mồ côi" → cần xoá
        // NGOẠI TRỪ: nếu schedule_date là hôm nay thì đây là Night Plan vừa tạo, blocks INITIAL là đúng
        const hasSchedule = data.schedule && Array.isArray(data.schedule) && data.schedule.length > 0;
        const blocksAreInitial = !data.blocks || (Array.isArray(data.blocks) && data.blocks.every((b: Block) => !b.completed));
        const scheduleDateIsToday = data.schedule_date && new Date(data.schedule_date).toDateString() === today;
        const isStaleSchedule = hasSchedule && blocksAreInitial && !data.is_active && !scheduleDateIsToday;

        if (isNewDay || isStaleSchedule) {
          // Ngày mới hoặc schedule cũ mồ côi: reset toàn bộ
          resetForNewDay({
            stars: data.stars,
            silver_stars: data.silver_stars,
            failed_days: data.failed_days
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
        if (hasSchedule) {
          setGeneratedSchedule(data.schedule);
          if (data.schedule.length > 0) setPlanStep(3);
        }

        // Tính lại timeLeft từ end_time tuyệt đối (chống lệch giờ giữa các thiết bị)
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

    const channel = supabase.channel(`sync_${user.id}`);

    channel.on('broadcast', { event: 'state_update' }, (payload) => {
      const newState = payload.payload;
      if (newState.blocks) setBlocks(newState.blocks);
      if (newState.activeBlockIndex !== undefined) setActiveBlockIndex(newState.activeBlockIndex);
      if (newState.isActive !== undefined) setIsActive(newState.isActive);
      if (newState.isPausedDay !== undefined) setIsPausedDay(newState.isPausedDay);
      if (newState.stars !== undefined) setStars(newState.stars);
      if (newState.silver_stars !== undefined) setSilverStars(newState.silver_stars);
      if (newState.failed_days !== undefined) setFailedDays(newState.failed_days);
      if (newState.schedule) {
        setGeneratedSchedule(newState.schedule);
        if (newState.schedule.length > 0) setPlanStep(3);
      }

      // Nhận end_time tuyệt đối từ thiết bị khác → tính lại timeLeft chính xác
      if (newState.endTime && newState.isActive) {
        const endMs = new Date(newState.endTime).getTime();
        const remaining = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
        setTimeLeft(remaining);
        endTimeRef.current = endMs;
      } else if (newState.endTime === null) {
        endTimeRef.current = null;
        if (newState.timeLeft !== undefined) setTimeLeft(newState.timeLeft);
      } else if (newState.timeLeft !== undefined) {
        setTimeLeft(newState.timeLeft);
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
    const schedule: ScheduleItem[] = [];

    // === KHUNG GIỜ CỐ ĐỊNH ===
    const BED_H = 23, BED_M = 45; // Giờ ngủ cố định

    // 1. SÁNG: 06:00 - 07:00 (Tất cả kịch bản)
    schedule.push({ time: "06:00 - 06:20", title: "Dậy & Vệ sinh cá nhân", desc: "Uống 1 cốc nước lọc lúc bụng đói • Rửa mặt, đánh răng", type: "rest" });
    schedule.push({ time: "06:20 - 07:00", title: "Ăn sáng dinh dưỡng đầy đủ", desc: "Nạp năng lượng cho cơ thể • Không dùng điện thoại khi ăn", type: "rest" });

    // 2. BUỔI SÁNG: 07:00 - 11:00
    const isFullDay = schoolShift === "Sáng & Chiều" || schoolShift === "Thứ 7 (Học cả ngày)";

    if (schoolShift === "Chỉ buổi Sáng" || isFullDay) {
      // Có trường buổi sáng
      schedule.push({ time: "07:00 - 11:00", title: "Học trên trường (Ca Sáng)", desc: "Tập trung chú ý thầy cô • Làm luôn bài tập khi rảnh", type: "school" });
    } else if (schoolShift === "Chỉ buổi Chiều") {
      // Sáng rảnh → Aptis Block 1 + 2
      schedule.push({ time: "07:00 - 08:30", title: "Block 1: Luyện Nghe & Đọc Hiểu", desc: "90 phút Deep Work • Não tỉnh táo nhất buổi sáng", type: "aptis" });
      schedule.push({ time: "08:30 - 08:45", title: "Nghỉ giải lao", desc: "15 phút • Đi lại, uống nước, KHÔNG nhìn màn hình", type: "rest" });
      schedule.push({ time: "08:45 - 09:45", title: "Block 2: Từ Vựng Trắc Nghiệm", desc: "60 phút nạp từ vựng chuyên ngành Aptis", type: "aptis" });
      schedule.push({ time: "09:45 - 10:00", title: "Nghỉ giải lao", desc: "15 phút • Giãn cơ, thư giãn mắt", type: "rest" });
      schedule.push({ time: "10:00 - 11:00", title: "Làm bài tập trường", desc: "60 phút • Giải quyết bài tập về nhà, deadline", type: "school" });
    } else {
      // Nghỉ nhà → Aptis Block 1 + 2
      schedule.push({ time: "07:00 - 08:30", title: "Block 1: Luyện Nghe & Đọc Hiểu", desc: "90 phút Deep Work • Não tỉnh táo nhất buổi sáng", type: "aptis" });
      schedule.push({ time: "08:30 - 08:45", title: "Nghỉ giải lao", desc: "15 phút • Đi lại, uống nước, KHÔNG nhìn màn hình", type: "rest" });
      schedule.push({ time: "08:45 - 09:45", title: "Block 2: Từ Vựng Trắc Nghiệm", desc: "60 phút nạp từ vựng chuyên ngành Aptis", type: "aptis" });
      schedule.push({ time: "09:45 - 10:00", title: "Nghỉ giải lao", desc: "15 phút • Giãn cơ, thư giãn mắt", type: "rest" });
      schedule.push({ time: "10:00 - 11:00", title: "Làm bài tập trường / Ôn tập", desc: "60 phút • Giải quyết bài tập, ôn lại kiến thức", type: "school" });
    }

    // 3. TRƯA: 11:00 - 13:00 (Tất cả kịch bản)
    schedule.push({ time: "11:00 - 12:00", title: "Ăn trưa", desc: "Ăn đủ chất, không ăn quá no • Tránh đồ chiên nhiều dầu", type: "rest" });
    schedule.push({ time: "12:00 - 13:00", title: "Nghỉ trưa", desc: "Ngủ 20-30 phút bắt buộc để não hồi phục • Đặt báo thức", type: "rest" });

    // 4. BUỔI CHIỀU: 13:00 - 17:00
    if (schoolShift === "Chỉ buổi Chiều" || isFullDay) {
      // Có trường buổi chiều
      schedule.push({ time: "13:00 - 17:00", title: "Học trên trường (Ca Chiều)", desc: "Tập trung và làm bài tập ngay tại lớp khi rảnh", type: "school" });
    } else if (schoolShift === "Chỉ buổi Sáng") {
      // Chiều rảnh (sáng đi học) → Aptis Block 1 + 2 + Bài tập
      schedule.push({ time: "13:00 - 14:30", title: "Block 1: Luyện Nghe & Đọc Hiểu", desc: "90 phút Deep Work • Buổi chiều yên tĩnh, tập trung cao", type: "aptis" });
      schedule.push({ time: "14:30 - 14:45", title: "Nghỉ giải lao", desc: "15 phút • Đứng dậy đi lại, giãn cơ", type: "rest" });
      schedule.push({ time: "14:45 - 15:45", title: "Block 2: Từ Vựng Trắc Nghiệm", desc: "60 phút nạp từ vựng mới liên tục", type: "aptis" });
      schedule.push({ time: "15:45 - 16:00", title: "Nghỉ giải lao", desc: "15 phút • Uống nước, ăn nhẹ nếu đói", type: "rest" });
      schedule.push({ time: "16:00 - 17:00", title: "Làm bài tập trường", desc: "60 phút • Hoàn thành bài tập về nhà, chuẩn bị bài ngày mai", type: "school" });
    } else {
      // Nghỉ nhà (sáng đã học Block 1 + 2) → Block 3
      schedule.push({ time: "13:00 - 15:00", title: "Block 3: Luyện Nói & Viết", desc: "120 phút Output • Luyện Speaking + Writing phản xạ", type: "aptis" });
      schedule.push({ time: "15:00 - 15:15", title: "Nghỉ giải lao", desc: "15 phút • Thư giãn sau block dài nhất", type: "rest" });
      schedule.push({ time: "15:15 - 17:00", title: "Tự học / Làm bài tập trường", desc: "105 phút • Bài tập về nhà, ôn tập, hoặc code dự án IT", type: "school" });
    }

    // 5. TỐI: 17:00 - 19:00 (Tất cả kịch bản)
    schedule.push({ time: "17:00 - 18:00", title: "Thể dục & Tắm rửa", desc: "Vận động 30-45p (chạy bộ, tập gym, đạp xe) • Tắm sạch sẽ", type: "rest" });
    schedule.push({ time: "18:00 - 19:00", title: "Ăn tối & Nghỉ ngơi", desc: "Ăn tối từ tốn • Nghỉ ngơi nhẹ trước khi học", type: "rest" });

    // 6. BUỔI TỐI: 19:00 - 23:45 (285 phút khả dụng)
    if (isFullDay) {
      // Cả ngày đi học (Sáng & Chiều / Thứ 7) → Tối phải cày hết 3 block Aptis
      // 19:00-23:30 = 270 phút. Aptis = 270 phút. Rất chặt!
      if (urgentTask) {
        // Có bài tập gấp: ép urgent 45p + rút gọn Block 3
        schedule.push({ time: "19:00 - 19:45", title: `Bài tập GẤP: ${urgentTask}`, desc: "45 phút • Xử lý deadline khẩn cấp trước", type: "urgent" });
        schedule.push({ time: "19:45 - 21:15", title: "Block 1: Luyện Nghe & Đọc Hiểu", desc: "90 phút Deep Work • Tập trung tối đa", type: "aptis" });
        schedule.push({ time: "21:15 - 21:25", title: "Nghỉ giải lao", desc: "10 phút • Đi lại nhanh, uống nước", type: "rest" });
        schedule.push({ time: "21:25 - 22:25", title: "Block 2: Từ Vựng Trắc Nghiệm", desc: "60 phút nạp từ vựng", type: "aptis" });
        schedule.push({ time: "22:25 - 23:30", title: "Block 3: Luyện Nói & Viết (Rút gọn)", desc: "65 phút Output • Rút gọn, tập trung Writing", type: "aptis" });
      } else {
        // Không urgent: 3 block đầy đủ + micro-break
        schedule.push({ time: "19:00 - 20:30", title: "Block 1: Luyện Nghe & Đọc Hiểu", desc: "90 phút Deep Work • Tập trung cao nhất buổi tối", type: "aptis" });
        schedule.push({ time: "20:30 - 20:40", title: "Nghỉ giải lao", desc: "10 phút • Đi lại, uống nước, KHÔNG lướt điện thoại", type: "rest" });
        schedule.push({ time: "20:40 - 21:40", title: "Block 2: Từ Vựng Trắc Nghiệm", desc: "60 phút nạp từ vựng chuyên ngành", type: "aptis" });
        schedule.push({ time: "21:40 - 21:50", title: "Nghỉ giải lao", desc: "10 phút • Giãn mắt, đi lại nhanh", type: "rest" });
        schedule.push({ time: "21:50 - 23:30", title: "Block 3: Luyện Nói & Viết", desc: "100 phút Output • Speaking + Writing (rút gọn 20p để có break)", type: "aptis" });
      }
      schedule.push({ time: "23:30 - 23:45", title: "Vệ sinh cá nhân & Chuẩn bị ngủ", desc: "15 phút • Đánh răng, rửa mặt, tắt đèn", type: "rest" });
    } else if (schoolShift === "Chỉ buổi Sáng") {
      // Sáng trường + Chiều Block 1,2 → Tối chỉ cần Block 3 + chu kỳ ôn tập
      if (urgentTask) {
        schedule.push({ time: "19:00 - 20:00", title: `Bài tập GẤP: ${urgentTask}`, desc: "60 phút • Xử lý deadline trường lớp khẩn cấp", type: "urgent" });
        schedule.push({ time: "20:00 - 20:15", title: "Nghỉ giải lao", desc: "15 phút • Đi lại, uống nước", type: "rest" });
        schedule.push({ time: "20:15 - 22:15", title: "Block 3: Luyện Nói & Viết", desc: "120 phút Output • Luyện Speaking + Writing phản xạ", type: "aptis" });
      } else {
        schedule.push({ time: "19:00 - 21:00", title: "Block 3: Luyện Nói & Viết", desc: "120 phút Output • Luyện Speaking + Writing phản xạ", type: "aptis" });
        schedule.push({ time: "21:00 - 21:15", title: "Nghỉ giải lao", desc: "15 phút • Đi lại, giãn cơ, thư giãn mắt", type: "rest" });
        schedule.push({ time: "21:15 - 22:00", title: "Ôn bài trường / Tự học", desc: "45 phút • Ôn lại bài đã học, chuẩn bị cho ngày mai", type: "school" });
      }
      schedule.push({ time: "22:00 - 22:15", title: "Nghỉ giải lao", desc: "15 phút • Giãn cơ, thư giãn", type: "rest" });
      schedule.push({ time: "22:15 - 23:15", title: "Thư giãn tự do", desc: "60 phút • Đọc sách, nghe nhạc, xem phim • KHÔNG học", type: "rest" });
      schedule.push({ time: "23:15 - 23:30", title: "Vệ sinh cá nhân", desc: "15 phút • Đánh răng, rửa mặt", type: "rest" });
      schedule.push({ time: "23:30 - 23:45", title: "Night Plan & Chuẩn bị ngủ", desc: "15 phút • Lên kế hoạch ngày mai, tắt đèn", type: "rest" });
    } else if (schoolShift === "Chỉ buổi Chiều") {
      // Sáng Block 1,2 + Chiều trường → Tối Block 3 + chu kỳ ôn tập
      if (urgentTask) {
        schedule.push({ time: "19:00 - 20:00", title: `Bài tập GẤP: ${urgentTask}`, desc: "60 phút • Xử lý deadline khẩn cấp", type: "urgent" });
        schedule.push({ time: "20:00 - 20:15", title: "Nghỉ giải lao", desc: "15 phút • Đi lại, uống nước", type: "rest" });
        schedule.push({ time: "20:15 - 22:15", title: "Block 3: Luyện Nói & Viết", desc: "120 phút Output • Speaking + Writing cuối ngày", type: "aptis" });
      } else {
        schedule.push({ time: "19:00 - 21:00", title: "Block 3: Luyện Nói & Viết", desc: "120 phút Output • Luyện Speaking + Writing phản xạ", type: "aptis" });
        schedule.push({ time: "21:00 - 21:15", title: "Nghỉ giải lao", desc: "15 phút • Đi lại, giãn cơ, uống nước", type: "rest" });
        schedule.push({ time: "21:15 - 22:00", title: "Ôn bài trường / Tự học", desc: "45 phút • Ôn lại bài đã học, chuẩn bị ngày mai", type: "school" });
      }
      schedule.push({ time: "22:00 - 22:15", title: "Nghỉ giải lao", desc: "15 phút • Giãn cơ, thư giãn", type: "rest" });
      schedule.push({ time: "22:15 - 23:15", title: "Thư giãn tự do", desc: "60 phút • Đọc sách, nghe nhạc • Để não xả hơi hoàn toàn", type: "rest" });
      schedule.push({ time: "23:15 - 23:30", title: "Vệ sinh cá nhân", desc: "15 phút • Đánh răng, rửa mặt", type: "rest" });
      schedule.push({ time: "23:30 - 23:45", title: "Night Plan & Chuẩn bị ngủ", desc: "15 phút • Lên kế hoạch ngày mai, tắt đèn", type: "rest" });
    } else {
      // Nghỉ nhà: Sáng Block 1,2 + Chiều Block 3 → Tối: thêm chu kỳ ôn tập
      if (urgentTask) {
        schedule.push({ time: "19:00 - 20:00", title: `Bài tập GẤP: ${urgentTask}`, desc: "60 phút • Xử lý deadline khẩn cấp", type: "urgent" });
        schedule.push({ time: "20:00 - 20:15", title: "Nghỉ giải lao", desc: "15 phút • Đi lại, uống nước", type: "rest" });
        schedule.push({ time: "20:15 - 21:15", title: "Ôn tập tổng hợp Aptis", desc: "60 phút • Xem lại từ vựng, ôn lại lỗi sai", type: "aptis" });
        schedule.push({ time: "21:15 - 21:30", title: "Nghỉ giải lao", desc: "15 phút • Giãn cơ, thư giãn mắt", type: "rest" });
        schedule.push({ time: "21:30 - 22:15", title: "Tự học / Làm bài tập trường", desc: "45 phút • Bài tập về nhà, code dự án", type: "school" });
      } else {
        schedule.push({ time: "19:00 - 20:00", title: "Làm bài tập trường / Tự học IT", desc: "60 phút • Bài tập về nhà, code dự án phụ", type: "school" });
        schedule.push({ time: "20:00 - 20:15", title: "Nghỉ giải lao", desc: "15 phút • Đi lại, uống nước, giãn cơ", type: "rest" });
        schedule.push({ time: "20:15 - 21:15", title: "Ôn tập tổng hợp Aptis", desc: "60 phút • Xem lại từ vựng, luyện thêm đề nếu muốn", type: "aptis" });
        schedule.push({ time: "21:15 - 21:30", title: "Nghỉ giải lao", desc: "15 phút • Giãn mắt, thư giãn", type: "rest" });
        schedule.push({ time: "21:30 - 22:15", title: "Đọc sách / Nâng cao kiến thức", desc: "45 phút • Đọc tài liệu tiếng Anh, sách chuyên ngành", type: "school" });
      }
      schedule.push({ time: "22:15 - 23:15", title: "Thư giãn tự do", desc: "60 phút • Đọc sách, nghe nhạc, giải trí nhẹ • KHÔNG học nữa", type: "rest" });
      schedule.push({ time: "23:15 - 23:30", title: "Vệ sinh cá nhân", desc: "15 phút • Đánh răng, rửa mặt", type: "rest" });
      schedule.push({ time: "23:30 - 23:45", title: "Night Plan & Chuẩn bị ngủ", desc: "15 phút • Lên kế hoạch ngày mai, tắt đèn", type: "rest" });
    }

    // 7. NGỦ (Tất cả kịch bản)
    schedule.push({ time: "23:45 - 06:00", title: "Ngủ sâu", desc: "4 chu kỳ × 90 phút + 15p ru ngủ = 6h15 ngủ nước rút", type: "rest" });

    setGeneratedSchedule(schedule);
    setPlanStep(3);
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
        schedule_date: new Date().toISOString(),
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
        schedule_date: new Date().toISOString(),
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

  useEffect(() => {
    if (currentDateTime) {
      const todayStr = currentDateTime.toDateString();
      if (lastDayRef.current !== todayStr) {
        lastDayRef.current = todayStr;
        // Đồng hồ vừa qua nửa đêm: reset toàn bộ cho ngày mới
        resetForNewDay();
      }
    }
  }, [currentDateTime]);

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

      let viVoice = null;
      if (viVoices.length > 0 && viVoices[selectedVoiceIndex]) {
        viVoice = viVoices[selectedVoiceIndex];
      } else {
        const voices = window.speechSynthesis.getVoices();
        viVoice = voices.find(v => v.name === 'Google Tiếng Việt')
          || voices.find(v => v.lang === 'vi-VN' && (v.name.includes('Female') || v.name.includes('Lieu')))
          || voices.find(v => v.lang.includes('vi'));
      }

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
        // Sync mốc end_time tuyệt đối lên DB để thiết bị khác đồng bộ chính xác
        syncAndBroadcast({ endTime: new Date(endTimeRef.current).toISOString(), isActive: true });
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
    speakAnnounce("Đã nhận lệnh về nhà. Hệ thống tái dàn trải quỹ thời gian theo chu kỳ học khoa học thành công.");

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
    const toTotal = (hr: number, mn: number) => hr * 60 + mn;

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

    // === HÀM TÍNH THỜI GIAN NGHỈ THÔNG MINH ===
    // Dựa trên số chu kỳ liên tiếp đã hoàn thành & độ dài block
    const getSmartBreak = (blockDurationMins: number, consecutiveCycles: number): { mins: number; desc: string } => {
      // Sau block ngắn (≤45p) → nghỉ 5 phút
      if (blockDurationMins <= 45) {
        return { mins: 5, desc: "5 phút • Uống nước, đi lại nhanh" };
      }
      // Sau block vừa (46-90p) → nghỉ 15 phút
      if (blockDurationMins <= 90) {
        // Nhưng nếu đã học 3+ chu kỳ liên tiếp → tăng lên 30 phút
        if (consecutiveCycles >= 3) {
          return { mins: 30, desc: "30 phút • Nghỉ dài sau 3 chu kỳ liên tiếp, ăn nhẹ, thư giãn" };
        }
        return { mins: 15, desc: "15 phút • Đi lại, giãn cơ, uống nước, KHÔNG nhìn màn hình" };
      }
      // Sau block dài (>90p) → nghỉ 30 phút
      // Nhưng nếu đã học 3+ chu kỳ → cho nghỉ 1 tiếng
      if (consecutiveCycles >= 3) {
        return { mins: 60, desc: "60 phút • Nghỉ dài hồi phục sau chuỗi học marathon, ăn nhẹ, vận động" };
      }
      return { mins: 30, desc: "30 phút • Nghỉ giải lao lớn, thư giãn não bộ, ăn nhẹ nếu đói" };
    };

    // === KHUNG GIỜ CỐ ĐỊNH: 17:00 - 19:00 (Tắm rửa + Ăn tối) ===
    const FIXED_START = 17 * 60; // 17:00
    const FIXED_MID = 18 * 60;   // 18:00
    const FIXED_END = 19 * 60;   // 19:00

    // Helper: chèn block cố định 17:00-19:00 nếu cần
    const insertFixedDinnerBlock = (schedule: ScheduleItem[], startTotal: number): [number, number] => {
      // Nếu đang trước 17:00 hoặc đã qua 19:00 → không cần chèn
      if (startTotal >= FIXED_END || startTotal < FIXED_START) return [Math.floor(startTotal / 60), startTotal % 60];

      // Đang trong khoảng 17:00-19:00 → chèn phần còn lại
      if (startTotal < FIXED_MID) {
        const bathEndH = Math.floor(FIXED_MID / 60);
        const bathEndM = FIXED_MID % 60;
        schedule.push({
          time: `${ft(Math.floor(startTotal / 60), startTotal % 60)} - ${ft(bathEndH, bathEndM)}`,
          title: "Thể dục & Tắm rửa",
          desc: `${FIXED_MID - startTotal} phút • Vận động, tắm sạch sẽ`,
          type: "rest"
        });
        startTotal = FIXED_MID;
      }
      if (startTotal < FIXED_END) {
        const dinnerEndH = Math.floor(FIXED_END / 60);
        const dinnerEndM = FIXED_END % 60;
        schedule.push({
          time: `${ft(Math.floor(startTotal / 60), startTotal % 60)} - ${ft(dinnerEndH, dinnerEndM)}`,
          title: "Ăn tối & Nghỉ ngơi",
          desc: `${FIXED_END - startTotal} phút • Ăn tối từ tốn, nghỉ ngơi nhẹ`,
          type: "rest"
        });
        startTotal = FIXED_END;
      }
      return [Math.floor(startTotal / 60), startTotal % 60];
    };

    // Helper: tính thời gian học khả dụng (trừ đi khung giờ cố định 17-19h)
    const getAvailableStudyMins = (fromTotal: number, toTotal: number): number => {
      let available = toTotal - fromTotal;
      // Nếu khoảng thời gian chứa khung 17:00-19:00 → trừ đi
      const overlapStart = Math.max(fromTotal, FIXED_START);
      const overlapEnd = Math.min(toTotal, FIXED_END);
      if (overlapStart < overlapEnd) {
        available -= (overlapEnd - overlapStart);
      }
      return Math.max(0, available);
    };

    if (remainingRealMins > remainingAptisMins) {
      // === CÒN DƯ THỜI GIAN SAU APTIS → CHIA CHU KỲ HỌC + NGHỈ ===
      let consecutiveCycles = 0;

      // Phần 1: Xếp các block Aptis còn lại + break thông minh
      for (let i = activeBlockIndex; i < blocks.length; i++) {
        let bDuration = (i === activeBlockIndex) ? Math.ceil(timeLeft / 60) : blocks[i].durationMins;

        // Kiểm tra nếu block này sẽ chạm vào khung 17:00-19:00
        let blockStart = toTotal(currH, currM);
        let blockEnd = blockStart + bDuration;

        if (blockStart < FIXED_START && blockEnd > FIXED_START) {
          // Block sẽ xuyên qua 17:00 → cắt đôi
          const firstHalf = FIXED_START - blockStart;
          if (firstHalf > 0) {
            newSchedule.push({
              time: `${ft(currH, currM)} - 17:00`,
              title: `Tiếp Tục: ${blocks[i].title}`,
              desc: `${firstHalf} phút • Học đến giờ tắm & ăn tối`,
              type: "aptis"
            });
            [currH, currM] = [17, 0];
          }

          // Chèn khung cố định 17:00-19:00
          [currH, currM] = insertFixedDinnerBlock(newSchedule, FIXED_START);
          consecutiveCycles = 0; // Reset sau nghỉ dài

          // Phần còn lại của block sau 19:00
          const secondHalf = bDuration - firstHalf;
          if (secondHalf > 0) {
            newSchedule.push({
              time: `${ft(currH, currM)} - ${ft(currH, currM + secondHalf)}`,
              title: `Tiếp Tục: ${blocks[i].title}`,
              desc: `${secondHalf} phút • Tiếp tục sau ăn tối`,
              type: "aptis"
            });
            [currH, currM] = addMins(currH, currM, secondHalf);
          }
        } else if (blockStart >= FIXED_START && blockStart < FIXED_END) {
          // Đang trong khung 17:00-19:00 → chèn dinner trước
          [currH, currM] = insertFixedDinnerBlock(newSchedule, blockStart);
          consecutiveCycles = 0;

          // Rồi xếp block sau 19:00
          newSchedule.push({
            time: `${ft(currH, currM)} - ${ft(currH, currM + bDuration)}`,
            title: `Tiếp Tục: ${blocks[i].title}`,
            desc: "Khối thời gian linh hoạt",
            type: "aptis"
          });
          [currH, currM] = addMins(currH, currM, bDuration);
        } else {
          // Block nằm hoàn toàn ngoài khung 17-19h → xếp bình thường
          newSchedule.push({
            time: `${ft(currH, currM)} - ${ft(currH, currM + bDuration)}`,
            title: `Tiếp Tục: ${blocks[i].title}`,
            desc: "Khối thời gian linh hoạt",
            type: "aptis"
          });
          [currH, currM] = addMins(currH, currM, bDuration);
        }
        consecutiveCycles++;

        // Break giữa các block Aptis
        if (i < blocks.length - 1) {
          // Kiểm tra nếu break rơi vào khung 17-19h → thay bằng dinner
          let breakStart = toTotal(currH, currM);
          if (breakStart >= FIXED_START && breakStart < FIXED_END) {
            [currH, currM] = insertFixedDinnerBlock(newSchedule, breakStart);
            consecutiveCycles = 0;
          } else {
            const brk = getSmartBreak(bDuration, consecutiveCycles);
            // Nếu break sẽ chạm vào 17:00 → cắt ngắn break + chèn dinner
            let brkEnd = breakStart + brk.mins;
            if (breakStart < FIXED_START && brkEnd > FIXED_START) {
              const shortBreak = FIXED_START - breakStart;
              if (shortBreak >= 5) {
                newSchedule.push({
                  time: `${ft(currH, currM)} - 17:00`,
                  title: "Nghỉ giải lao",
                  desc: `${shortBreak} phút • Uống nước, đi lại`,
                  type: "rest"
                });
              }
              [currH, currM] = [17, 0];
              [currH, currM] = insertFixedDinnerBlock(newSchedule, FIXED_START);
              consecutiveCycles = 0;
            } else {
              newSchedule.push({
                time: `${ft(currH, currM)} - ${ft(currH, currM + brk.mins)}`,
                title: "Nghỉ giải lao",
                desc: brk.desc,
                type: "rest"
              });
              [currH, currM] = addMins(currH, currM, brk.mins);
              if (brk.mins >= 30) consecutiveCycles = 0;
            }
          }
        }
      }

      // Phần 2: Thời gian dư → chia thành chu kỳ "Tự học/Ôn tập" + break
      let cTot = toTotal(currH, currM);

      // Chèn khung cố định nếu chưa qua
      if (cTot >= FIXED_START && cTot < FIXED_END) {
        [currH, currM] = insertFixedDinnerBlock(newSchedule, cTot);
        consecutiveCycles = 0;
        cTot = toTotal(currH, currM);
      }

      let freeTimeMins = bedTotal - cTot;

      if (freeTimeMins > 0) {
        // Break sau khối Aptis cuối trước khi vào chu kỳ phụ
        const postAptisBreak = getSmartBreak(blocks[blocks.length - 1]?.durationMins || 60, consecutiveCycles);
        if (freeTimeMins > postAptisBreak.mins + 30) {
          // Kiểm tra break có chạm 17:00-19:00 không
          let breakStart = toTotal(currH, currM);
          if (breakStart >= FIXED_START && breakStart < FIXED_END) {
            [currH, currM] = insertFixedDinnerBlock(newSchedule, breakStart);
            consecutiveCycles = 0;
          } else {
            newSchedule.push({
              time: `${ft(currH, currM)} - ${ft(currH, currM + postAptisBreak.mins)}`,
              title: "Nghỉ giải lao",
              desc: postAptisBreak.desc,
              type: "rest"
            });
            [currH, currM] = addMins(currH, currM, postAptisBreak.mins);
            if (postAptisBreak.mins >= 30) consecutiveCycles = 0;
          }
          freeTimeMins = bedTotal - toTotal(currH, currM);
        }

        // Dành tối đa 90 phút cuối cho "Thư giãn tự do" trước ngủ
        const windDownMins = 15;
        const availableForStudy = getAvailableStudyMins(toTotal(currH, currM), bedTotal);
        const maxRelaxMins = Math.min(90, Math.max(30, Math.floor(availableForStudy * 0.3)));
        const timeForStudyCycles = availableForStudy - maxRelaxMins - windDownMins;

        if (timeForStudyCycles >= 30) {
          let studyTimeLeft = timeForStudyCycles;
          let cycleCount = 0;
          const studyCycleDuration = 45;

          const studyTopics = [
            { title: "Ôn tập tổng hợp Aptis", desc: "Xem lại từ vựng, ôn lại lỗi sai, luyện thêm đề" },
            { title: "Làm bài tập trường / Tự học IT", desc: "Bài tập về nhà, code dự án, hoặc ôn bài ngày mai" },
            { title: "Đọc sách / Nâng cao kiến thức", desc: "Đọc tài liệu tiếng Anh, sách chuyên ngành" },
            { title: "Luyện thêm đề Aptis", desc: "Làm thêm bài tập Reading/Listening nếu còn năng lượng" },
          ];

          while (studyTimeLeft >= 30) {
            // Kiểm tra nếu đang trong khung 17-19h → chèn dinner trước
            let nowTotal = toTotal(currH, currM);
            if (nowTotal >= FIXED_START && nowTotal < FIXED_END) {
              [currH, currM] = insertFixedDinnerBlock(newSchedule, nowTotal);
              consecutiveCycles = 0;
              nowTotal = toTotal(currH, currM);
            }

            const thisCycleDuration = Math.min(studyCycleDuration, studyTimeLeft);
            let cycleEnd = nowTotal + thisCycleDuration;

            // Nếu chu kỳ xuyên qua 17:00 → cắt đôi
            if (nowTotal < FIXED_START && cycleEnd > FIXED_START) {
              const firstHalf = FIXED_START - nowTotal;
              const topic = studyTopics[cycleCount % studyTopics.length];
              if (firstHalf >= 15) {
                newSchedule.push({
                  time: `${ft(currH, currM)} - 17:00`,
                  title: topic.title,
                  desc: `${firstHalf} phút • ${topic.desc}`,
                  type: cycleCount % 2 === 0 ? "aptis" : "school"
                });
                studyTimeLeft -= firstHalf;
                cycleCount++;
              }
              [currH, currM] = [17, 0];
              [currH, currM] = insertFixedDinnerBlock(newSchedule, FIXED_START);
              consecutiveCycles = 0;
              continue; // Re-enter loop to schedule remaining study time
            }

            const topic = studyTopics[cycleCount % studyTopics.length];
            newSchedule.push({
              time: `${ft(currH, currM)} - ${ft(currH, currM + thisCycleDuration)}`,
              title: topic.title,
              desc: `${thisCycleDuration} phút • ${topic.desc}`,
              type: cycleCount % 2 === 0 ? "aptis" : "school"
            });
            [currH, currM] = addMins(currH, currM, thisCycleDuration);
            studyTimeLeft -= thisCycleDuration;
            cycleCount++;
            consecutiveCycles++;

            // Break giữa các chu kỳ tự học
            if (studyTimeLeft >= 30) {
              let breakStartTot = toTotal(currH, currM);
              if (breakStartTot >= FIXED_START && breakStartTot < FIXED_END) {
                [currH, currM] = insertFixedDinnerBlock(newSchedule, breakStartTot);
                consecutiveCycles = 0;
              } else {
                const brk = getSmartBreak(thisCycleDuration, consecutiveCycles);
                const actualBreak = Math.min(brk.mins, studyTimeLeft - 30);
                if (actualBreak >= 5) {
                  newSchedule.push({
                    time: `${ft(currH, currM)} - ${ft(currH, currM + actualBreak)}`,
                    title: "Nghỉ giải lao",
                    desc: actualBreak >= 30 ? `${actualBreak} phút • Nghỉ dài, thư giãn` : actualBreak >= 15 ? `${actualBreak} phút • Giãn cơ, uống nước` : `${actualBreak} phút • Uống nước, đi lại`,
                    type: "rest"
                  });
                  [currH, currM] = addMins(currH, currM, actualBreak);
                  studyTimeLeft -= actualBreak;
                  if (actualBreak >= 30) consecutiveCycles = 0;
                }
              }
            }
          }
        }

        // Chèn dinner nếu chưa qua (trường hợp study cycles kết thúc trước 17:00)
        cTot = toTotal(currH, currM);
        if (cTot >= FIXED_START && cTot < FIXED_END) {
          [currH, currM] = insertFixedDinnerBlock(newSchedule, cTot);
        }

        // Thêm block "Thư giãn tự do" trước ngủ (tối đa 90 phút)
        cTot = toTotal(currH, currM);
        const relaxEnd = bedTotal - windDownMins;
        const actualRelaxMins = relaxEnd - cTot;

        if (actualRelaxMins > 0) {
          const relaxEndH = Math.floor(relaxEnd / 60) % 24;
          const relaxEndM = relaxEnd % 60;
          newSchedule.push({
            time: `${ft(currH, currM)} - ${ft(relaxEndH, relaxEndM)}`,
            title: "Thư giãn tự do",
            desc: `${actualRelaxMins} phút • Đọc sách, nghe nhạc, xem phim nhẹ • KHÔNG học`,
            type: "rest"
          });
          [currH, currM] = [relaxEndH, relaxEndM];
        }

        // Vệ sinh cá nhân trước ngủ
        if (windDownMins > 0) {
          newSchedule.push({
            time: `${ft(currH, currM)} - ${ft(bedH, bedM)}`,
            title: "Vệ sinh cá nhân & Chuẩn bị ngủ",
            desc: `${windDownMins} phút • Đánh răng, rửa mặt, tắt đèn`,
            type: "rest"
          });
        }
      }
    } else {
      // === KHÔNG ĐỦ THỜI GIAN → ÉP TIẾN ĐỘ ===
      // Vẫn giữ khung 17-19h nếu chưa qua
      let availableMins = getAvailableStudyMins(currTotal, bedTotal);
      let droppedBlocksCount = 0;

      for (let i = activeBlockIndex; i < blocks.length; i++) {
        // Kiểm tra nếu đang trong khung 17-19h → chèn dinner trước
        let nowTot = toTotal(currH, currM);
        if (nowTot >= FIXED_START && nowTot < FIXED_END) {
          [currH, currM] = insertFixedDinnerBlock(newSchedule, nowTot);
          nowTot = toTotal(currH, currM);
        }

        let bDuration = (i === activeBlockIndex) ? Math.ceil(timeLeft / 60) : blocks[i].durationMins;

        if (availableMins - bDuration >= 0) {
          // Kiểm tra xuyên qua 17:00
          let blockEnd = nowTot + bDuration;
          if (nowTot < FIXED_START && blockEnd > FIXED_START) {
            const firstHalf = FIXED_START - nowTot;
            newSchedule.push({
              time: `${ft(currH, currM)} - 17:00`,
              title: `Ép tiến độ: ${blocks[i].title}`,
              desc: `${firstHalf} phút • Học đến giờ ăn tối`,
              type: "urgent"
            });
            [currH, currM] = [17, 0];
            [currH, currM] = insertFixedDinnerBlock(newSchedule, FIXED_START);
            const secondHalf = bDuration - firstHalf;
            if (secondHalf > 0) {
              newSchedule.push({
                time: `${ft(currH, currM)} - ${ft(currH, currM + secondHalf)}`,
                title: `Ép tiến độ: ${blocks[i].title}`,
                desc: `${secondHalf} phút • Tiếp tục sau ăn tối`,
                type: "urgent"
              });
              [currH, currM] = addMins(currH, currM, secondHalf);
            }
          } else {
            newSchedule.push({
              time: `${ft(currH, currM)} - ${ft(currH, currM + bDuration)}`,
              title: `Ép tiến độ: ${blocks[i].title}`,
              desc: "Chạy đua thời gian • Không có break",
              type: "urgent"
            });
            [currH, currM] = addMins(currH, currM, bDuration);
          }
          availableMins -= bDuration;

          if (i < blocks.length - 1 && availableMins >= 5) {
            newSchedule.push({
              time: `${ft(currH, currM)} - ${ft(currH, currM + 5)}`,
              title: "Giải lao nhanh",
              desc: "5 phút • Micro-break, uống nước",
              type: "rest"
            });
            [currH, currM] = addMins(currH, currM, 5);
            availableMins -= 5;
          }
        } else if (availableMins >= 20) {
          newSchedule.push({
            time: `${ft(currH, currM)} - ${ft(currH, currM + availableMins)}`,
            title: `Rút gọn: ${blocks[i].title}`,
            desc: `${availableMins} phút (rút gọn từ ${bDuration}p) • Tập trung phần quan trọng nhất`,
            type: "urgent"
          });
          [currH, currM] = addMins(currH, currM, availableMins);
          availableMins = 0;
        } else {
          droppedBlocksCount++;
          updatedBlocks[i].completed = true;
        }
      }

      // Chèn dinner nếu chưa qua
      let cTot = toTotal(currH, currM);
      if (cTot >= FIXED_START && cTot < FIXED_END) {
        [currH, currM] = insertFixedDinnerBlock(newSchedule, cTot);
      }

      // Vệ sinh + chuẩn bị ngủ
      cTot = toTotal(currH, currM);
      if (cTot < bedTotal && bedTotal - cTot > 0) {
        const remainMins = bedTotal - cTot;
        if (remainMins > 15) {
          newSchedule.push({
            time: `${ft(currH, currM)} - ${ft(bedH, bedM)}`,
            title: "Vệ sinh cá nhân & Chuẩn bị ngủ",
            desc: `${remainMins} phút • Thư giãn nhẹ, đánh răng, chuẩn bị ngủ`,
            type: "rest"
          });
        }
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
    const newEndTime = (newActiveIndex < updatedBlocks.length && newTimeLeft > 0) ? new Date(Date.now() + newTimeLeft * 1000).toISOString() : null;
    syncAndBroadcast({
      blocks: updatedBlocks,
      activeBlockIndex: newActiveIndex,
      isActive: newActiveIndex < updatedBlocks.length,
      isPausedDay: false,
      timeLeft: newTimeLeft,
      endTime: newEndTime,
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
    syncAndBroadcast({ blocks: newBlocks, activeBlockIndex: nextIndex, silverStars: newSilverStars, endTime: null, timeLeft: newBlocks[nextIndex]?.durationMins ? newBlocks[nextIndex].durationMins * 60 : 0 });
  };

  const toggleTimer = () => {
    if (activeBlockIndex >= blocks.length || isPausedDay) return; // All done
    const newIsActive = !isActive;
    setIsActive(newIsActive);
    if (newIsActive) {
      // Bắt đầu/tiếp tục: tính mốc end_time tuyệt đối
      const endMs = Date.now() + timeLeft * 1000;
      endTimeRef.current = endMs;
      syncAndBroadcast({ isActive: true, timeLeft, endTime: new Date(endMs).toISOString() });
    } else {
      // Tạm dừng: xoá end_time, lưu lại timeLeft hiện tại
      endTimeRef.current = null;
      syncAndBroadcast({ isActive: false, timeLeft, endTime: null });
    }
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

      {/* Header Info - Mobile Optimized */}
      <div className="mb-6 pt-8">
        {/* Row 1: Title + Action Buttons */}
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] md:text-[10px] uppercase font-mono tracking-[0.3em] text-blue-500/80 mb-1">
              Powered by MINH PHÁT VILLA
            </p>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight text-white uppercase flex items-center">
              Aptis Intensive <span className="ml-2 w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"></span>
            </h1>
          </div>

          {/* Action Buttons - Always Visible */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-2">
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
              className="bg-blue-950/40 text-blue-400 p-2.5 md:p-3.5 rounded-xl hover:bg-blue-900/60 border border-blue-900/50 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all"
              title="Đổi giọng nói (Test Audio)"
            >
              <BellRing className="w-4 h-4 md:w-5 md:h-5" />
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
              className={`p-2.5 md:p-3.5 rounded-xl border transition-all ${(currentDateTime && (currentDateTime.getHours() >= 21 || currentDateTime.getHours() < 4))
                ? "bg-blue-950/40 text-blue-400 border-blue-900/50 hover:bg-blue-900/60 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                : "bg-gray-900/40 text-gray-500 border-gray-800/50 cursor-pointer"
                }`}
              title="5-Min Night Plan"
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

        {/* Row 2: Stats Badges */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <p className="text-blue-500/70 text-[10px] md:text-xs tracking-widest uppercase font-mono bg-blue-900/20 px-2 py-0.5 rounded border border-blue-900/50">Countdown: 21 Days</p>
          <span className="text-yellow-500 text-[10px] md:text-xs tracking-widest uppercase font-mono bg-yellow-900/20 px-1.5 py-0.5 rounded border border-yellow-900/50 flex items-center">🥇 {stars} Vàng</span>
          <span className="text-gray-300 text-[10px] md:text-xs tracking-widest uppercase font-mono bg-gray-800/40 px-1.5 py-0.5 rounded border border-gray-600/50 flex items-center">🥈 {silverStars} Bạc</span>
          <span className="text-red-500 text-[10px] md:text-xs tracking-widest uppercase font-mono bg-red-900/20 px-1.5 py-0.5 rounded border border-red-900/50 flex items-center">❌ {failedDays} Nợ</span>
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
              // Phát hiện schedule cho ngày mai (Night Plan tạo lúc đêm nay)
              // Nếu schedule bắt đầu từ buổi sáng mà giờ hiện tại là buổi tối → đây là lịch cho ngày mai
              const firstTime = listToRender[0]?.time?.split(" - ")[0];
              let isNextDaySchedule = false;
              if (firstTime) {
                const [fH] = firstTime.split(":").map(Number);
                if (!isNaN(fH) && fH < 12 && currentTotal >= 20 * 60) {
                  isNextDaySchedule = true;
                }
              }

              if (isNextDaySchedule) {
                // Lịch cho ngày mai: chỉ lọc theo trạng thái hoàn thành của block, KHÔNG lọc theo giờ
                listToRender = listToRender.filter(item => {
                  const matchAptis = blocks.find(b => item.title.includes(b.title));
                  if (matchAptis) return !matchAptis.completed;
                  return true;
                });
              } else {
                // Lịch hôm nay: lọc bình thường theo giờ + block
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
              }
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

              // Giờ ngủ mặc định: 23:45
              const bedH = 23, bedM = 45;
              let bedTotal = bedH * 60 + bedM;
              let startTotal = currH * 60 + currM;
              // Xử lý trường hợp qua nửa đêm
              if (bedTotal < startTotal && bedTotal < 12 * 60) bedTotal += 24 * 60;
              let remainingMins = bedTotal - startTotal;

              let droppedCount = 0;

              blocks.forEach((block, i) => {
                if (block.completed) {
                  schedule.push({ time: "Hoàn thành", title: block.title, desc: `${block.durationMins} phút • Đã xong`, type: "completed", completed: true });
                } else {
                  let bDuration = (i === activeBlockIndex && timeLeft > 0) ? Math.ceil(timeLeft / 60) : block.durationMins;
                  const breakMins = (i > activeBlockIndex && schedule.length > 0 && !schedule[schedule.length - 1]?.completed) ? 10 : 0;

                  if (i === activeBlockIndex) {
                    // Block đang chạy: LUÔN hiển thị
                    let tStart = `${ft(currH, currM)}`;
                    [currH, currM] = addMins(currH, currM, bDuration);
                    let tEnd = `${ft(currH, currM)}`;
                    remainingMins -= bDuration;
                    schedule.push({
                      time: `${tStart} - ${tEnd}`,
                      title: block.title,
                      desc: isActive ? "Đang chạy..." : "Sắp tới lượt",
                      type: "aptis",
                      isActive: true
                    });
                  } else if (remainingMins >= bDuration + breakMins) {
                    // Còn đủ thời gian: thêm break + block
                    if (breakMins > 0) {
                      schedule.push({
                        time: `${ft(currH, currM)} - ${ft(currH, currM + breakMins)}`,
                        title: "Nghỉ giải lao",
                        desc: `${breakMins} phút • Đi lại, uống nước`,
                        type: "rest"
                      });
                      [currH, currM] = addMins(currH, currM, breakMins);
                      remainingMins -= breakMins;
                    }
                    let tStart = `${ft(currH, currM)}`;
                    [currH, currM] = addMins(currH, currM, bDuration);
                    let tEnd = `${ft(currH, currM)}`;
                    remainingMins -= bDuration;
                    schedule.push({
                      time: `${tStart} - ${tEnd}`,
                      title: block.title,
                      desc: `Ước tính ${bDuration} phút`,
                      type: "aptis"
                    });
                  } else {
                    // Không đủ thời gian: DROP block
                    droppedCount++;
                    schedule.push({
                      time: "Bỏ qua",
                      title: block.title,
                      desc: `Không đủ thời gian trước giờ ngủ (${ft(bedH, bedM)})`,
                      type: "completed",
                      completed: true
                    });
                  }
                }
              });

              // Thêm block đi ngủ nếu còn thời gian
              if (remainingMins > 0) {
                schedule.push({
                  time: `${ft(currH, currM)} - ${ft(bedH, bedM)}`,
                  title: remainingMins > 30 ? "Thư giãn & Chuẩn bị đi ngủ" : "Vệ sinh cá nhân & Đi ngủ",
                  desc: `${remainingMins} phút còn lại`,
                  type: "rest"
                });
              }

              schedule.push({
                time: `${ft(bedH, bedM)} - Sáng mai`,
                title: "Ngủ sâu",
                desc: "Tắt đèn, nghỉ ngơi đúng giờ",
                type: "rest"
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
                      {["Sáng & Chiều", "Chỉ buổi Sáng", "Chỉ buổi Chiều", "Thứ 7 (Học cả ngày)", "Nghỉ ở nhà"].map(opt => (
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
