import { createHmac } from "node:crypto";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const COOKIE_NAME = "lm_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured.");
  return secret;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function encodeSession(memberId: string): string {
  const secret = getSessionSecret();
  const payload = Buffer.from(JSON.stringify({ memberId, iat: Date.now() })).toString("base64url");
  const sig = sign(payload, secret);
  return `${payload}.${sig}`;
}

export function decodeSession(value: string): { memberId: string } | null {
  try {
    const secret = getSessionSecret();
    const dotIndex = value.lastIndexOf(".");
    if (dotIndex === -1) return null;
    const payload = value.slice(0, dotIndex);
    const sig = value.slice(dotIndex + 1);
    const expected = sign(payload, secret);
    if (expected !== sig) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { memberId: string };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ memberId: string } | null> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(COOKIE_NAME)?.value;
    if (!value) return null;
    return decodeSession(value);
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, memberId: string): void {
  response.cookies.set(COOKIE_NAME, encodeSession(memberId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(COOKIE_NAME);
}
