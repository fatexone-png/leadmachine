import { NextResponse } from "next/server";

import { sendApprovalConfirmationEmail } from "@/lib/email";
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
  let userName: string | null = null;
  let userEmail: string | null = null;
  let draftTitle: string | null = null;
  let publishAt: string | null = null;

  await updateStore((data) => {
    const draft = data.drafts.find((d) => d.id === draftId);
    if (!draft) return;
    if (draft.status !== "draft") return; // already handled

    const now = new Date();
    // Schedule for next day at the configured daily post time
    const [h, m] = (data.settings.dailyPostTime || "08:00").split(":").map(Number);
    const scheduledAt = new Date(now);
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    scheduledAt.setHours(h, m, 0, 0);

    draft.status = "scheduled";
    draft.approvedAt = now.toISOString();
    draft.publishAt = scheduledAt.toISOString();
    draft.updatedAt = now.toISOString();

    userName = data.brandProfile.fullName;
    userEmail = data.linkedin.email;
    draftTitle = draft.title;
    publishAt = draft.publishAt;
  }, userId);

  // Send confirmation email
  if (userEmail && userName && draftTitle) {
    await sendApprovalConfirmationEmail({
      to: userEmail,
      name: userName,
      draftTitle,
      publishAt,
    }).catch(() => undefined);
  }

  return NextResponse.redirect(
    new URL(`/workspace?upgrade=post-approuve`, APP_URL)
  );
}
