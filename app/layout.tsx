import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OllamaFOFA - Ollama 模型资产测绘",
  description:
    "FOFA 风格的 Ollama 模型资产测绘引擎：搜索公网上开放的 Ollama 实例与模型列表",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#0b0f14] text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
