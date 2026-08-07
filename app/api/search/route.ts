import { NextRequest, NextResponse } from "next/server";
import { parseQuery } from "@/lib/parser";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const modelParam = sp.get("model");
  const sortByParam = sp.get("sortBy") ?? "lastSeen";
  const sortOrderParam = sp.get("sortOrder") ?? "desc";
  const page = Math.max(1, Math.floor(Number(sp.get("page")) || 1));
  const per = Math.min(100, Math.max(1, Math.floor(Number(sp.get("per")) || 20)));
  
  const filters = parseQuery(q);
  
  // Handle model filter (single or comma-separated)
  if (modelParam) {
    const models = modelParam.split(",").map(m => m.trim()).filter(Boolean);
    filters.model = models.length === 1 ? models[0] : models;
  }
  
  // Handle sort options
  if (sortByParam === "tookMs" || sortByParam === "lastSeen" || sortByParam === "ip") {
    (filters as any).sortBy = sortByParam;
  }
  if (sortOrderParam === "asc" || sortOrderParam === "desc") {
    (filters as any).sortOrder = sortOrderParam;
  }
  
  const t0 = Date.now();
  const { total, results } = await getStore().search(filters, page, per);
  return NextResponse.json({
    query: q,
    size: total,
    page,
    per,
    took: Date.now() - t0,
    results,
  });
}
