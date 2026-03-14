"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] Caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
          <h1 className="text-2xl font-light text-amber-200 mb-2">Lỗi ứng dụng</h1>
          <p className="text-gray-500 text-sm mb-6 max-w-sm">
            {this.state.error?.message || "Đã xảy ra lỗi không mong muốn."}
          </p>
          <p className="text-gray-700 text-xs mb-6 font-mono">
            Thường do Supabase key chưa được cấu hình đúng trên Vercel.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-3 bg-blue-700 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
          >
            Thử lại
          </button>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-6 py-2 text-gray-500 text-sm hover:text-gray-300 transition-colors"
          >
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
