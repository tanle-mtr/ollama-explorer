import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const stats = await getStore().stats();
  return NextResponse.json({ ...stats, ts: Date.now() });
}
