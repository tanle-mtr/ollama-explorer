import type { HostRecord, SearchFilters } from "@/lib/types";

export function normModel(m: string): string {
  return m.trim().toLowerCase().replace(/:latest$/, "");
}

export function matchesModelTerm(hostModel: string, term: string): boolean {
  const n = normModel(hostModel);
  const t = normModel(term);
  if (!n || !t) return false;
  if (n === t) return true;
  if (!t.includes(":") && n.startsWith(t + ":")) return true;
  return false;
}

export function parseQuery(raw: string): SearchFilters {
  const f: SearchFilters = {};
  const terms = raw
    .split(/&&|\|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const t of terms) {
    const m = t.match(/^([a-zA-Z_]+)\s*=\s*"([^"]*)"$/);
    if (!m) {
      f.q = f.q ? `${f.q} ${t}` : t;
      continue;
    }
    const [, field, value] = m;
    switch (field) {
      case "ip":
        f.ip = value;
        break;
      case "port":
        f.port = parseInt(value, 10);
        break;
      case "status_code":
      case "status":
        f.statusCode = parseInt(value, 10);
        break;
      case "model":
      case "models":
        f.model = value;
        break;
      case "title":
        f.title = value;
        break;
      case "version":
        f.version = value;
        break;
      case "country":
        f.country = value.toUpperCase();
        break;
      case "hostname":
      case "host":
        f.hostname = value;
        break;
      case "server":
        f.server = value;
        break;
      default:
        f.q = f.q ? `${f.q} ${value}` : value;
    }
  }
  return f;
}

function ipToNum(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const o = Number(p);
    if (!Number.isInteger(o) || o < 0 || o > 255) return null;
    n = (n << 8) | o;
  }
  return n >>> 0;
}

export function ipInCidr(ip: string, cidr: string): boolean {
  const [base, maskStr] = cidr.split("/");
  const mask = parseInt(maskStr, 10);
  const n = ipToNum(ip);
  const b = ipToNum(base);
  if (n == null || b == null || !Number.isInteger(mask) || mask < 0 || mask > 32)
    return false;
  const shift = 32 - mask;
  return (n >>> shift) === (b >>> shift);
}

export function matchHost(h: HostRecord, f: SearchFilters): boolean {
  if (f.ip) {
    if (f.ip.includes("/")) {
      if (!ipInCidr(h.ip, f.ip)) return false;
    } else if (
      h.ip.toLowerCase() !== f.ip.toLowerCase() &&
      h.hostname.toLowerCase() !== f.ip.toLowerCase()
    ) {
      return false;
    }
  }
  if (f.port && h.port !== f.port) return false;
  if (f.statusCode && h.statusCode !== f.statusCode) return false;
  const model = f.model;
  if (model && !h.models.some((m) => matchesModelTerm(m, model))) return false;
  if (
    f.title &&
    !`${h.title ?? ""} ${h.server ?? ""}`
      .toLowerCase()
      .includes(f.title.toLowerCase())
  )
    return false;
  if (f.version && !(h.version ?? "").toLowerCase().includes(f.version.toLowerCase()))
    return false;
  if (f.country && !(h.country ?? "").toUpperCase().startsWith(f.country))
    return false;
  if (
    f.hostname &&
    !(h.hostname ?? "").toLowerCase().includes(f.hostname.toLowerCase())
  )
    return false;
  if (f.server && !(h.server ?? "").toLowerCase().includes(f.server.toLowerCase()))
    return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    const hay = [h.ip, h.hostname, h.title, h.version, h.server, h.country, h.city, h.asn, ...h.models]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}
