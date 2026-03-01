"use client";

import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";

export default function SleepPage() {
    const [wakeTime, setWakeTime] = useState("06:00");
    const [bedTimes, setBedTimes] = useState<{ time: string; cycles: number; isOptimal: boolean }[]>([]);

    useEffect(() => {
        calculateSleep(wakeTime);
    }, [wakeTime]);

    const calculateSleep = (targetWake: string) => {
        if (!targetWake) return;

        const [hours, minutes] = targetWake.split(":").map(Number);
        const wakeDate = new Date();
        wakeDate.setHours(hours, minutes, 0, 0);

        const fallAsleepTime = 15; // 15 mins to fall asleep
        const cycleTime = 90; // 90 mins per cycle

        const results = [];

        for (const cycle of [6, 5, 4, 3]) {
            const msToSubtract = (cycle * cycleTime + fallAsleepTime) * 60000;
            const bedTimeDate = new Date(wakeDate.getTime() - msToSubtract);

            const bHours = bedTimeDate.getHours().toString().padStart(2, "0");
            const bMins = bedTimeDate.getMinutes().toString().padStart(2, "0");
            results.push({
                time: `${bHours}:${bMins}`,
                cycles: cycle,
                isOptimal: cycle === 5 // 5 cycles (7.5 hours) is optimal
            });
        }

        setBedTimes(results);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] max-w-lg mx-auto w-full pt-10">
            <header className="mb-12">
                <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-2">Sleep.</h1>
                <p className="text-gray-500">Giấc ngủ 90 phút/chu kỳ cho ngày mới hiệu quả.</p>
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
                        className="bg-transparent text-5xl md:text-6xl font-light py-2 w-full focus:outline-none focus:ring-0 appearance-none text-white tracking-widest style-time"
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
                                className={`flex items-baseline justify-between py-2 border-b transition-colors ${b.isOptimal
                                        ? 'border-white text-white'
                                        : 'border-gray-800 text-gray-400 opacity-60 hover:opacity-100 hover:text-gray-200'
                                    }`}
                            >
                                <div className="flex items-center">
                                    <span className={`text-4xl md:text-5xl font-light ${b.isOptimal ? 'font-medium' : ''}`}>
                                        {b.time}
                                    </span>
                                    {b.isOptimal && (
                                        <ArrowRight className="w-5 h-5 ml-4 text-gray-400 hidden sm:block" />
                                    )}
                                </div>

                                <div className="text-right">
                                    <div className={`text-sm ${b.isOptimal ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {b.cycles} chu kỳ
                                    </div>
                                    {b.isOptimal && (
                                        <div className="text-xs font-mono uppercase tracking-widest mt-1 opacity-70">
                                            Tối ưu nhất
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 text-sm text-gray-600 font-light text-center leading-relaxed max-w-sm mx-auto">
                        Thời gian trên đã được cộng thêm 15 phút là thời gian trung bình để chìm vào giấc ngủ.
                    </div>
                </div>
            )}
        </div>
    );
}
