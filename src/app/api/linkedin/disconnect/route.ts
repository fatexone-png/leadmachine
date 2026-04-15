import { NextResponse } from "next/server";

import { getSession, clearSessionCookie } from "@/lib/session";
import { updateStore } from "@/lib/store";

export async function POST() {
  const session = await getSession();

  if (session) {
    await updateStore((data) => {
      data.linkedin = {
        connected: false,
        memberId: null,
        memberUrn: null,
        name: null,
        email: null,
        picture: null,
        scope: [],
        accessToken: null,
        accessTokenExpiresAt: null,
        refreshToken: null,
        refreshTokenExpiresAt: null,
        lastSyncAt: null,
      };
      data.settings.updatedAt = new Date().toISOString();
    }, session.memberId);
  }

  const response = NextResponse.json({ message: "LinkedIn deconnecte." });
  clearSessionCookie(response);
  return response;
}
