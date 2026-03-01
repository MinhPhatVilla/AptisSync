"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Brain, BookOpen, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

type TimerMode = "english" | "school" | "break";

const MODE_SETTINGS = {
    english: {
        time: 45 * 60,
        label: "English Deep Work",
        color: "text-blue-500",
        bg: "bg-blue-500",
        icon: BookOpen,
    },
    school: {
        time: 25 * 60,
        label: "School Tasks",
        color: "text-purple-500",
        bg: "bg-purple-500",
        icon: Brain,
    },
    break: {
        time: 5 * 60,
        label: "Short Break",
        color: "text-green-500",
        bg: "bg-green-500",
        icon: Coffee,
    },
};

export default function FocusPage() {
    const [mode, setMode] = useState<TimerMode>("english");
    const [timeLeft, setTimeLeft] = useState(MODE_SETTINGS["english"].time);
    const [isActive, setIsActive] = useState(false);

    // Audio ref for notification
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Prevent screen sleep if active
        let wakeLock: any = null;
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await (navigator as any).wakeLock.request('screen');
                }
            } catch (err) {
                console.error(`${err}`);
            }
        };

        if (isActive) {
            requestWakeLock();
        } else if (wakeLock) {
            wakeLock.release().then(() => { wakeLock = null; });
        }

        return () => {
            if (wakeLock) {
                wakeLock.release().then(() => { wakeLock = null; });
            }
        };
    }, [isActive]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((time) => time - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            // Play sound if possible
            if (audioRef.current) {
                audioRef.current.play().catch(e => console.log("Audio play blocked by browser:", e));
            }
            // Notification
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Hết giờ!", {
                    body: `Phiên ${MODE_SETTINGS[mode].label} đã kết thúc.`,
                });
            }
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, timeLeft, mode]);

    // Request notification permission on first interact
    const handleStart = () => {
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }
        setIsActive(!isActive);
    };

    const handleReset = () => {
        setIsActive(false);
        setTimeLeft(MODE_SETTINGS[mode].time);
    };

    const changeMode = (newMode: TimerMode) => {
        setMode(newMode);
        setIsActive(false);
        setTimeLeft(MODE_SETTINGS[newMode].time);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const progress = ((MODE_SETTINGS[mode].time - timeLeft) / MODE_SETTINGS[mode].time) * 100;
    const CurrentIcon = MODE_SETTINGS[mode].icon;

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
            <header className="mb-8 hidden sm:block">
                <h1 className="text-3xl font-bold tracking-tight">Focus</h1>
                <p className="text-muted-foreground mt-1">Sử dụng Pomodoro để tăng cường tập trung</p>
            </header>

            {/* Mode Selector */}
            <div className="flex justify-center mb-10 w-full max-w-md mx-auto">
                <div className="glass flex p-1 rounded-full w-full">
                    {(Object.keys(MODE_SETTINGS) as TimerMode[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => changeMode(m)}
                            className={cn(
                                "relative flex-1 py-2 text-sm font-medium rounded-full transition-colors z-10 block whitespace-nowrap overflow-hidden text-ellipsis px-1",
                                mode === m ? "text-white" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {mode === m && (
                                <motion.div
                                    layoutId="mode-indicator"
                                    className={cn("absolute inset-0 rounded-full -z-10", MODE_SETTINGS[m].bg)}
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            {MODE_SETTINGS[m].label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Timer Display */}
            <div className="flex-1 flex flex-col items-center justify-center -mt-10">
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
                    {/* Progress Circle SVG */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle
                            cx="50%"
                            cy="50%"
                            r="48%"
                            className="fill-none stroke-secondary"
                            strokeWidth="4"
                        />
                        <motion.circle
                            cx="50%"
                            cy="50%"
                            r="48%"
                            className={cn("fill-none", MODE_SETTINGS[mode].color)}
                            strokeWidth="6"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: progress / 100 }}
                            transition={{ duration: 1, ease: "linear" }}
                            style={{ strokeDasharray: "1", strokeDashoffset: "0" }}
                        />
                    </svg>

                    <div className="flex flex-col items-center">
                        <CurrentIcon className={cn("w-8 h-8 mb-4", MODE_SETTINGS[mode].color)} />
                        <span className="text-6xl sm:text-7xl font-light tracking-tighter font-mono filter drop-shadow-lg">
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center space-x-6 mt-12">
                    <button
                        onClick={handleReset}
                        className="p-4 rounded-full glass text-muted-foreground hover:text-white transition-colors"
                    >
                        <RotateCcw className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handleStart}
                        className={cn(
                            "w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95",
                            MODE_SETTINGS[mode].bg
                        )}
                    >
                        {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                    </button>
                </div>
            </div>

            {/* Hidden Audio for bell */}
            <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />
        </div>
    );
}
