import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").toLowerCase();
  const store = getStore();
  const names = await store.modelNames();
  const counts = await store.modelCounts(names);
  const models = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .filter((m) => !q || m.name.toLowerCase().includes(q))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 200);
  return NextResponse.json({ total: models.length, models });
}
