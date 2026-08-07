"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X, Zap } from "lucide-react";

const BATCH = 20;
const MAX_TARGETS = 500;
const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

function expandTargets(text: string): string[] {
  const out = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (t.includes("/")) {
      const [ip, maskStr] = t.split("/");
      const mask = parseInt(maskStr, 10);
      if (IP_RE.test(ip) && mask >= 16 && mask <= 32) {
        const octets = ip.split(".").map(Number);
        const ipn =
          ((octets[0] << 24) |
            (octets[1] << 16) |
            (octets[2] << 8) |
            octets[3]) >>>
          0;
        const shift = 32 - mask;
        const base = (ipn >>> shift) << shift;
        const count = mask === 32 ? 1 : 2 ** shift;
        const limit = Math.min(count, 300);
        for (let i = 0; i < limit; i++) {
          const n = (base + i) >>> 0;
          out.add(
            `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`
          );
        }
        continue;
      }
    }
    out.add(t);
  }
  return [...out].slice(0, MAX_TARGETS);
}

interface Hit {
  ip: string;
  port: number;
  models?: { name: string }[];
}

export default function ProbePanel({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [port, setPort] = useState(11434);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [found, setFound] = useState(0);
  const [progress, setProgress] = useState(0);
  const totalRef = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const start = async () => {
    const targets = expandTargets(text);
    if (!targets.length) return;
    totalRef.current = targets.length;
    setLog([]);
    setFound(0);
    setProgress(0);
    setRunning(true);
    let f = 0;
    for (let i = 0; i < targets.length; i += BATCH) {
      const batch = targets.slice(i, i + BATCH);
      try {
        const res = await fetch("/api/probe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hosts: batch, port }),
        });
        const j = await res.json();
        const hits: Hit[] = (j.results ?? []).filter(
          (r: { reachable: boolean }) => r.reachable
        );
        f += hits.length;
        setFound(f);
        for (const h of hits) {
          setLog((l) => [
            ...l,
            `${h.ip}:${port}  ✓ ${(h.models ?? []).map((m) => m.name).join(", ")}`,
          ]);
        }
      } catch {
        setLog((l) => [...l, `批次失败（${batch[0]} ...）`]);
      }
      setProgress(Math.min(targets.length, i + BATCH));
    }
    setLog((l) => [
      ...l,
      `完成：共探测 ${targets.length} 个目标，发现 ${f} 个 Ollama 实例`,
    ]);
    setRunning(false);
    onDone();
  };

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
            <Zap className="h-4 w-4 text-emerald-400" /> 探测 Ollama 实例
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-2 text-xs text-slate-500">
          输入 IP 或域名，每行一个，支持 CIDR（如 1.2.3.0/24）。每次最多{" "}
          {MAX_TARGETS} 个。
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={"1.2.3.4\n5.6.7.0/24\nollama.example.com"}
          className="w-full rounded-lg border border-slate-700 bg-slate-900/60 p-3 font-mono text-xs text-slate-200 outline-none focus:border-emerald-500/60"
          spellCheck={false}
        />
        <div className="mt-3 flex items-center gap-3">
          <label className="text-xs text-slate-400">端口</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(parseInt(e.target.value) || 11434)}
            className="w-24 rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500/60"
          />
          <button
            onClick={start}
            disabled={running}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {running ? `探测中 ${progress}/${totalRef.current}` : "开始探测"}
          </button>
        </div>
        {running && totalRef.current > 0 && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${(progress / totalRef.current) * 100}%`,
              }}
            />
          </div>
        )}
        <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-slate-400">
          {log.length === 0 && !running && (
            <span className="text-slate-600">探测结果将显示在这里…</span>
          )}
          {log.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              {l}
            </div>
          ))}
          {running && <div className="text-emerald-500">…</div>}
        </div>
        <p className="mt-3 text-[11px] text-slate-600">
          探测结果会写入共享数据库，其他用户搜索时即可看到。
        </p>
      </div>
    </div>
  );
}