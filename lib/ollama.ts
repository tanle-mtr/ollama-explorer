import { getStore } from "@/lib/store";
import { lookupGeo } from "@/lib/geo";
import type { HostRecord, ModelInfo, ProbeItem } from "@/lib/types";
import net from "node:net";

const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

function tcpCheck(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      try {
        sock.destroy();
      } catch {
        // 忽略销毁错误
      }
      resolve(ok);
    };
    const sock = net.connect({ host, port, timeout: timeoutMs });
    sock.once("connect", () => finish(true));
    sock.once("timeout", () => finish(false));
    sock.once("error", () => finish(false));
  });
}

export async function probeHost(
  host: string,
  port = 11434
): Promise<ProbeItem> {
  const started = Date.now();
  if (!(await tcpCheck(host, port))) {
    return {
      ip: host,
      port,
      reachable: false,
      error: "unreachable",
      tookMs: Date.now() - started,
    };
  }
  for (const scheme of ["http", "https"] as const) {
    try {
      const tagsRes = await fetch(
        `${scheme}://${host}:${port}/api/tags`,
        {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(4000),
        }
      );
      if (!tagsRes.ok) continue;
      interface TagsEntry {
        name?: unknown;
        size?: unknown;
        details?: { parameter_size?: unknown; quantization_level?: unknown };
      }
      const data = (await tagsRes.json()) as { models?: TagsEntry[] };
      const models: ModelInfo[] = (Array.isArray(data.models)
        ? data.models
        : []
      )
        .map((m) => ({
          name: String(m.name ?? "unknown"),
          size: typeof m.size === "number" ? m.size : undefined,
          paramSize: m.details?.parameter_size
            ? String(m.details.parameter_size)
            : undefined,
          quantization: m.details?.quantization_level
            ? String(m.details.quantization_level)
            : undefined,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      let version: string | undefined;
      let server: string | undefined;
      try {
        const vRes = await fetch(
          `${scheme}://${host}:${port}/api/version`,
          {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(3000),
          }
        );
        if (vRes.ok) {
          const v = await vRes.json();
          version = v.version;
          server = v.server;
        }
      } catch {
        // 忽略版本探测失败
      }

      return {
        ip: host,
        port,
        reachable: true,
        protocol: scheme,
        statusCode: tagsRes.status,
        version,
        server,
        models,
        tookMs: Date.now() - started,
      };
    } catch {
      // 尝试下一个协议
    }
  }
  return {
    ip: host,
    port,
    reachable: false,
    error: "unreachable",
    tookMs: Date.now() - started,
  };
}

export async function probeAndStore(
  host: string,
  port = 11434
): Promise<ProbeItem> {
  const probe = await probeHost(host, port);
  if (!probe.reachable) return probe;

  const store = getStore();
  const existing = (await store.getHosts([host]))[0];
  const geo = IP_RE.test(host) ? await lookupGeo(host) : {};

  const record: HostRecord = {
    ip: host,
    port,
    protocol: probe.protocol as string,
    statusCode: probe.statusCode as number,
    title: `Ollama${probe.version ? ` ${probe.version}` : ""}`,
    server: probe.server,
    version: probe.version,
    hostname: host,
    models: probe.models?.map((m) => m.name) ?? [],
    modelsInfo: probe.models ?? [],
    country: geo.country,
    city: geo.city,
    asn: geo.asn,
    firstSeen: existing?.firstSeen ?? Date.now(),
    lastSeen: Date.now(),
  };
  await store.upsertHost(record);
  return { ...probe, record };
}
