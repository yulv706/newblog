export function getClientIpAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const candidate =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";

  return candidate.slice(0, 128);
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const forwardedHost =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const forwardedProto =
      request.headers.get("x-forwarded-proto") ??
      new URL(request.url).protocol.replace(":", "");

    return (
      Boolean(forwardedHost) &&
      originUrl.host === forwardedHost &&
      originUrl.protocol === `${forwardedProto}:`
    );
  } catch {
    return false;
  }
}

export function getSafeReturnPath(value: unknown, fallback = "/") {
  if (typeof value !== "string") {
    return fallback;
  }

  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return fallback;
  }

  return path.slice(0, 500);
}
