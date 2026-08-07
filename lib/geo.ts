const GEO_TOKEN = process.env.GEOIP_TOKEN ?? "";

export async function lookupGeo(
  ip: string
): Promise<{ country?: string; city?: string; asn?: string }> {
  try {
    const res = await fetch(`https://ipinfo.io/${ip}/json`, {
      headers: {
        accept: "application/json",
        ...(GEO_TOKEN ? { authorization: `Bearer ${GEO_TOKEN}` } : {}),
      },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return {};
    const j = await res.json();
    return {
      country: typeof j.country === "string" ? j.country : undefined,
      city: typeof j.city === "string" ? j.city : undefined,
      asn:
        typeof j.org === "string" && j.org ? j.org.split(" ")[0] : undefined,
    };
  } catch {
    return {};
  }
}
