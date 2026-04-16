import { randomUUID } from "node:crypto";

import { generateLinkedInDraft } from "@/lib/claude";
import { emailConfigured, sendDraftValidationEmail } from "@/lib/email";
import { createEmailToken } from "@/lib/email-tokens";
import { listAllUserIds, readStore, writeStore } from "@/lib/store";

// Vercel cron runs this at 07:00 UTC every day
// Each user who has emailNotifications=true and a connected LinkedIn gets a post generated + email sent

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!configuredSecret || authHeader?.replace("Bearer ", "") !== configuredSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY manquant." }, { status: 503 });
  }

  const userIds = await listAllUserIds();
  const results: { userId: string; status: string; draftTitle?: string }[] = [];

  for (const userId of userIds) {
    try {
      const result = await processUser(userId);
      results.push({ userId, ...result });
    } catch (err) {
      results.push({ userId, status: `erreur: ${String(err)}` });
    }
  }

  return Response.json({ processed: results.length, results });
}

async function processUser(userId: string): Promise<{ status: string; draftTitle?: string }> {
  const store = await readStore(userId);

  // Only process users who opted in and have LinkedIn connected
  if (!store.settings.emailNotifications) return { status: "email-off" };
  if (!store.linkedin.connected || !store.linkedin.email) return { status: "linkedin-not-connected" };
  if (!store.settings.onboardingCompleted) return { status: "onboarding-incomplete" };

  // Don't generate if there's already a pending draft from today
  const today = new Date().toISOString().slice(0, 10);
  const hasTodayDraft = store.drafts.some(
    (d) => d.status === "draft" && d.createdAt.startsWith(today)
  );
  if (hasTodayDraft) return { status: "already-generated-today" };

  // Pick the best signal as inspiration (qualified signals first, then new)
  const bestSignal =
    store.signals.find((s) => s.status === "qualified") ||
    store.signals.find((s) => s.status === "new");

  // Build the spark from signal or from business context
  const spark = bestSignal
    ? `${bestSignal.title}. ${bestSignal.sourceText.slice(0, 400)}`
    : buildAutoSpark(store.settings.businessContext, store.brandProfile.contentPillars);

  const audience =
    store.brandProfile.audiences[0] ||
    "Dirigeants d'entreprise et décideurs";

  const cta =
    store.brandProfile.preferredCallsToAction[0] ||
    "Contactez-moi pour en discuter.";

  // Generate the draft
  const validatedSamples = store.drafts
    .filter((d) => d.status === "published")
    .map((d) => d.content)
    .slice(0, 2);

  const generated = await generateLinkedInDraft(
    {
      spark,
      audience,
      objective: "expertise",
      cta,
      sourceContext: store.settings.sourceContext,
      businessContext: store.settings.businessContext,
    },
    store.brandProfile,
    validatedSamples
  );

  const now = new Date().toISOString();
  const draftId = randomUUID();

  store.drafts.unshift({
    id: draftId,
    title: generated.title,
    spark,
    objective: "expertise",
    audience,
    angle: generated.angle,
    hook: generated.hook,
    content: generated.content,
    cta: generated.cta,
    rationale: generated.rationale,
    hashtags: generated.hashtags,
    truthAnchors: generated.truthAnchors,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    approvedAt: null,
    publishAt: null,
    publishedAt: null,
    remotePostId: null,
    lastError: null,
  });

  // Mark signal as handled if we used it
  if (bestSignal) {
    const signal = store.signals.find((s) => s.id === bestSignal.id);
    if (signal) {
      signal.status = "handled";
      signal.updatedAt = now;
    }
  }

  await writeStore(store, userId);

  // Send validation email if Resend is configured
  if (emailConfigured() && store.linkedin.email) {
    const approveToken = await createEmailToken(draftId, userId, "approve");
    const rejectToken = await createEmailToken(draftId, userId, "reject");

    await sendDraftValidationEmail({
      to: store.linkedin.email,
      name: store.brandProfile.fullName || "Utilisateur",
      draftId,
      draftTitle: generated.title,
      draftContent: generated.content,
      approveToken,
      rejectToken,
    });
  }

  return { status: "done", draftTitle: generated.title };
}

function buildAutoSpark(businessContext: string, contentPillars: string[]): string {
  if (businessContext.trim()) {
    const pillar = contentPillars[Math.floor(Math.random() * contentPillars.length)] || "";
    return pillar
      ? `Réflexion sur ${pillar} dans le contexte de mon activité : ${businessContext.slice(0, 300)}`
      : `Perspective professionnelle du jour sur mon domaine d'activité : ${businessContext.slice(0, 300)}`;
  }
  return "Partagez une réflexion ou observation marquante de votre semaine professionnelle.";
}
