"use client";

import { useEffect } from "react";
import { BookOpen, X } from "lucide-react";

const FIELDS: [string, string][] = [
  ["ip", "按 IP 精确匹配，支持 CIDR（ip=\"1.2.3.4\" / ip=\"1.2.3.0/24\"）"],
  ["port", "按端口匹配（port=\"11434\"）"],
  ["status_code", "HTTP 状态码（status_code=\"200\"）"],
  ["model", "模型 ID，支持家族匹配（model=\"llama3.1\" 会命中 llama3.1:8b）"],
  ["title", "标题/服务名包含（title=\"Ollama\"）"],
  ["version", "Ollama 版本包含（version=\"0.5\"）"],
  ["country", "国家代码（country=\"US\" / country=\"CN\"）"],
  ["hostname", "域名包含（hostname=\"ollama\"）"],
  ["server", "Server 响应头包含（server=\"ollama\"）"],
];

export default function SyntaxPanel({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0d1219] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <BookOpen className="h-4 w-4 text-emerald-400" /> 查询语法
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-3 rounded-lg bg-slate-900/60 p-3 font-mono text-xs text-emerald-400">
          port="11434" && status_code="200"
        </div>
        <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">字段</th>
                <th className="px-3 py-2 font-medium">说明</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map(([k, v]) => (
                <tr key={k} className="border-t border-slate-800/60">
                  <td className="px-3 py-2 font-mono text-emerald-400">{k}</td>
                  <td className="px-3 py-2 text-slate-400">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-slate-600">
          多个条件用 && 连接（全部满足）。不带引号的自由文本会匹配 IP / 域名 /
          模型名。
        </p>
      </div>
    </div>
  );
}