"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, RefreshCw, X } from "lucide-react";
import type { HostRecord, ModelInfo } from "@/lib/types";

export default function HostModal({
  host,
  onClose,
  onReprobe,
}: {
  host: HostRecord;
  onClose: () => void;
  onReprobe: (record: HostRecord) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 忽略剪贴板失败
    }
  };

  const reprobe = async () => {
    setProbing(true);
    setError(null);
    try {
      const res = await fetch("/api/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hosts: [host.ip], port: host.port }),
      });
      const j = await res.json();
      const r = j.results?.[0];
      if (r?.reachable && r.record) onReprobe(r.record);
      else setError("该实例当前无法访问（可能已下线或关闭端口）");
    } catch {
      setError("探测失败，请稍后重试");
    }
    setProbing(false);
  };

  const rows: ModelInfo[] =
    host.modelsInfo.length > 0
      ? host.modelsInfo
      : host.models.map((m) => ({ name: m }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0d1219] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-lg font-bold text-emerald-400">
            {host.ip}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Info label="端口" value={String(host.port)} />
          <Info label="协议" value={host.protocol} />
          <Info label="状态码" value={String(host.statusCode)} />
          <Info label="版本" value={host.version || "—"} />
          <Info label="Server" value={host.server || "—"} />
          <Info label="域名" value={host.hostname || "—"} />
          <Info label="地区" value={[host.country, host.city].filter(Boolean).join(" · ") || "—"} />
          <Info label="ASN" value={host.asn || "—"} />
          <Info label="首次发现" value={fmtTime(host.firstSeen)} />
          <Info label="最近活跃" value={fmtTime(host.lastSeen)} />
          <Info label="模型数" value={String(host.models.length)} />
          <Info label="查询语句" value={`ip="${host.ip}"`} />
        </div>

        <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-300">
          模型列表（{rows.length}）
        </h3>
        <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">模型</th>
                <th className="px-3 py-2 font-medium">大小</th>
                <th className="px-3 py-2 font-medium">参数量</th>
                <th className="px-3 py-2 font-medium">量化</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.name} className="border-t border-slate-800/60">
                  <td className="px-3 py-1.5 font-mono text-emerald-400">
                    {m.name}
                  </td>
                  <td className="px-3 py-1.5 text-slate-400">
                    {m.size ? `${(m.size / 1024 ** 3).toFixed(1)} GB` : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-slate-400">
                    {m.paramSize || "—"}
                  </td>
                  <td className="px-3 py-1.5 text-slate-400">
                    {m.quantization || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <a
            href={`http://${host.ip}:${host.port}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400"
          >
            <ExternalLink className="h-3.5 w-3.5" /> 打开 {host.ip}:{host.port}
          </a>
          <a
            href={`http://${host.ip}:${host.port}/api/tags`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400"
          >
            <ExternalLink className="h-3.5 w-3.5" /> /api/tags
          </a>
          <button
            onClick={() => copy(`ip="${host.ip}"`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}{" "}
            复制查询
          </button>
          <button
            onClick={reprobe}
            disabled={probing}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${probing ? "animate-spin" : ""}`} />{" "}
            {probing ? "探测中…" : "重新探测"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-900/60 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 truncate text-slate-200" title={value}>
        {value}
      </div>
    </div>
  );
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN");
}