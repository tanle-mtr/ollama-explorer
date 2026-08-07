import { redisConfigured, redisCommand, redisPipeline } from "@/lib/redis";
import { matchHost, matchesModelTerm, normModel } from "@/lib/parser";
import type {
  HostRecord,
  SearchFilters,
  SearchResult,
  Stats,
} from "@/lib/types";

const HOST_PREFIX = "ollama:host:";
const ALL_KEY = "ollama:all";
const MODELS_PREFIX = "ollama:models:";
const NAMES_KEY = "ollama:modelnames";
const TTL = 90 * 24 * 3600;

export interface OllamaStore {
  upsertHost(r: HostRecord): Promise<void>;
  search(filters: SearchFilters, page: number, per: number): Promise<SearchResult>;
  modelNames(): Promise<string[]>;
  modelCounts(names: string[]): Promise<Record<string, number>>;
  stats(): Promise<Stats>;
  getHosts(ips: string[]): Promise<HostRecord[]>;
}

class RedisStore implements OllamaStore {
  async upsertHost(r: HostRecord): Promise<void> {
    const cmds: Array<{ cmd: string; args: string[] }> = [
      { cmd: "SET", args: [HOST_PREFIX + r.ip, JSON.stringify(r), "EX", String(TTL)] },
      { cmd: "SADD", args: [ALL_KEY, r.ip] },
      { cmd: "EXPIRE", args: [ALL_KEY, String(TTL)] },
      { cmd: "SADD", args: [NAMES_KEY, ...r.models] },
      { cmd: "EXPIRE", args: [NAMES_KEY, String(TTL)] },
      ...r.models.map((m) => ({
        cmd: "SADD",
        args: [`${MODELS_PREFIX}${m}`, r.ip],
      })),
      ...r.models.map((m) => ({
        cmd: "EXPIRE",
        args: [`${MODELS_PREFIX}${m}`, String(TTL)],
      })),
    ];
    await redisPipeline(cmds);
  }

  private async smembers(key: string): Promise<string[]> {
    const r = await redisCommand("SMEMBERS", [key]);
    return Array.isArray(r) ? (r as string[]) : [];
  }

  private async sunion(keys: string[]): Promise<string[]> {
    const r = await redisCommand("SUNION", keys);
    return Array.isArray(r) ? (r as string[]) : [];
  }

  async getHosts(ips: string[]): Promise<HostRecord[]> {
    if (!ips.length) return [];
    const raw = await redisPipeline(
      ips.map((ip) => ({ cmd: "GET", args: [HOST_PREFIX + ip] }))
    );
    const hosts: HostRecord[] = [];
    for (let i = 0; i < raw.length; i++) {
      if (typeof raw[i] === "string") {
        try {
          hosts.push(JSON.parse(raw[i] as string));
        } catch {
          // 忽略损坏记录
        }
      }
    }
    return hosts;
  }

  async modelNames(): Promise<string[]> {
    return this.smembers(NAMES_KEY);
  }

  async modelCounts(names: string[]): Promise<Record<string, number>> {
    if (!names.length) return {};
    const raw = await redisPipeline(
      names.map((n) => ({ cmd: "SCARD", args: [MODELS_PREFIX + n] }))
    );
    const out: Record<string, number> = {};
    names.forEach((n, i) => {
      if (typeof raw[i] === "number") out[n] = raw[i] as number;
    });
    return out;
  }

  async stats(): Promise<Stats> {
    const raw = await redisPipeline([
      { cmd: "SCARD", args: [ALL_KEY] },
      { cmd: "SCARD", args: [NAMES_KEY] },
    ]);
    return {
      hosts: typeof raw[0] === "number" ? (raw[0] as number) : 0,
      models: typeof raw[1] === "number" ? (raw[1] as number) : 0,
    };
  }

  async search(
    filters: SearchFilters,
    page: number,
    per: number
  ): Promise<SearchResult> {
    let ips: string[] | null = null;
    if (filters.model) {
      const term = normModel(filters.model);
      const names = await this.modelNames();
      const matched = names.filter((n) => matchesModelTerm(n, term));
      if (!matched.length) return { total: 0, results: [] };
      ips =
        matched.length === 1
          ? await this.smembers(MODELS_PREFIX + matched[0])
          : await this.sunion(matched.map((n) => MODELS_PREFIX + n));
    }
    if (!ips) ips = await this.smembers(ALL_KEY);
    const hosts = (await this.getHosts(ips)).filter((h) => h && h.ip);
    const filtered = hosts.filter((h) => matchHost(h, filters));
    filtered.sort((a, b) => b.lastSeen - a.lastSeen);
    const total = filtered.length;
    return { total, results: filtered.slice((page - 1) * per, page * per) };
  }
}

class MemoryStore implements OllamaStore {
  private hosts = new Map<string, HostRecord>();
  private modelIndex = new Map<string, Set<string>>();
  private names = new Set<string>();

  async upsertHost(r: HostRecord): Promise<void> {
    this.hosts.set(r.ip, r);
    for (const m of r.models) {
      let s = this.modelIndex.get(m);
      if (!s) {
        s = new Set();
        this.modelIndex.set(m, s);
      }
      s.add(r.ip);
      this.names.add(m);
    }
  }

  async getHosts(ips: string[]): Promise<HostRecord[]> {
    return ips
      .map((ip) => this.hosts.get(ip))
      .filter((h): h is HostRecord => Boolean(h));
  }

  async modelNames(): Promise<string[]> {
    return [...this.names];
  }

  async modelCounts(names: string[]): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const n of names) out[n] = this.modelIndex.get(n)?.size ?? 0;
    return out;
  }

  async stats(): Promise<Stats> {
    return { hosts: this.hosts.size, models: this.names.size };
  }

  async search(
    filters: SearchFilters,
    page: number,
    per: number
  ): Promise<SearchResult> {
    const hosts = [...this.hosts.values()].filter((h) => matchHost(h, filters));
    hosts.sort((a, b) => b.lastSeen - a.lastSeen);
    const total = hosts.length;
    return { total, results: hosts.slice((page - 1) * per, page * per) };
  }
}

const GLOBAL_KEY = "__ollama_explorer_store__";

export function getStore(): OllamaStore {
  const g = globalThis as unknown as Record<string, OllamaStore>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = redisConfigured ? new RedisStore() : new MemoryStore();
  }
  return g[GLOBAL_KEY];
}
