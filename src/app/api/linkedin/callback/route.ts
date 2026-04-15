import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { exchangeCodeForConnection } from "@/lib/linkedin";
import { setSessionCookie } from "@/lib/session";
import { registerUser, updateStore } from "@/lib/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("linkedin_oauth_state")?.value;
  const baseUrl = process.env.APP_URL || url.origin;

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, baseUrl)
    );
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/?error=linkedin-state", baseUrl));
  }

  try {
    const connection = await exchangeCodeForConnection(code);
    const memberId = connection.memberId!;

    // Enregistrer l'utilisateur dans le registry et mettre à jour ses données
    await registerUser(memberId);
    await updateStore((data) => {
      data.linkedin = connection;
      // Pre-fill name from LinkedIn on first connection
      if (!data.brandProfile.fullName && connection.name) {
        data.brandProfile.fullName = connection.name;
      }
      data.settings.updatedAt = new Date().toISOString();
    }, memberId);

    const response = NextResponse.redirect(new URL("/workspace?linkedin=connected", baseUrl));
    response.cookies.delete("linkedin_oauth_state");
    setSessionCookie(response, memberId);
    return response;
  } catch (caught) {
    return NextResponse.redirect(
      new URL(
        `/?error=${encodeURIComponent(
          caught instanceof Error ? caught.message : "linkedin-callback"
        )}`,
        baseUrl
      )
    );
  }
}
