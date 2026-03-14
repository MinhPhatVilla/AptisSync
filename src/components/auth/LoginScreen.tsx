"use client";

import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

type LoginScreenProps = {
  onAuthComplete: () => void;
};

export default function LoginScreen({ onAuthComplete }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        const { error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (signUpErr) alert("Lỗi đăng ký: " + signUpErr.message);
      } else {
        alert("Lỗi đăng nhập: " + error.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans relative">
      <div className="absolute top-6 left-6 opacity-40 hover:opacity-100 transition-opacity">
        <h3 className="font-mono text-xs tracking-[0.3em] text-blue-400">MINHPHATVILLA</h3>
      </div>
      <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center">
          <h1 className="text-4xl font-light tracking-widest text-blue-50">
            APTIS<span className="font-bold text-blue-600">SYNC</span>
          </h1>
          <p className="text-gray-400 text-sm font-mono tracking-wide mt-2">Sync Đa Thiết Bị • Realtime</p>
          <p className="text-blue-500/50 text-[10px] font-mono mt-1 tracking-wider">🧠 Brain-Optimized Schedule v2.0</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4 mt-8">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full px-5 py-4 bg-gray-900 border border-gray-800 rounded-xl focus:border-blue-500 text-white focus:outline-none placeholder:text-gray-600 shadow-[0_4px_10px_rgba(0,0,0,0.5)] h-14"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
            required
            className="w-full px-5 py-4 bg-gray-900 border border-gray-800 rounded-xl focus:border-blue-500 text-white focus:outline-none placeholder:text-gray-600 shadow-[0_4px_10px_rgba(0,0,0,0.5)] h-14"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-blue-600 outline outline-4 outline-blue-900/30 text-white rounded-xl font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:bg-blue-500 hover:-translate-y-1 transition-all flex justify-center items-center mt-6"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "VÀO HỆ THỐNG"}
          </button>
        </form>
        <p className="text-xs text-gray-500 text-center font-mono mt-4">
          Chưa có tài khoản? App sẽ tự động tạo mới bảo mật.
        </p>
      </div>
    </div>
  );
}
