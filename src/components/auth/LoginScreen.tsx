"use client";

import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
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
  const [successMsg, setSuccessMsg] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // Bước 1: Thử đăng nhập
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (!error) {
        // Đăng nhập thành công — onAuthStateChange sẽ xử lý
        setLoading(false);
        return;
      }

      console.log("Sign in result:", error.message);

      // Bước 2: Nếu sai credentials → thử đăng ký
      if (
        error.message.includes("Invalid login credentials") ||
        error.message.includes("invalid_credentials")
      ) {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpErr) {
          setErrorMsg(`Lỗi đăng ký: ${signUpErr.message}`);
        } else if (signUpData?.user) {
          if (signUpData.user.identities && signUpData.user.identities.length === 0) {
            // Email đã tồn tại nhưng mật khẩu sai
            setErrorMsg("Mật khẩu không đúng. Vui lòng thử lại.");
          } else if (signUpData.session) {
            // Đăng ký + tự động đăng nhập (confirm email tắt)
            setSuccessMsg("Đăng ký thành công! Đang chuyển...");
          } else {
            // Đăng ký OK nhưng cần confirm email
            setSuccessMsg("Đã tạo tài khoản! Đăng nhập lại để vào hệ thống.");

            // Thử đăng nhập ngay vì email có thể đã được auto-confirm
            setTimeout(async () => {
              const { error: retryErr } = await supabase.auth.signInWithPassword({
                email,
                password,
              });
              if (!retryErr) {
                setSuccessMsg("Đăng nhập thành công!");
              }
            }, 1500);
          }
        }
      } else if (error.message.includes("Email not confirmed")) {
        // Email chưa confirm — thử sign in lại sau khi auto-confirm chạy
        setErrorMsg("Email chưa xác nhận. Thử đăng nhập lại sau vài giây.");
        setTimeout(async () => {
          const { error: retryErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (!retryErr) {
            setSuccessMsg("Đăng nhập thành công!");
            setErrorMsg("");
          }
        }, 2000);
      } else if (
        error.message.includes("fetch") ||
        error.message.includes("network") ||
        error.message.includes("Failed")
      ) {
        setErrorMsg("Lỗi kết nối. Kiểm tra Internet và thử lại.");
      } else {
        setErrorMsg(`Lỗi: ${error.message}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không xác định";
      console.error("Auth exception:", err);
      setErrorMsg(`Lỗi kết nối: ${message}`);
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

        {/* Success message */}
        {successMsg && (
          <div className="flex items-start gap-3 bg-green-900/20 border border-green-800/50 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <p className="text-green-300 text-sm">{successMsg}</p>
          </div>
        )}

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
            onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); setSuccessMsg(""); }}
            placeholder="Email"
            required
            className="w-full px-5 py-4 bg-gray-900 border border-gray-800 rounded-xl focus:border-blue-500 text-white focus:outline-none placeholder:text-gray-600 shadow-[0_4px_10px_rgba(0,0,0,0.5)] h-14"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); setSuccessMsg(""); }}
            placeholder="Mật khẩu (tối thiểu 6 ký tự)"
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
