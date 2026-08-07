"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Radar,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  Zap,
} from "lucide-react";
import type { HostRecord, ModelCount, Stats } from "@/lib/types";
import ModelChips from "@/components/ModelChips";
import ProbePanel from "@/components/ProbePanel";
import HostModal from "@/components/HostModal";
import SyntaxPanel from "@/components/SyntaxPanel";

const DEFAULT_QUERY = 'port="11434" && status_code="200"';
const PER_PAGE = 20;

const EXAMPLES: { label: string; query: string }[] = [
  { label: "全部实例", query: 'port="11434" && status_code="200"' },
  { label: "Llama 3.1", query: 'model="llama3.1"' },
  { label: "Qwen2.5", query: 'model="qwen2.5"' },
  { label: "美国地区", query: 'country="US"' },
  { label: "指定 IP", query: 'ip="1.2.3.4"' },
];

export default function Home() {
  const [input, setInput] = useState(DEFAULT_QUERY);
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
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const runSearch = useCallback(async (q: string, p: number) => {
    setLoading(true);
    const t0 = Date.now();
    try {
      const sp = new URLSearchParams({
        q,
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
    runSearch(DEFAULT_QUERY, 1);
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

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(input, 1);
  };

  const toggleModel = (name: string) => {
    setSelectedModel((cur) => {
      const next = cur === name ? null : name;
      const terms = input
        .split("&&")
        .map((t) => t.trim())
        .filter(Boolean)
        .filter((t) => !/^model\s*=/.test(t));
      if (next) terms.push(`model="${next}"`);
      const q = terms.join(" && ");
      setInput(q);
      runSearch(q, 1);
      return next;
    });
  };

  const onProbeDone = () => {
    runSearch(input, page);
    loadModels();
    loadStats();
  };

  const onReprobe = (record: HostRecord) => {
    setSelected(record);
    runSearch(input, page);
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
          <form onSubmit={onSearch} className="flex min-w-[260px] flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='输入查询，如 port="11434" && status_code="200"'
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/60"
                spellCheck={false}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? "查询中…" : "搜索"}
            </button>
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
              className="hidden rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400 sm:block"
            >
              语法
            </button>
          </form>
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
          <span className="text-slate-600">|</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => {
                setInput(ex.query);
                setSelectedModel(null);
                runSearch(ex.query, 1);
              }}
              className="rounded border border-slate-800 px-2 py-0.5 hover:border-emerald-500/40 hover:text-emerald-400"
            >
              {ex.label}
            </button>
          ))}
        </div>

        <ModelChips models={models} selected={selectedModel} onToggle={toggleModel} />

        <div className="mb-2 mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            共 <span className="font-semibold text-slate-200">{total}</span>{" "}
            条结果
            {took != null && <> · 耗时 {(took / 1000).toFixed(2)}s</>}
          </span>
          <span className="flex items-center gap-3">
            <button
              onClick={() => runSearch(input, 1)}
              className="inline-flex items-center gap-1 hover:text-emerald-400"
            >
              <RefreshCw className="h-3.5 w-3.5" /> 刷新
            </button>
            <span>
              第 {page} / {pages} 页
            </span>
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
                      <td className="px-3 py-2.5">
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-400">
                          {h.statusCode}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">
                        {h.version || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex max-w-[320px] flex-wrap gap-1">
                          {h.models.slice(0, 4).map((m) => (
                            <button
                              key={m}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleModel(m);
                              }}
                              className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300"
                            >
                              {m}
                            </button>
                          ))}
                          {h.models.length > 4 && (
                            <span className="text-[11px] text-slate-500">
                              +{h.models.length - 4}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">
                        {h.country
                          ? `${h.country}${h.city ? ` · ${h.city}` : ""}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {timeAgo(h.lastSeen)}
                      </td>
                    </tr>
                  ))}
              {!loading && results.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-slate-500">
                    没有匹配的结果，试试调整查询，或用「探测 IP」添加新的实例
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 pb-10">
          <button
            disabled={page <= 1}
            onClick={() => runSearch(input, page - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-sm disabled:opacity-40 hover:border-emerald-500/50"
          >
            <ChevronLeft className="h-4 w-4" /> 上一页
          </button>
          <button
            disabled={page >= pages}
            onClick={() => runSearch(input, page + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-sm disabled:opacity-40 hover:border-emerald-500/50"
          >
            下一页 <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <footer className="pb-8 text-center text-[11px] leading-relaxed text-slate-600">
          <p className="inline-flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5" />
            本工具仅用于安全研究、资产自查与合规测试，请勿对未授权目标进行探测。
          </p>
        </footer>
      </main>

      {showProbe && <ProbePanel onClose={() => setShowProbe(false)} onDone={onProbeDone} />}
      {showSyntax && <SyntaxPanel onClose={() => setShowSyntax(false)} />}
      {selected && (
        <HostModal
          host={selected}
          onClose={() => setSelected(null)}
          onReprobe={onReprobe}
        />
      )}
    </div>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const rtf = new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" });
  if (diff < 60_000) return "刚刚";
  if (diff < 3600_000) return rtf.format(-Math.floor(diff / 60_000), "minute");
  if (diff < 86_400_000) return rtf.format(-Math.floor(diff / 3600_000), "hour");
  if (diff < 30 * 86_400_000)
    return rtf.format(-Math.floor(diff / 86_400_000), "day");
  return new Date(ts).toLocaleDateString("zh-CN");
}
