export interface ModelInfo {
  name: string;
  size?: number;
  paramSize?: string;
  quantization?: string;
}

export interface HostRecord {
  ip: string;
  port: number;
  protocol: string;
  statusCode: number;
  title: string;
  server?: string;
  version?: string;
  hostname: string;
  models: string[];
  modelsInfo: ModelInfo[];
  country?: string;
  city?: string;
  asn?: string;
  firstSeen: number;
  lastSeen: number;
}

export interface ModelCount {
  name: string;
  count: number;
}

export interface SearchFilters {
  ip?: string;
  port?: number;
  statusCode?: number;
  model?: string;
  title?: string;
  version?: string;
  country?: string;
  hostname?: string;
  server?: string;
  q?: string;
}

export interface SearchResult {
  total: number;
  results: HostRecord[];
}

export interface ProbeItem {
  ip: string;
  port: number;
  reachable: boolean;
  protocol?: string;
  statusCode?: number;
  version?: string;
  server?: string;
  models?: ModelInfo[];
  error?: string;
  tookMs: number;
  record?: HostRecord;
}

export interface Stats {
  hosts: number;
  models: number;
}
