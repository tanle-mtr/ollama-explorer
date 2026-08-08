import { randomInt } from "node:crypto";
import { execSync } from "node:child_process";

const API_URL = (process.env.OLLAMA_API_URL ?? "").replace(/\/$/, "");
const TOKEN = process.env.PROBE_TOKEN ?? "";
const COUNT = Number(process.env.SCAN_COUNT || 1000);
const CIDRS = (process.env.SCAN_CIDRS ?? "").split(/\s+/).filter(Boolean);
const BATCH = 50;
const MASSCAN_RATE = process.env.MASSCAN_RATE || "500000";

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
  console.log(`[scan] masscan ${CIDRS.length} CIDRs at ${MASSCAN_RATE} pps`);
  const startTime = Date.now();
  const raw = execSync(
    "sudo masscan " + CIDRS.join(" ") + " -p11434 --rate " + MASSCAN_RATE + " --wait 5 --output-format json --output-file /tmp/masscan.json 2>&1",
    { encoding: "utf8", timeout: 25 * 60 * 1000 }
  );
  console.log(`[scan] masscan completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  
  try {
    const data = JSON.parse(raw);
    targets = data.scanportstatusmatrix
      ? Object.keys(data.scanportstatusmatrix)
      : [];
  } catch {
    const lines = execSync('cat /tmp/masscan.json 2>/dev/null | grep -E "open tcp 11434" || echo ""', {
      encoding: "utf8",
    });
    targets = lines
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("open tcp 11434"))
      .map((l) => l.split(/\s+/)[3])
      .filter(Boolean);
  }
  targets = [...new Set(targets)];
  console.log(`[scan] masscan found ${targets.length} hosts`);
} else if (CIDRS.length) {
  console.log(`[scan] using ${CIDRS.length} CIDRs`);
  for (const cidr of CIDRS) targets.push(...cidrHosts(cidr));
  targets = [...new Set(targets)];
} else {
  console.log(`[scan] using ${COUNT} random IPs`);
  targets = Array.from({ length: COUNT }, randomPublicIp);
}

if (!targets.length) {
  console.log("[scan] no targets, stopping");
  process.exit(0);
}

console.log(`[scan] scanning ${targets.length} targets in batches of ${BATCH}...`);
const scanStart = Date.now();
let found = 0;
let ok = 0;
let errors = 0;

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
    ok++;
    if (hits.length > 0) {
      for (const h of hits) {
        console.log(`FOUND ${h.ip} (${hits.length} total in batch)`);
      }
    }
  } catch (e) {
    errors++;
    console.error(`[scan] batch ${Math.floor(i / BATCH) + 1} failed: ${e.message}`);
  }
  
  if ((i + BATCH) % 200 === 0 || i + BATCH >= targets.length) {
    const elapsed = ((Date.now() - scanStart) / 1000).toFixed(1);
    console.log(`[scan] progress: ${Math.min(i + BATCH, targets.length)}/${targets.length} (${found} found, ${elapsed}s elapsed, ${errors} errors)`);
  }
}

const total = ((Date.now() - scanStart) / 1000).toFixed(1);
console.log(`[scan] done: ${targets.length} targets, ${ok} batches ok, ${found} found, ${errors} errors, ${total}s total`);
