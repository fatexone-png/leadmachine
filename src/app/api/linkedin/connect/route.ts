import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { getLinkedInAuthorizationUrl, linkedinIsConfigured } from "@/lib/linkedin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const debug = url.searchParams.get("debug") === "1";

  if (debug) {
    return Response.json({
      configured: linkedinIsConfigured(),
      clientId: process.env.LINKEDIN_CLIENT_ID || "MISSING",
      redirectUri: process.env.LINKEDIN_REDIRECT_URI || "MISSING",
      secretSet: Boolean(process.env.LINKEDIN_CLIENT_SECRET),
    });
  }

  if (!linkedinIsConfigured()) {
    return NextResponse.redirect(
      new URL("/?error=linkedin-config", process.env.APP_URL || "http://localhost:3000")
    );
  }

  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(getLinkedInAuthorizationUrl(state));
  response.cookies.set("linkedin_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
