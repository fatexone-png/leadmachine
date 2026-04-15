import { getSession } from "@/lib/session";
import { updateStore } from "@/lib/store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Non authentifie." }, { status: 401 });
  const userId = session.memberId;

  const { id } = await context.params;
  const payload = (await request.json()) as {
    action?: string;
    selectedComment?: string;
  };
  const action = payload.action;
  const now = new Date().toISOString();

  let updated = false;
  let responseMessage = "Signal mis a jour.";
  let responseError = "Signal introuvable ou action invalide.";
  let responseStatus = 404;

  await updateStore((data) => {
    const signal = data.signals.find((item) => item.id === id);

    if (!signal) {
      responseError = "Signal introuvable.";
      return;
    }

    if (action === "qualify") {
      signal.status = signal.suggestion ? "comment_ready" : "qualified";
      responseMessage = "Signal qualifie.";
    } else if (action === "reject") {
      signal.status = "rejected";
      signal.selectedComment = null;
      responseMessage = "Signal ecarte.";
    } else if (action === "selectComment") {
      signal.selectedComment = payload.selectedComment?.trim() || null;
      signal.status = signal.selectedComment ? "comment_ready" : signal.status;
      responseMessage = signal.selectedComment
        ? "Commentaire retenu."
        : "Aucun commentaire retenu.";
    } else if (action === "markHandled" || action === "markPosted") {
      if (!signal.selectedComment) {
        responseError = "Retiens d'abord un commentaire avant de cloturer le signal.";
        responseStatus = 400;
        return;
      }

      signal.status = "handled";
      responseMessage = "Signal marque comme traite manuellement.";
    } else if (action === "reopen") {
      signal.status = signal.suggestion ? "comment_ready" : "new";
      responseMessage = "Signal reouvert.";
    } else {
      responseStatus = 400;
      return;
    }

    signal.updatedAt = now;
    data.settings.updatedAt = now;
    updated = true;
  }, userId);

  if (!updated) {
    return Response.json({ error: responseError }, { status: responseStatus });
  }

  return Response.json({ message: responseMessage });
}
