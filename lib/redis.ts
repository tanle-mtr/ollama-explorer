const REST_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

export const redisConfigured = Boolean(REST_URL && REST_TOKEN);

interface RedisResponse {
  result?: unknown;
  error?: string;
}

async function request(body: unknown, path = ""): Promise<RedisResponse[]> {
  try {
    const res = await fetch(`${REST_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Upstash Redis 请求失败: ${res.status}`);
    return (await res.json()) as RedisResponse[];
  } catch (e) {
    console.error("[Redis] request error:", e);
    return [];
  }
}

export async function redisCommand(cmd: string, args: string[]): Promise<unknown> {
  const r = (await request([cmd, ...args])) as RedisResponse;
  if (r.error) throw new Error(`Redis 错误: ${r.error}`);
  return r.result;
}

export async function redisPipeline(
  commands: Array<{ cmd: string; args: string[] }>
): Promise<unknown[]> {
  const res = (await request(
    commands.map((c) => [c.cmd, ...c.args]),
    "/pipeline"
  )) as RedisResponse[];
  return res.map((r) => {
    if (r.error) throw new Error(`Redis 错误: ${r.error}`);
    return r.result;
  });
}
