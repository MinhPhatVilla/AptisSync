"use client";

import { Timer, CheckSquare, Moon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            <main className="flex-1 w-full max-w-lg mx-auto md:max-w-4xl p-4 sm:p-6 md:p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {children}
            </main>
        </div>
    );
}
