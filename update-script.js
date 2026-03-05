const fs = require('fs');
const filepath = 'src/app/page.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// Modifying INITIAL_BLOCKS
content = content.replace(
    /const INITIAL_BLOCKS: Block\[\] = \[([\s\S]*?)\];/,
    `const INITIAL_BLOCKS: Block[] = [
  { id: 1, title: "Luyện Nghe & Đọc Hiểu", durationMins: 90, completed: false },
  { id: 2, title: "Từ Vựng & Ngữ Pháp", durationMins: 90, completed: false },
  { id: 3, title: "Luyện Nói & Viết", durationMins: 90, completed: false },
];`
);

// State definitions
content = content.replace(
    /const \[urgentTask, setUrgentTask\] = useState\(""\);\n  const \[wakeUpTime, setWakeUpTime\] = useState\("06:00"\);/,
    `const [urgentTask, setUrgentTask] = useState("");
  const [urgentTaskCycles, setUrgentTaskCycles] = useState<number>(1);`
);

// Helper generateDynamicSchedule
const helperFunc = `
  const generateDynamicSchedule = (startMins: number, planningForTomorrow: boolean) => {
    const schedule: ScheduleItem[] = [];
    let currentMins = startMins;

    const fixedBlocks = [
      { start: 6 * 60, end: 7 * 60, title: "Vệ sinh & Ăn sáng", desc: "Rửa mặt, đánh răng, nạp năng lượng", type: "rest" },
      { start: 11 * 60, end: 13 * 60, title: "Ăn trưa & Ngủ trưa", desc: "Ăn đủ chất, ngủ trưa hồi phục", type: "rest" },
      { start: 17 * 60, end: 19 * 60, title: "Thể thao, Tắm & Ăn tối", desc: "Vận động, tắm rửa sạch sẽ, ăn tối", type: "rest" }
    ];

    if (schoolShift === "Chỉ buổi Sáng" || schoolShift === "Sáng & Chiều" || schoolShift === "Thứ 7 (Học cả ngày)") {
      fixedBlocks.push({ start: 7 * 60, end: 11 * 60, title: "Học trên trường (Ca Sáng)", desc: "Tập trung học trên lớp", type: "school" });
    }
    if (schoolShift === "Chỉ buổi Chiều" || schoolShift === "Sáng & Chiều" || schoolShift === "Thứ 7 (Học cả ngày)") {
      fixedBlocks.push({ start: 13 * 60, end: 17 * 60, title: "Học trên trường (Ca Chiều)", desc: "Tập trung học trên lớp", type: "school" });
    }

    fixedBlocks.sort((a, b) => a.start - b.start);

    const ft = (mins: number) => {
      let h = Math.floor(mins / 60) % 24;
      let m = mins % 60;
      return \`\${String(h).padStart(2, '0')}:\${String(m).padStart(2, '0')}\`;
    };

    let remainingAptisBlocks = planningForTomorrow ? [...INITIAL_BLOCKS] : blocks.filter((b, i) => !b.completed && i >= activeBlockIndex);
    let remainingUrgentCycles = planningForTomorrow && urgentTask ? urgentTaskCycles : 0; 
    let firstBlockAptisTime = (!planningForTomorrow && timeLeft > 0) ? Math.ceil(timeLeft / 60) : 0;

    let END_OF_DAY = 23 * 60 + 45;

    while (currentMins < END_OF_DAY) {
      const nextFixed = fixedBlocks.find(b => b.start < b.end && b.end > currentMins); 

      if (nextFixed && currentMins >= nextFixed.start) {
        schedule.push({
          time: \`\${ft(currentMins)} - \${ft(nextFixed.end)}\`,
          title: nextFixed.title,
          desc: nextFixed.desc,
          type: nextFixed.type as any
        });
        currentMins = nextFixed.end;
        continue;
      }

      const boundary = nextFixed ? nextFixed.start : END_OF_DAY;
      let availableMins = boundary - currentMins;

      if (availableMins <= 0) break;

      if (availableMins >= 105) { 
        let studyDuration = 90;
        let title = "Tự học / Ôn tập";
        let desc = "Làm bài tập hoặc nghiên cứu thêm";
        let type = "school";

        if (remainingUrgentCycles > 0) {
          title = \`[GẤP] \${urgentTask}\`;
          desc = "Công việc khẩn ngày mai";
          type = "urgent";
          remainingUrgentCycles--;
        } else if (remainingAptisBlocks.length > 0) {
          let b = remainingAptisBlocks[0];
          title = b.title;
          desc = "Chu kỳ tập trung sâu Aptis Intensive";
          type = "aptis";
          studyDuration = (firstBlockAptisTime > 0) ? firstBlockAptisTime : 90;
          firstBlockAptisTime = 0; 
          remainingAptisBlocks.shift();
        }

        schedule.push({
          time: \`\${ft(currentMins)} - \${ft(currentMins + studyDuration)}\`,
          title, desc, type: type as any
        });
        currentMins += studyDuration;

        schedule.push({
          time: \`\${ft(currentMins)} - \${ft(currentMins + 15)}\`,
          title: "Nghỉ giải lao (15 phút)",
          desc: "Đứng dậy đi lại, uống nước, giãn cơ",
          type: "rest"
        });
        currentMins += 15;
      } else if (availableMins >= 45) {
        let studyMins = availableMins >= 60 ? availableMins - 15 : availableMins;
        let breakMins = availableMins - studyMins;

        let title = "Tự học linh hoạt";
        let type = "school";

        if (remainingUrgentCycles > 0) {
          title = \`[GẤP] \${urgentTask} (Rút ngắn)\`;
          type = "urgent";
          remainingUrgentCycles = 0;
        } else if (remainingAptisBlocks.length > 0) {
          title = \`\${remainingAptisBlocks[0].title} (Rút ngắn)\`;
          type = "aptis";
          remainingAptisBlocks.shift();
        }

        schedule.push({
          time: \`\${ft(currentMins)} - \${ft(currentMins + studyMins)}\`,
          title, desc: \`\${studyMins} phút • Thời gian hẹp trước mốc cố định\`, type: type as any
        });
        currentMins += studyMins;

        if (breakMins > 0) {
          schedule.push({
            time: \`\${ft(currentMins)} - \${ft(currentMins + breakMins)}\`,
            title: "Giải lao nhẹ", desc: \`\${breakMins} phút ngắn ngủi\`, type: "rest"
          });
          currentMins += breakMins;
        }
      } else {
        schedule.push({
          time: \`\${ft(currentMins)} - \${ft(boundary)}\`,
          title: "Thời gian trống lẻ tẻ", desc: \`\${availableMins} phút • Nghe nhạc, thư thái chờ tiết theo\`, type: "rest"
        });
        currentMins += availableMins;
      }
    }

    if (currentMins >= END_OF_DAY || planningForTomorrow) {
      if (!schedule.find(s => s.title.includes("Ngủ sâu"))) {
         schedule.push({
           time: "23:45 - 06:00",
           title: "Ngủ sâu (Bảo vệ tuyệt đối)",
           desc: "Lên giường tắt đèn, đảm bảo sức khoẻ hoàn hảo",
           type: "rest"
         });
      }
    }

    return { schedule, unassignedBlocks: remainingAptisBlocks };
  };
`;

