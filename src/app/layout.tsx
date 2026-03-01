import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/layout/MainLayout";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Focus Time App",
  description: "A scientific time management app focused on English learning",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${outfit.variable} font-sans antialiased bg-black text-white min-h-screen`}
        suppressHydrationWarning
      >
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
