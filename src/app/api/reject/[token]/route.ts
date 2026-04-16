import { NextResponse } from "next/server";

import { consumeEmailToken } from "@/lib/email-tokens";
import { updateStore } from "@/lib/store";

const APP_URL = process.env.APP_URL || "https://tail-rho.vercel.app";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const payload = await consumeEmailToken(token);

  if (!payload) {
    return NextResponse.redirect(
      new URL(`/workspace?error=token-invalide`, APP_URL)
    );
  }

  const { draftId, userId } = payload;

  await updateStore((data) => {
    const draft = data.drafts.find((d) => d.id === draftId);
    if (!draft) return;
    if (draft.status !== "draft") return;

    draft.status = "failed";
    draft.lastError = "Refusé par email le " + new Date().toLocaleDateString("fr-FR");
    draft.updatedAt = new Date().toISOString();
  }, userId);

  return NextResponse.redirect(
    new URL(`/workspace?error=post-refuse`, APP_URL)
  );
}
