import { generateLinkedInCommentSuggestions } from "@/lib/claude";
import { getSession } from "@/lib/session";
import { readStore, updateStore } from "@/lib/store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Non authentifie." }, { status: 401 });
  const userId = session.memberId;

  const { id } = await context.params;
  const payload = (await request.json()) as {
    targetAudience?: string;
    objective?: string;
    sourceContext?: string;
  };

  const targetAudience = payload.targetAudience?.trim();
  const objective = payload.objective?.trim();
  const sourceContext = payload.sourceContext?.trim() || "";

  if (!targetAudience || !objective) {
    return Response.json(
      { error: "Audience cible et objectif sont obligatoires." },
      { status: 400 }
    );
  }

  const store = await readStore(userId);
  const signal = store.signals.find((item) => item.id === id);

  if (!signal) {
    return Response.json({ error: "Signal introuvable." }, { status: 404 });
  }

  const validatedPostSamples = store.drafts
    .filter((draft) => draft.status === "published")
    .map((draft) => draft.content)
    .slice(0, 2);

  const suggestion = await generateLinkedInCommentSuggestions(
    {
      sourceText: signal.sourceText,
      imageContext: signal.imageContext,
      authorName: signal.authorName,
      targetAudience,
      objective,
      sourceContext,
    },
    store.brandProfile,
    validatedPostSamples
  );

  const updatedAt = new Date().toISOString();

  await updateStore((data) => {
    const currentSignal = data.signals.find((item) => item.id === id);

    if (!currentSignal) {
      return;
    }

    currentSignal.suggestion = suggestion;
    currentSignal.selectedComment = null;
    currentSignal.status = "comment_ready";
    currentSignal.updatedAt = updatedAt;
    data.settings.updatedAt = updatedAt;
  }, userId);

  return Response.json({ message: "Commentaire propose.", suggestion });
}
