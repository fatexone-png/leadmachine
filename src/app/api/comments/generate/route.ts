import { generateLinkedInCommentSuggestions } from "@/lib/claude";
import { getSession } from "@/lib/session";
import { readStore } from "@/lib/store";
import type { CommentSuggestionInput } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Non authentifie." }, { status: 401 });
  const userId = session.memberId;

  const payload = (await request.json()) as Partial<CommentSuggestionInput>;
  const sourceText = payload.sourceText?.trim();
  const imageContext = payload.imageContext?.trim() || "";
  const authorName = payload.authorName?.trim() || "";
  const targetAudience = payload.targetAudience?.trim();
  const objective = payload.objective?.trim();
  const sourceContext = payload.sourceContext?.trim() || "";

  if (!sourceText || !targetAudience || !objective) {
    return Response.json(
      {
        error:
          "Les champs texte source, audience cible et objectif sont obligatoires.",
      },
      { status: 400 }
    );
  }

  const store = await readStore(userId);
  const validatedPostSamples = store.drafts
    .filter((draft) => draft.status === "published")
    .map((draft) => draft.content)
    .slice(0, 2);

  const suggestion = await generateLinkedInCommentSuggestions(
    {
      sourceText,
      imageContext,
      authorName,
      targetAudience,
      objective,
      sourceContext,
    },
    store.brandProfile,
    validatedPostSamples
  );

  return Response.json({
    message: "Commentaires generes.",
    suggestion,
  });
}
