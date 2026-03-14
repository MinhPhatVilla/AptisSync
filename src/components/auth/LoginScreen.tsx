"use client";

import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

type LoginScreenProps = {
  onAuthComplete: () => void;
};

export default function LoginScreen({ onAuthComplete }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // Try sign in first
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error("Sign in error:", error.message, error.status);

        // If credentials invalid, try sign up
        if (
          error.message.includes("Invalid login credentials") ||
          error.message.includes("invalid_credentials")
        ) {
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email,
            password,
          });

          if (signUpErr) {
            console.error("Sign up error:", signUpErr.message);
            setErrorMsg(`Lỗi đăng ký: ${signUpErr.message}`);
          } else if (signUpData?.user) {
            // Sign up succeeded — some Supabase projects require email confirmation
            if (signUpData.user.identities && signUpData.user.identities.length === 0) {
              setErrorMsg("Email đã tồn tại. Vui lòng kiểm tra lại mật khẩu.");
            } else if (!signUpData.session) {
              setErrorMsg("Đã tạo tài khoản! Kiểm tra email xác nhận hoặc thử đăng nhập lại.");
            }
            // If session exists, onAuthStateChange in page.tsx will handle it
          }
        } else if (error.message.includes("Email not confirmed")) {
          setErrorMsg("Email chưa được xác nhận. Kiểm tra hộp thư của bạn.");
        } else if (error.message.includes("fetch") || error.message.includes("network")) {
          setErrorMsg("Lỗi kết nối mạng. Kiểm tra Internet và thử lại.");
        } else {
          setErrorMsg(`Lỗi: ${error.message}`);
        }
      }
      // If no error, sign in succeeded — onAuthStateChange handles the rest
    } catch (err: any) {
      console.error("Auth exception:", err);
      setErrorMsg(`Lỗi kết nối Supabase: ${err?.message || "Không xác định"}`);
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

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-start gap-3 bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4 mt-8">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
            placeholder="Email"
            required
            className="w-full px-5 py-4 bg-gray-900 border border-gray-800 rounded-xl focus:border-blue-500 text-white focus:outline-none placeholder:text-gray-600 shadow-[0_4px_10px_rgba(0,0,0,0.5)] h-14"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
            placeholder="Mật khẩu"
            required
            minLength={6}
            className="w-full px-5 py-4 bg-gray-900 border border-gray-800 rounded-xl focus:border-blue-500 text-white focus:outline-none placeholder:text-gray-600 shadow-[0_4px_10px_rgba(0,0,0,0.5)] h-14"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-blue-600 outline outline-4 outline-blue-900/30 text-white rounded-xl font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:bg-blue-500 hover:-translate-y-1 transition-all flex justify-center items-center mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
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
