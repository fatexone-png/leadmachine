import { randomUUID } from "node:crypto";

import { generateLinkedInDraft } from "@/lib/claude";
import { getSession } from "@/lib/session";
import { readStore, writeStore } from "@/lib/store";
import type { DraftGenerationInput } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Non authentifie." }, { status: 401 });
  const userId = session.memberId;

  const payload = (await request.json()) as Partial<DraftGenerationInput>;
  const spark = payload.spark?.trim();
  const audience = payload.audience?.trim();
  const objective = payload.objective?.trim();
  const cta = payload.cta?.trim() || "";
  const sourceContext = payload.sourceContext?.trim() || "";

  if (!spark || !audience || !objective) {
    return Response.json(
      { error: "Les champs spark, audience et objectif sont obligatoires." },
      { status: 400 }
    );
  }

  const store = await readStore(userId);
  const validatedPostSamples = store.drafts
    .filter((draft) => draft.status === "published")
    .map((draft) => draft.content)
    .slice(0, 2);
  // Merge business context: explicit from payload (future use) or from settings
  const businessContext = (payload.businessContext?.trim() || store.settings.businessContext?.trim() || "");
  const generated = await generateLinkedInDraft(
    { spark, audience, objective, cta, sourceContext, businessContext },
    store.brandProfile,
    validatedPostSamples
  );
  const now = new Date().toISOString();

  store.drafts.unshift({
    id: randomUUID(),
    title: generated.title,
    spark,
    objective,
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

  await writeStore(store, userId);

  return Response.json({ message: "Brouillon genere." });
}
