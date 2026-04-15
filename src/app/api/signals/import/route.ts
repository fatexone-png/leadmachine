import { scoreSignalWithClaude } from "@/lib/claude";
import { createSignalFromImport } from "@/lib/signals";
import { getSession } from "@/lib/session";
import { readStore, writeStore } from "@/lib/store";
import type { SignalImportInput } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Non authentifie." }, { status: 401 });
  const userId = session.memberId;

  const payload = (await request.json()) as Partial<SignalImportInput>;
  const sourceText = payload.sourceText?.trim();

  if (!sourceText) {
    return Response.json({ error: "Le texte du signal est obligatoire." }, { status: 400 });
  }

  const store = await readStore(userId);
  const imageContext = payload.imageContext?.trim() || "";
  const signal = createSignalFromImport(
    {
      title: payload.title?.trim() || "",
      sourceType: payload.sourceType?.trim() || "linkedin",
      sourceLabel: payload.sourceLabel?.trim() || "LinkedIn",
      sourceUrl: payload.sourceUrl?.trim() || "",
      authorName: payload.authorName?.trim() || "",
      authorRole: payload.authorRole?.trim() || "",
      sourceText,
      imageContext,
    },
    store.brandProfile
  );

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const aiScore = await scoreSignalWithClaude(sourceText, imageContext, store.brandProfile);
      signal.interestScore = aiScore.score;
      signal.fitReasons = aiScore.fitReasons;
      signal.status = aiScore.score >= 65 ? "qualified" : "new";
    } catch {
      // keep regex-based score on failure
    }
  }

  store.signals.unshift(signal);
  store.settings.updatedAt = signal.updatedAt;
  await writeStore(store, userId);

  return Response.json({ message: "Signal ajoute a l'inbox.", signalId: signal.id });
}
