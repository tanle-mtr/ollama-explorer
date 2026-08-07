import { NextResponse } from "next/server";
import { probeAndStore } from "@/lib/ollama";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const HOST_RE =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;

function validTarget(h: string): boolean {
  if (IP_RE.test(h)) return h.split(".").every((o) => Number(o) <= 255);
  return HOST_RE.test(h);
}

export async function POST(req: Request) {
  const token = process.env.PROBE_TOKEN;
  if (token && req.headers.get("x-probe-token") !== token) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  let body: { hosts?: unknown; port?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // 忽略解析失败
  }
  let hosts = Array.isArray(body.hosts)
    ? body.hosts.map((h) => String(h).trim()).filter(validTarget)
    : [];
  hosts = [...new Set(hosts)].slice(0, 20);
  if (!hosts.length) {
    return NextResponse.json({ error: "请提供有效的 IP 或域名" }, { status: 400 });
  }
  const port = Math.min(
    65535,
    Math.max(1, Math.floor(Number(body.port) || 11434))
  );
  const results = await Promise.all(hosts.map((h) => probeAndStore(h, port)));
  return NextResponse.json({
    port,
    scanned: hosts.length,
    results,
    stats: await getStore().stats(),
  });
}
