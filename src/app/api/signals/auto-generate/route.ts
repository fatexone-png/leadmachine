import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";

import { generateTopicsFromProfile } from "@/lib/claude";
import { getSession } from "@/lib/session";
import { readStore, updateStore } from "@/lib/store";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Non authentifié." }, { status: 401 });
  const userId = session.memberId;

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "IA non configurée." }, { status: 503 });
  }

  const store = await readStore(userId);
  const businessContext = store.settings.businessContext;

  if (!businessContext?.trim()) {
    return Response.json({ error: "Profil non configuré. Analysez votre site d'abord." }, { status: 400 });
  }

  // Don't flood existing signals
  const existingCount = store.signals.filter((s) => s.status !== "rejected").length;
  if (existingCount >= 3) {
    return Response.json({ count: 0, message: "Sujets déjà présents." });
  }

  const { force } = (await request.json().catch(() => ({}))) as { force?: boolean };
  if (existingCount > 0 && !force) {
    return Response.json({ count: 0, message: "Sujets déjà présents." });
  }

  const topics = await generateTopicsFromProfile({
    businessContext,
    contentPillars: store.brandProfile.contentPillars ?? [],
    audiences: store.brandProfile.audiences ?? [],
    fullName: store.brandProfile.fullName || store.linkedin.name || "",
  });

  const now = new Date().toISOString();

  const newSignals = topics.map((topic) => ({
    id: randomUUID(),
    title: topic.title,
    sourceType: "ai" as const,
    sourceLabel: "PostPilote IA",
    sourceUrl: null,
    authorName: "PostPilote",
    authorRole: topic.contentPillar,
    summary: topic.why,
    sourceText: `${topic.angle}\n\n${topic.trigger}`,
    imageContext: "",
    contentHash: createHash("sha256").update(`ai:${topic.title}:${now}`).digest("hex"),
    interestScore: topic.interestScore,
    fitReasons: [topic.angle, topic.why, topic.trigger].filter(Boolean),
    status: "qualified" as const,
    suggestion: null,
    selectedComment: null,
    createdAt: now,
    updatedAt: now,
  }));

  await updateStore((data) => {
    data.signals = [...newSignals, ...data.signals].slice(0, 30);
  }, userId);

  return Response.json({ count: newSignals.length, message: `${newSignals.length} sujets générés.` });
}
