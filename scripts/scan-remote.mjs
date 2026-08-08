import { randomInt } from "node:crypto";
import { execSync } from "node:child_process";

const API_URL = (process.env.OLLAMA_API_URL ?? "").replace(/\/$/, "");
const TOKEN = process.env.PROBE_TOKEN ?? "";
const COUNT = Number(process.env.SCAN_COUNT || 500);
const CIDRS = (process.env.SCAN_CIDRS ?? "").split(/\s+/).filter(Boolean);
const BATCH = 20;
const MASSCAN_RATE = process.env.MASSCAN_RATE || "100000";

if (!API_URL) {
  console.error("[scan] missing OLLAMA_API_URL");
  process.exit(1);
}

let haveMasscan = false;
try {
  execSync("command -v masscan", { stdio: "ignore" });
  haveMasscan = true;
} catch {
  haveMasscan = false;
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
  return [intToIp(baseIp >>> 0)];
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

if (haveMasscan && CIDRS.length) {
  // 使用所有网段，不限制数量
  const rangeArgs = CIDRS.join(" ");
  console.log(`[scan] masscan ${rangeArgs} -p11434 --rate ${MASSCAN_RATE}`);
  const raw = execSync(
    "sudo masscan " + rangeArgs + " -p11434 --rate " + MASSCAN_RATE + " --wait 3 --output-format list --output-file /tmp/masscan.txt 2>&1",
    { encoding: "utf8", timeout: 20 * 60 * 1000 }
  );
  console.log(raw.trim());
  const lines = execSync('cat /tmp/masscan.txt 2>/dev/null | grep -E "^open tcp 11434" || echo ""', {
    encoding: "utf8",
  });
  targets = lines
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("open tcp 11434"))
    .map((l) => l.split(/\s+/)[3])
    .filter(Boolean);
  targets = [...new Set(targets)];
  console.log(`[scan] masscan open 11434 hosts: ${targets.length}`);
} else if (CIDRS.length) {
  // 使用所有网段
  for (const cidr of CIDRS) targets.push(...cidrHosts(cidr));
} else {
  targets = Array.from({ length: COUNT }, randomPublicIp);
}

if (!targets.length) {
  console.log("[scan] no targets, stopping");
  process.exit(0);
}

console.log(`[scan] scanning ${targets.length} targets...`);
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
    if (i % 100 === 0) {
      console.log(`[scan] progress: ${i}/${targets.length} (${found} found)`);
    }
  } catch (e) {
    console.error(`[scan] batch ${i} failed: ${e.message}`);
  }
}

console.log(
  `[scan] done: ${targets.length} targets, ${ok} batches ok, ${found} found`
);