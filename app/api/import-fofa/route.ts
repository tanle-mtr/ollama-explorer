import { NextRequest, NextResponse } from "next/server";
import { probeAndStore } from "@/lib/ollama";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

export async function POST(req: NextRequest) {
  const email = process.env.FOFA_EMAIL;
  const key = process.env.FOFA_KEY;
  if (!email || !key) {
    return NextResponse.json(
      { error: "未配置 FOFA_EMAIL / FOFA_KEY 环境变量" },
      { status: 400 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const query =
    typeof body.query === "string" && body.query.trim()
      ? body.query
      : 'port="11434" && status_code="200"';
  const size = Math.min(100, Math.max(1, Math.floor(Number(body.size) || 50)));
  const url = `https://fofa.info/api/v1/search/all?email=${encodeURIComponent(
    email
  )}&key=${encodeURIComponent(key)}&qbase64=${Buffer.from(query).toString(
    "base64"
  )}&size=${size}&fields=host,ip,port,protocol,title,country,version,server,asn`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    return NextResponse.json(
      { error: `FOFA API 请求失败: ${res.status}` },
      { status: 502 }
    );
  }
  const j = await res.json();
  if (j.error) {
    return NextResponse.json({ error: j.errmsg ?? "FOFA API 返回错误" }, { status: 400 });
  }
  const rows: string[][] = Array.isArray(j.results) ? j.results : [];
  const targets: string[] = [];
  for (const row of rows) {
    const ip = row[1];
    if (typeof ip === "string" && IP_RE.test(ip) && targets.length < 20)
      targets.push(ip);
  }
  const results = await Promise.all(targets.map((ip) => probeAndStore(ip, 11434)));
  return NextResponse.json({
    query,
    pulled: rows.length,
    scanned: targets.length,
    found: results.filter((r) => r.reachable).length,
    stats: await getStore().stats(),
  });
}
