import type {
  HostRecord,
  SearchFilters,
  SearchResult,
  Stats,
} from "@/lib/types";

const DATA_FILE = "data.json";
const GIST_DESCRIPTION = "Ollama Explorer Data - DO NOT EDIT MANUALLY";

interface StoreData {
  hosts: Record<string, HostRecord>;
  modelIndex: Record<string, string[]>;
  names: string[];
  updatedAt: number;
}

export interface OllamaStore {
  upsertHost(r: HostRecord): Promise<void>;
  search(filters: SearchFilters, page: number, per: number): Promise<SearchResult>;
  modelNames(): Promise<string[]>;
  modelCounts(names: string[]): Promise<Record<string, number>>;
  stats(): Promise<Stats>;
  getHosts(ips: string[]): Promise<HostRecord[]>;
}

class GitHubGistStore implements OllamaStore {
  private gistId: string;
  private token: string;
  private lastData: StoreData | null = null;
  private lastFetched: number = 0;
  private readonly CACHE_TTL = 30 * 1000;

  constructor() {
    this.gistId = process.env.GITHUB_GIST_ID ?? "";
    this.token = process.env.GITHUB_TOKEN ?? "";
  }

  private async fetchGist(): Promise<StoreData | null> {
    if (!this.gistId || !this.token) return null;
    
    const now = Date.now();
    if (this.lastData && now - this.lastFetched < this.CACHE_TTL) {
      return this.lastData;
    }

    try {
      const res = await fetch(
        `https://api.github.com/gists/${this.gistId}`,
        {
          headers: {
            Authorization: `token ${this.token}`,
            Accept: "application/vnd.github.v3+json",
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!res.ok) return null;

      const data = await res.json() as {
        files?: Record<string, { content?: string }>;
      };

      const file = Object.values(data.files ?? {})[0];
      if (!file?.content) return null;

      const storeData = JSON.parse(file.content) as StoreData;
      this.lastData = storeData;
      this.lastFetched = now;
      return storeData;
    } catch {
      return null;
    }
  }

  private async saveGist(data: StoreData): Promise<void> {
    if (!this.gistId || !this.token) return;

    try {
      await fetch(
        `https://api.github.com/gists/${this.gistId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `token ${this.token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github.v3+json",
          },
          body: JSON.stringify({
            description: GIST_DESCRIPTION,
            files: {
              [DATA_FILE]: {
                content: JSON.stringify(data, null, 2),
              },
            },
          }),
          signal: AbortSignal.timeout(15000),
        }
      );
      this.lastData = data;
      this.lastFetched = Date.now();
    } catch (e) {
      console.error("[GitHubGistStore] save error:", e);
    }
  }

  private async loadData(): Promise<StoreData> {
    let data = await this.fetchGist();
    if (!data) {
      data = { hosts: {}, modelIndex: {}, names: [], updatedAt: Date.now() };
      if (this.gistId && this.token) {
        await this.saveGist(data);
      }
    }
    return data;
  }

  async upsertHost(r: HostRecord): Promise<void> {
    const data = await this.loadData();
    
    data.hosts[r.ip] = r;
    
    if (!data.modelIndex[r.ip]) {
      data.modelIndex[r.ip] = [];
    }
    
    const newModels = r.models.filter((m) => !data.names.includes(m));
    if (newModels.length > 0) {
      data.names.push(...newModels);
    }
    
    data.updatedAt = Date.now();
    
    if (this.gistId && this.token) {
      await this.saveGist(data);
    }
  }

  async getHosts(ips: string[]): Promise<HostRecord[]> {
    const data = await this.loadData();
    return ips
      .map((ip) => data.hosts[ip])
      .filter((h): h is HostRecord => Boolean(h));
  }

  async modelNames(): Promise<string[]> {
    const data = await this.loadData();
    return data.names;
  }

  async modelCounts(names: string[]): Promise<Record<string, number>> {
    const data = await this.loadData();
    const result: Record<string, number> = {};
    for (const name of names) {
      const hosts = Object.values(data.hosts).filter(
        (h) => h.models.includes(name)
      );
      result[name] = hosts.length;
    }
    return result;
  }

  async stats(): Promise<Stats> {
    const data = await this.loadData();
    return {
      hosts: Object.keys(data.hosts).length,
      models: data.names.length,
    };
  }

  async search(
    filters: SearchFilters,
    page: number,
    per: number
  ): Promise<SearchResult> {
    const data = await this.loadData();
    const hosts = Object.values(data.hosts).filter((h) => {
      if (filters.ip) {
        if (filters.ip.includes("/")) {
          const [net, mask] = filters.ip.split("/");
          const maskNum = parseInt(mask);
          if (maskNum >= 8 && maskNum <= 32) {
            const netParts = net.split(".").map(Number);
            const hostParts = h.ip.split(".").map(Number);
            const netInt =
              ((netParts[0] << 24) | (netParts[1] << 16) | (netParts[2] << 8) | netParts[3]) >>> 0;
            const hostInt =
              ((hostParts[0] << 24) | (hostParts[1] << 16) | (hostParts[2] << 8) | hostParts[3]) >>> 0;
            const maskInt = maskNum === 32 ? 0xffffffff : (0xffffffff << (32 - maskNum)) >>> 0;
            if ((netInt & maskInt) !== (hostInt & maskInt)) return false;
          }
        } else if (h.ip !== filters.ip) {
          return false;
        }
      }
      if (filters.port && h.port !== filters.port) return false;
      if (filters.status_code && h.statusCode !== filters.status_code) return false;
      if (filters.model) {
        const modelLower = filters.model.toLowerCase();
        const hasModel = h.models.some((m) => m.toLowerCase().includes(modelLower));
        if (!hasModel) return false;
      }
      if (filters.country && h.country?.toUpperCase() !== filters.country.toUpperCase()) return false;
      if (filters.hostname && !h.hostname?.toLowerCase().includes(filters.hostname.toLowerCase())) return false;
      return true;
    });
    
    hosts.sort((a, b) => b.lastSeen - a.lastSeen);
    const total = hosts.length;
    return { total, results: hosts.slice((page - 1) * per, page * per) };
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

function matchHost(h: HostRecord, filters: SearchFilters): boolean {
  if (filters.ip) {
    if (filters.ip.includes("/")) {
      const [net, mask] = filters.ip.split("/");
      const maskNum = parseInt(mask);
      if (maskNum >= 8 && maskNum <= 32) {
        const netParts = net.split(".").map(Number);
        const hostParts = h.ip.split(".").map(Number);
        const netInt =
          ((netParts[0] << 24) | (netParts[1] << 16) | (netParts[2] << 8) | netParts[3]) >>> 0;
        const hostInt =
          ((hostParts[0] << 24) | (hostParts[1] << 16) | (hostParts[2] << 8) | hostParts[3]) >>> 0;
        const maskInt = maskNum === 32 ? 0xffffffff : (0xffffffff << (32 - maskNum)) >>> 0;
        if ((netInt & maskInt) !== (hostInt & maskInt)) return false;
      }
    } else if (h.ip !== filters.ip) {
      return false;
    }
  }
  if (filters.port && h.port !== filters.port) return false;
  if (filters.status_code && h.statusCode !== filters.status_code) return false;
  if (filters.model) {
    const modelLower = filters.model.toLowerCase();
    const hasModel = h.models.some((m) => m.toLowerCase().includes(modelLower));
    if (!hasModel) return false;
  }
  if (filters.country && h.country?.toUpperCase() !== filters.country.toUpperCase()) return false;
  if (filters.hostname && !h.hostname?.toLowerCase().includes(filters.hostname.toLowerCase())) return false;
  return true;
}

const GLOBAL_KEY = "__ollama_explorer_store__";

export function getStore(): OllamaStore {
  const g = globalThis as unknown as Record<string, OllamaStore>;
  if (!g[GLOBAL_KEY]) {
    const gistId = process.env.GITHUB_GIST_ID;
    const token = process.env.GITHUB_TOKEN;
    if (gistId && token) {
      g[GLOBAL_KEY] = new GitHubGistStore();
    } else {
      g[GLOBAL_KEY] = new MemoryStore();
    }
  }
  return g[GLOBAL_KEY];
}
