import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/layout/MainLayout";
import ErrorBoundary from "@/components/ErrorBoundary";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AptisSync — Brain-Optimized",
  description: "Quản lý thời gian học Aptis theo khoa học não bộ",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <body
        className={`${outfit.variable} font-sans antialiased bg-black text-white min-h-screen`}
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <MainLayout>{children}</MainLayout>
        </ErrorBoundary>
      </body>
    </html>
  );
}

