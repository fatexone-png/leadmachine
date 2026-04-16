import { randomBytes } from "node:crypto";

const TOKEN_TTL_HOURS = 48;

interface TokenPayload {
  draftId: string;
  userId: string;
  action: "approve" | "reject";
  expiresAt: string;
  used: boolean;
}

// ─── In-memory fallback (dev without KV) ─────────────────────────────────────

const memoryStore = new Map<string, TokenPayload>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tokenKey(token: string): string {
  return `leadmachine:email-token:${token}`;
}

function generateToken(): string {
  return randomBytes(24).toString("hex");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function createEmailToken(
  draftId: string,
  userId: string,
  action: "approve" | "reject"
): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();
  const payload: TokenPayload = { draftId, userId, action, expiresAt, used: false };

  if (process.env.KV_REST_API_URL) {
    const { kv } = await import("@vercel/kv");
    await kv.set(tokenKey(token), payload, { ex: TOKEN_TTL_HOURS * 3600 });
  } else {
    memoryStore.set(token, payload);
  }

  return token;
}

export async function consumeEmailToken(token: string): Promise<TokenPayload | null> {
  let payload: TokenPayload | null = null;

  if (process.env.KV_REST_API_URL) {
    const { kv } = await import("@vercel/kv");
    payload = await kv.get<TokenPayload>(tokenKey(token));
  } else {
    payload = memoryStore.get(token) ?? null;
  }

  if (!payload) return null;
  if (payload.used) return null;
  if (new Date(payload.expiresAt) < new Date()) return null;

  // Mark as used
  const usedPayload = { ...payload, used: true };
  if (process.env.KV_REST_API_URL) {
    const { kv } = await import("@vercel/kv");
    await kv.set(tokenKey(token), usedPayload, { ex: 300 }); // keep 5 min for idempotency
  } else {
    memoryStore.set(token, usedPayload);
  }

  return payload;
}
