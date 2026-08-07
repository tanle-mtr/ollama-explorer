import { NextRequest, NextResponse } from "next/server";
import { parseQuery } from "@/lib/parser";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const page = Math.max(1, Math.floor(Number(sp.get("page")) || 1));
  const per = Math.min(100, Math.max(1, Math.floor(Number(sp.get("per")) || 20)));
  const filters = parseQuery(q);
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