// Replace generateSchedule body
let genReplace = helperFunc + \`\n  const generateSchedule = () => {\n    const { schedule } = generateDynamicSchedule(6 * 60, true);\n    setGeneratedSchedule(schedule);\n    setPlanStep(3);\n  };\`;
const regexGenerate = /const generateSchedule = \(\) => \{[\s\S]*?setPlanStep\(3\);\n  \};/;
content = content.replace(regexGenerate, genReplace);

// Replace handleResumeAndRecalculate
const regexRecalculate = /const handleResumeAndRecalculate = \(\) => \{[\s\S]*?schedule: newSchedule\n    \}\);\n  \};/;
const recalculateFunc = \`const handleResumeAndRecalculate = () => {
    setIsPausedDay(false);
    setIsActive(true);
    speakAnnounce("Đã nhận lệnh về nhà. Hệ thống tiến hành dàn trải lại toàn bộ quỹ thời gian theo chu trình khoa học 90 phút học 15 phút nghỉ, và tuyệt đối không xâm phạm giờ ăn cơm và đi ngủ của bạn.");

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    // Nếu bị lố giờ ngủ rồi
    if (currentMins >= 23 * 60 + 45) {
      speakAnnounce("Đã tới giờ đi ngủ, hệ thống đã khoá lịch trình, anh hãy đi ngủ ngay nhé.");
      setGeneratedSchedule([{ time: "Bây giờ - 06:00", title: "Ngủ sâu (Bảo vệ)", desc: "Nghỉ ngơi hoàn toàn", type: "rest" }]);
      return;
    }

    const { schedule: newSchedule, unassignedBlocks } = generateDynamicSchedule(currentMins, false);

    let updatedBlocks = [...blocks];
    let newActiveIndex = activeBlockIndex;
    let newTimeLeft = timeLeft;

    if (unassignedBlocks.length > 0) {
       speakAnnounce(\`Vì thời gian đã trễ, hệ thống tự động loại bỏ \${unassignedBlocks.length} chu kỳ học Aptis khỏi lịch trình hôm nay để ép anh đi ngủ đúng giờ.\`);
       unassignedBlocks.forEach(ub => {
          const matchingIndex = updatedBlocks.findIndex(b => b.id === ub.id);
          if (matchingIndex !== -1) updatedBlocks[matchingIndex].completed = true;
       });
       
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
  };\`;

content = content.replace(regexRecalculate, recalculateFunc);

// Update step 3 UI in Night Plan for the Urgent Task config
const regexStep3 = /\{planStep === 2 && \([\s\S]*?<\/button>\n                  <\/motion\.div>\n                \)\}/g;

const step3Replace = \`{planStep === 2 && (
  <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
    {urgentTask ? (
      <>
        <h2 className="text-3xl font-light text-blue-50 mb-6 leading-tight">Bạn muốn dành bao nhiêu chu kỳ cho công việc gấp "{urgentTask}"?</h2>
        <div className="space-y-3 mb-8">
          {[1, 2].map(num => (
            <button key={num} onClick={() => setUrgentTaskCycles(num)} className={\`w-full text-left px-6 py-4 rounded-xl border flex justify-between items-center transition-all text-lg font-light \${urgentTaskCycles === num ? 'bg-blue-600/30 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-blue-900 bg-blue-950/20 text-blue-200 hover:bg-blue-900/50 hover:border-blue-500'}\`}>
              <span>{num} Chu kỳ (Khẩn cấp)</span>
              <span className="text-sm font-bold opacity-80">{num * 90}p học + {num * 15}p nghỉ</span>
            </button>
          ))}
        </div>
      </>
    ) : (
      <h2 className="text-3xl font-light text-blue-50 mb-6 leading-tight">Xác nhận khung giờ sinh hoạt cuối ngày!</h2>
    )}

    <div className="bg-blue-900/20 border border-blue-800/50 rounded-2xl p-5 mb-8 flex flex-col items-center shadow-[0_0_20px_rgba(59,130,246,0.1)]">
      <p className="text-blue-300/80 text-xs md:text-sm mb-3 font-medium uppercase tracking-wider font-mono text-center">Giờ đi ngủ khoa học (Đã fix 6 tiếng nước rút):</p>
      <div className="flex flex-col items-center flex-1 bg-blue-600/20 px-8 py-3 rounded-xl border border-blue-500/40 shadow-[0_0_25px_rgba(59,130,246,0.3)]">
        <span className="text-white font-mono font-bold text-4xl mb-1 tracking-tighter">23:45</span>
        <span className="text-blue-200 text-[11px] md:text-xs font-bold mt-1 uppercase tracking-widest text-center">4 Chu kỳ (6 Tiếng)<br /><span className="text-[10px] text-blue-400 font-normal">+ 15p Ru ngủ</span></span>
      </div>
    </div>

    <button onClick={generateSchedule} className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-lg shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:bg-blue-500 transition-colors flex items-center justify-center">
      Tạo Lịch Trình Tự Động <ChevronRight className="w-5 h-5 ml-2" />
    </button>
  </motion.div>
)};\`

content = content.replace(regexStep3, step3Replace);

fs.writeFileSync(filepath, content);
console.log('Update successful');
