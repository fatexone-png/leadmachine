import { type NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "lm_session";

async function verifySessionCookie(value: string): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;

  const dotIndex = value.lastIndexOf(".");
  if (dotIndex === -1) return false;

  const payload = value.slice(0, dotIndex);
  const sig = value.slice(dotIndex + 1);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expected = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === sig;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Les routes LinkedIn OAuth et cron passent sans auth
  if (pathname.startsWith("/api/linkedin/") || pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  // Protection de /workspace et /api/*
  if (pathname.startsWith("/workspace") || pathname.startsWith("/api/")) {
    const sessionValue = request.cookies.get(COOKIE_NAME)?.value;
    const valid = sessionValue ? await verifySessionCookie(sessionValue) : false;

    if (!valid) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/workspace/:path*", "/api/:path*"],
};
