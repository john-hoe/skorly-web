/**
 * Minimal Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) sender built on the
 * Web Crypto API so it runs on Cloudflare Workers (the npm `web-push` package
 * depends on Node `crypto`/`https` and does not). Encrypts a single record and
 * signs an ES256 VAPID JWT per push.
 */

const enc = new TextEncoder();

/**
 * Local W3C-shaped view of SubtleCrypto. `@cloudflare/workers-types` models the
 * same runtime methods with different algorithm parameter names (which breaks
 * the standard overloads), so we cast `crypto.subtle` to this interface — every
 * field here matches the actual runtime behaviour.
 */
type Jwk = {
  kty: string;
  crv: string;
  d: string;
  x: string;
  y: string;
  ext: boolean;
};
type EcParams = { name: string; namedCurve: string };
interface SubtleLike {
  importKey(f: "jwk", k: Jwk, a: EcParams, e: boolean, u: string[]): Promise<CryptoKey>;
  importKey(f: "raw", k: Uint8Array, a: EcParams, e: boolean, u: string[]): Promise<CryptoKey>;
  importKey(f: "raw", k: Uint8Array, a: string, e: boolean, u: string[]): Promise<CryptoKey>;
  exportKey(f: "raw", k: CryptoKey): Promise<ArrayBuffer>;
  generateKey(a: EcParams, e: boolean, u: string[]): Promise<CryptoKeyPair>;
  deriveBits(
    a: { name: string; public?: CryptoKey; salt?: BufferSource; info?: BufferSource; hash?: string },
    k: CryptoKey,
    len: number,
  ): Promise<ArrayBuffer>;
  sign(a: { name: string; hash: string }, k: CryptoKey, d: BufferSource): Promise<ArrayBuffer>;
  encrypt(a: { name: string; iv: BufferSource }, k: CryptoKey, d: BufferSource): Promise<ArrayBuffer>;
}
const subtle = crypto.subtle as unknown as SubtleLike;

function b64urlToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]!);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** Build a JWK private key from raw VAPID keys (d = 32B priv, public = 65B point). */
async function importVapidKey(privB64url: string, pubB64url: string): Promise<CryptoKey> {
  const pub = b64urlToBytes(pubB64url); // 0x04 || X(32) || Y(32)
  const x = bytesToB64url(pub.slice(1, 33));
  const y = bytesToB64url(pub.slice(33, 65));
  const jwk: Jwk = {
    kty: "EC",
    crv: "P-256",
    d: privB64url.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    x,
    y,
    ext: true,
  };
  return subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function vapidAuthHeader(opts: {
  endpoint: string;
  publicKey: string;
  privateKey: string;
  subject: string;
}): Promise<string> {
  const url = new URL(opts.endpoint);
  const aud = `${url.protocol}//${url.host}`;
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToB64url(
    enc.encode(
      JSON.stringify({
        aud,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: opts.subject,
      }),
    ),
  );
  const signingInput = `${header}.${payload}`;
  const key = await importVapidKey(opts.privateKey, opts.publicKey);
  const sig = await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(signingInput));
  const jwt = `${signingInput}.${bytesToB64url(sig)}`;
  return `vapid t=${jwt}, k=${opts.publicKey.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

/** Encrypt the payload into an aes128gcm body for the given subscription. */
async function encryptPayload(
  payload: Uint8Array,
  ua_public_b64: string,
  auth_secret_b64: string,
): Promise<Uint8Array> {
  const uaPublic = b64urlToBytes(ua_public_b64); // 65B
  const authSecret = b64urlToBytes(auth_secret_b64); // 16B

  // Ephemeral (application server) ECDH keypair.
  const asKeyPair = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const asPublicRaw = new Uint8Array(await subtle.exportKey("raw", asKeyPair.publicKey)); // 65B

  const uaPublicKey = await subtle.importKey(
    "raw",
    uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const ecdhSecret = new Uint8Array(
    await subtle.deriveBits({ name: "ECDH", public: uaPublicKey }, asKeyPair.privateKey, 256),
  );

  // RFC 8291 key derivation.
  const keyInfo = concat(
    enc.encode("WebPush: info\0"),
    uaPublic,
    asPublicRaw,
  );
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  // Single record: plaintext || 0x02 delimiter.
  const plaintext = concat(payload, new Uint8Array([0x02]));
  const aesKey = await subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, plaintext),
  );

  // Header: salt(16) || rs(4, uint32 BE) || idlen(1) || keyid(as_public 65).
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const header = concat(salt, rs, new Uint8Array([asPublicRaw.length]), asPublicRaw);
  return concat(header, ciphertext);
}

export interface PushTargetLike {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export type SendResult =
  | { ok: true }
  | { ok: false; status: number; gone: boolean };

/** Send one encrypted push. `gone` (404/410) means caller should delete the sub. */
export async function sendPush(
  target: PushTargetLike,
  payload: unknown,
  vapid: VapidConfig,
  ttlSeconds = 4 * 60 * 60,
): Promise<SendResult> {
  const body = await encryptPayload(
    enc.encode(JSON.stringify(payload)),
    target.keys.p256dh,
    target.keys.auth,
  );
  const auth = await vapidAuthHeader({
    endpoint: target.endpoint,
    publicKey: vapid.publicKey,
    privateKey: vapid.privateKey,
    subject: vapid.subject,
  });

  const res = await fetch(target.endpoint, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(ttlSeconds),
      Urgency: "high",
    },
    body,
  });

  if (res.ok) return { ok: true };
  return { ok: false, status: res.status, gone: res.status === 404 || res.status === 410 };
}
