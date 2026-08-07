"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Radar,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";
import type { HostRecord, ModelCount, Stats } from "@/lib/types";
import ProbePanel from "@/components/ProbePanel";
import HostModal from "@/components/HostModal";
import SyntaxPanel from "@/components/SyntaxPanel";

const DEFAULT_QUERY = 'port="11434" && status_code="200"';
const PER_PAGE = 20;

export default function Home() {
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<HostRecord[]>([]);
  const [models, setModels] = useState<ModelCount[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [took, setTook] = useState<number | null>(null);
  const [selected, setSelected] = useState<HostRecord | null>(null);
  const [showProbe, setShowProbe] = useState(false);
  const [showSyntax, setShowSyntax] = useState(false);

  const runSearch = useCallback(async (p: number) => {
    setLoading(true);
    const t0 = Date.now();
    try {
      const sp = new URLSearchParams({
        q: DEFAULT_QUERY,
        page: String(p),
        per: String(PER_PAGE),
      });
      const res = await fetch(`/api/search?${sp.toString()}`);
      const j = await res.json();
      setResults(j.results ?? []);
      setTotal(j.size ?? 0);
      setPage(j.page ?? 1);
      setTook(Date.now() - t0);
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadModels = useCallback(async () => {
    try {
      const res = await fetch("/api/models");
      const j = await res.json();
      setModels(j.models ?? []);
    } catch {
      // 忽略
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      const j = await res.json();
      setStats(j);
    } catch {
      // 忽略
    }
  }, []);

  useEffect(() => {
    runSearch(1);
    loadModels();
    loadStats();
  }, [runSearch, loadModels, loadStats]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showProbe) setShowProbe(false);
      else if (selected) setSelected(null);
      else if (showSyntax) setShowSyntax(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showProbe, selected, showSyntax]);

  const onProbeDone = () => {
    runSearch(page);
    loadModels();
    loadStats();
  };

  const onReprobe = (record: HostRecord) => {
    setSelected(record);
    runSearch(page);
    loadModels();
    loadStats();
  };

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#0b0f14]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <Radar className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight text-white">
                OllamaFOFA
              </h1>
              <p className="text-[11px] text-slate-500">Ollama 模型资产测绘引擎</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowProbe(true)}
              className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400"
            >
              <Zap className="h-4 w-4" /> 探测 IP
            </button>
            <button
              type="button"
              onClick={() => setShowSyntax(true)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400"
            >
              语法
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 text-slate-400">
            <Server className="h-3.5 w-3.5 text-emerald-500" />
            {stats ? `${stats.hosts} 个实例` : "—"}
          </span>
          <span className="inline-flex items-center gap-1 text-slate-400">
            <Database className="h-3.5 w-3.5 text-emerald-500" />
            {stats ? `${stats.models} 种模型` : "—"}
          </span>
          <span className="rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-emerald-400">
            port=&quot;11434&quot; &amp;&amp; status_code=&quot;200&quot;
          </span>
        </div>

        <div className="mb-2 mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            共 <span className="font-semibold text-slate-200">{total}</span>{" "}
            条结果
            {took != null && <> · 耗时 {(took / 1000).toFixed(2)}s</>}
          </span>
          <span className="flex items-center gap-3">
            <button
              onClick={() => runSearch(1)}
              className="inline-flex items-center gap-1 hover:text-emerald-400"
              disabled={loading}
            >
              <RefreshCw className="h-3.5 w-3.5" /> 刷新
            </button>
            {pages > 1 && (
              <span className="flex items-center gap-1">
                <button
                  onClick={() => runSearch(page - 1)}
                  disabled={page <= 1 || loading}
                  className="rounded px-2 py-1 hover:bg-slate-800 disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span>第 {page} / {pages} 页</span>
                <button
                  onClick={() => runSearch(page + 1)}
                  disabled={page >= pages || loading}
                  className="rounded px-2 py-1 hover:bg-slate-800 disabled:opacity-50"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5 font-medium">IP / 域名</th>
                <th className="px-3 py-2.5 font-medium">端口</th>
                <th className="px-3 py-2.5 font-medium">协议</th>
                <th className="px-3 py-2.5 font-medium">状态码</th>
                <th className="px-3 py-2.5 font-medium">版本</th>
                <th className="px-3 py-2.5 font-medium">模型列表</th>
                <th className="px-3 py-2.5 font-medium">地区</th>
                <th className="px-3 py-2.5 font-medium">最近活跃</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-800/60 last:border-0">
                      <td colSpan={8} className="px-3 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-slate-800/70" />
                      </td>
                    </tr>
                  ))
                : results.map((h) => (
                    <tr
                      key={h.ip}
                      onClick={() => setSelected(h)}
                      className="cursor-pointer border-b border-slate-800/60 transition-colors last:border-0 hover:bg-emerald-500/5"
                    >
                      <td className="px-3 py-2.5 font-mono text-emerald-400">
                        {h.ip}
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">{h.port}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs ${
                            h.protocol === "https"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-slate-700/60 text-slate-300"
                          }`}
                        >
                          {h.protocol}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">{h.statusCode}</td>
                      <td className="px-3 py-2.5 text-slate-300">
                        {h.version || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {h.models.map((m) => (
                            <span
                              key={m}
                              className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">
                        {h.country ? `${h.country}` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">
                        {new Date(h.lastSeen).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </main>

      {selected && (
        <HostModal
          host={selected}
          onReprobe={onReprobe}
          onClose={() => setSelected(null)}
        />
      )}
      {showProbe && (
        <ProbePanel onDone={onProbeDone} onClose={() => setShowProbe(false)} />
      )}
      {showSyntax && (
        <SyntaxPanel onClose={() => setShowSyntax(false)} />
      )}
    </div>
  );
}
