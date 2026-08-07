import { randomInt } from "node:crypto";

const API_URL = (process.env.OLLAMA_API_URL ?? "").replace(/\/$/, "");
const TOKEN = process.env.PROBE_TOKEN ?? "";
const COUNT = Number(process.env.SCAN_COUNT || 500);
const CIDRS = (process.env.SCAN_CIDRS ?? "").split(/\s+/).filter(Boolean);
const BATCH = 20;

if (!API_URL) {
  console.error("[scan] missing OLLAMA_API_URL");
  process.exit(1);
}

function ipToInt(ip) {
  return ip
    .split(".")
    .reduce((acc, o) => ((acc << 8) | Number(o)) >>> 0, 0);
}

function intToIp(n) {
  return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
}

function cidrHosts(cidr) {
  const [base, maskStr] = cidr.split("/");
  const mask = Number(maskStr);
  if (!Number.isInteger(mask) || mask < 16 || mask > 32) return [];
  const shift = 32 - mask;
  const baseIp = (ipToInt(base) >>> shift) << shift;
  const count = Math.min(mask === 32 ? 1 : 2 ** shift, 4096);
  const out = [];
  for (let i = 0; i < count; i++) out.push(intToIp((baseIp + i) >>> 0));
  return out;
}

function randomPublicIp() {
  const a = randomInt(1, 224);
  const b = randomInt(0, 256);
  const c = randomInt(0, 256);
  const d = randomInt(1, 255);
  if (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  ) {
    return randomPublicIp();
  }
  return `${a}.${b}.${c}.${d}`;
}

let targets = [];
if (CIDR.length) {
  for (const cidr of CIDR) targets.push(...cidrHosts(cidr));
} else {
  targets = Array.from({ length: COUNT }, randomPublicIp);
}
targets = [...new Set(targets)];

let found = 0;
let ok = 0;

for (let i = 0; i < targets.length; i += BATCH) {
  const batch = targets.slice(i, i + BATCH);
  try {
    const res = await fetch(`${API_URL}/api/probe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(TOKEN ? { "x-probe-token": TOKEN } : {}),
      },
      body: JSON.stringify({ hosts: batch }),
      signal: AbortSignal.timeout(30000),
    });
    const j = await res.json();
    const hits = (j.results ?? []).filter((r) => r.reachable);
    found += hits.length;
    for (const h of hits) {
      console.log(
        `FOUND ${h.ip} ${(h.models ?? []).map((m) => m.name).join(",")}`
      );
    }
    ok++;
  } catch (e) {
    console.error(`[scan] batch ${i} failed: ${e.message}`);
  }
}

console.log(
  `[scan] done: ${targets.length} targets, ${ok} batches ok, ${found} found`
);