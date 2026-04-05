export const AUTH_COOKIE_NAME = "admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  sub: string;
  iat: number;
  exp: number;
};

type VerifyOptions = {
  now?: number;
};

type SignOptions = {
  now?: number;
  expiresInSeconds?: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
function getWebCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error("A Web Crypto implementation is unavailable in this runtime.");
  }

  return globalThis.crypto;
}

function toBase64Url(bytes: Uint8Array) {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(base64Url: string) {
  const normalized = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(`${normalized}${padding}`);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function getAuthSecret() {
  return process.env.AUTH_SECRET ?? "development-auth-secret";
}

async function importSigningKey(secret: string) {
  const webCrypto = await getWebCrypto();
  return webCrypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signMessage(message: string, secret: string) {
  const key = await importSigningKey(secret);
  const webCrypto = await getWebCrypto();
  const signature = await webCrypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toBase64Url(new Uint8Array(signature));
}

async function verifyMessage(
  message: string,
  signature: string,
  secret: string
) {
  const key = await importSigningKey(secret);
  const webCrypto = await getWebCrypto();
  return webCrypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(signature),
    encoder.encode(message)
  );
}

function parseTokenPayload(tokenPayload: string) {
  try {
    const decoded = decoder.decode(fromBase64Url(tokenPayload));
    const payload = JSON.parse(decoded) as SessionPayload;

    if (
      typeof payload.sub !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function signSessionToken(
  username: string,
  options: SignOptions = {}
) {
  const nowMs = options.now ?? Date.now();
  const nowSeconds = Math.floor(nowMs / 1000);
  const expiresInSeconds = options.expiresInSeconds ?? SESSION_TTL_SECONDS;
  const payload: SessionPayload = {
    sub: username,
    iat: nowSeconds,
    exp: nowSeconds + expiresInSeconds,
  };

  const header = toBase64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${header}.${body}`;
  const signature = await signMessage(unsignedToken, getAuthSecret());

  return `${unsignedToken}.${signature}`;
}

export async function verifySessionToken(
  token: string,
  options: VerifyOptions = {}
) {
  const [header, payload, signature] = token.split(".");

  if (!header || !payload || !signature) {
    return null;
  }

  let isValidSignature = false;

  try {
    isValidSignature = await verifyMessage(
      `${header}.${payload}`,
      signature,
      getAuthSecret()
    );
  } catch {
    return null;
  }

  if (!isValidSignature) {
    return null;
  }

  const parsedPayload = parseTokenPayload(payload);
  if (!parsedPayload) {
    return null;
  }

  const nowMs = options.now ?? Date.now();
  const nowSeconds = Math.floor(nowMs / 1000);

  if (parsedPayload.exp <= nowSeconds) {
    return null;
  }

  return parsedPayload;
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
