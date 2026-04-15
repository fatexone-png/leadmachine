import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { getLinkedInAuthorizationUrl, linkedinIsConfigured } from "@/lib/linkedin";

export async function GET() {
  if (!linkedinIsConfigured()) {
    return NextResponse.redirect(
      new URL("/workspace?error=linkedin-config", process.env.APP_URL || "http://localhost:3000")
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
