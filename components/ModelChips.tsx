"use client";

import type { ModelCount } from "@/lib/types";

export default function ModelChips({
  models,
  selected,
  onToggle,
}: {
  models: ModelCount[];
  selected: string | null;
  onToggle: (name: string) => void;
}) {
  if (!models.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs text-slate-500">模型筛选:</span>
      {models.slice(0, 24).map((m) => (
        <button
          key={m.name}
          onClick={() => onToggle(m.name)}
          className={`rounded px-2 py-0.5 font-mono text-[11px] transition-colors ${
            selected === m.name
              ? "bg-emerald-500 text-emerald-950"
              : "bg-slate-800/70 text-slate-400 hover:bg-emerald-500/15 hover:text-emerald-400"
          }`}
        >
          {m.name}{" "}
          <span
            className={selected === m.name ? "text-emerald-800" : "text-slate-500"}
          >
            ({m.count})
          </span>
        </button>
      ))}
      {models.length > 24 && (
        <span className="text-[11px] text-slate-600">…共 {models.length} 种</span>
      )}
    </div>
  );
}
