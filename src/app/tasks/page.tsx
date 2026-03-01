"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type Task = {
    id: string;
    title: string;
    isCompleted: boolean;
};

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([
        { id: "1", title: "Review 50 từ vựng Tiếng Anh", isCompleted: false },
        { id: "2", title: "Hoàn thiện kế hoạch luận văn", isCompleted: false },
    ]);
    const [newTaskText, setNewTaskText] = useState("");

    const addTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;

        setTasks([
            { id: Date.now().toString(), title: newTaskText, isCompleted: false },
            ...tasks,
        ]);
        setNewTaskText("");
    };

    const removeTask = (id: string) => {
        setTasks(tasks.filter((t) => t.id !== id));
    };

    const toggleTask = (id: string) => {
        setTasks(
            tasks.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t))
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] max-w-lg mx-auto w-full pt-10">
            <header className="mb-12">
                <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-2">Tasks.</h1>
                <p className="text-gray-500">Viết ra những gì bạn cần làm hôm nay.</p>
            </header>

            {/* Input Field */}
            <form onSubmit={addTask} className="mb-10 relative">
                <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Thêm nhiệm vụ mới..."
                    className="w-full bg-transparent border-b border-gray-800 pb-4 text-xl md:text-2xl font-light focus:outline-none focus:border-white transition-colors placeholder:text-gray-700 pr-12"
                />
                <button
                    title="Add task"
                    type="submit"
                    className="absolute right-0 bottom-4 text-gray-500 hover:text-white transition-colors"
                >
                    <Plus className="w-8 h-8" />
                </button>
            </form>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto">
                <ul className="space-y-6">
                    {tasks.map((task) => (
                        <li
                            key={task.id}
                            className={`group flex items-center justify-between transition-all duration-300 ${task.isCompleted ? "opacity-40" : "opacity-100"
                                }`}
                        >
                            <div
                                className="flex items-center flex-1 cursor-pointer"
                                onClick={() => toggleTask(task.id)}
                            >
                                <div
                                    className={`w-6 h-6 rounded-full border flex-shrink-0 mr-4 flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-white border-white text-black' : 'border-gray-600 bg-transparent'
                                        }`}
                                >
                                    {task.isCompleted && (
                                        <svg viewBox="0 0 14 14" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 7 6 10 11 4" />
                                        </svg>
                                    )}
                                </div>
                                <span className={`text-lg md:text-xl font-light transition-colors ${task.isCompleted ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                                    {task.title}
                                </span>
                            </div>

                            <button
                                title="Remove task"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeTask(task.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 p-2 transition-all duration-200 focus:opacity-100"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </li>
                    ))}
                    {tasks.length === 0 && (
                        <li className="text-gray-600 font-light text-center mt-20">
                            Chưa có nhiệm vụ nào. Thảnh thơi!
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
}
