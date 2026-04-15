import { deletePublishedDraftById, publishDraftById } from "@/lib/publishing";
import { getSession } from "@/lib/session";
import { readStore, writeStore } from "@/lib/store";
import type { Draft } from "@/lib/types";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/drafts/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Non authentifie." }, { status: 401 });
  const userId = session.memberId;

  const { id } = await context.params;
  const payload = (await request.json()) as Record<string, unknown>;
  const action = typeof payload.action === "string" ? payload.action : "save";

  if (action === "publishNow") {
    try {
      await persistEditableFields(id, payload, userId);
      await publishDraftById(id, userId);
      return Response.json({ message: "Post publie sur LinkedIn." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Publication impossible.";
      if (message === "FREE_LIMIT_REACHED") {
        return Response.json({ error: "FREE_LIMIT_REACHED" }, { status: 402 });
      }
      return Response.json({ error: message }, { status: 400 });
    }
  }

  if (action === "deleteRemote") {
    try {
      await deletePublishedDraftById(id, userId);
      return Response.json({ message: "Post supprime sur LinkedIn." });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Suppression impossible." },
        { status: 400 }
      );
    }
  }

  const store = await readStore(userId);
  const draft = store.drafts.find((entry) => entry.id === id);

  if (!draft) {
    return Response.json({ error: "Draft introuvable." }, { status: 404 });
  }

  applyEditableFields(draft, payload);
  draft.updatedAt = new Date().toISOString();

  if (action === "approve") {
    draft.status = draft.publishAt ? "scheduled" : "approved";
    draft.approvedAt = draft.approvedAt || draft.updatedAt;
    draft.lastError = null;
  }

  if (action === "schedule") {
    if (!draft.approvedAt) {
      draft.approvedAt = draft.updatedAt;
    }

    if (!draft.publishAt) {
      return Response.json(
        { error: "Choisis une date de publication avant de programmer." },
        { status: 400 }
      );
    }

    draft.status = "scheduled";
    draft.lastError = null;
  }

  if (action === "save" && draft.status === "failed") {
    draft.status = "draft";
    draft.lastError = null;
  }

  await writeStore(store, userId);

  return Response.json({
    message:
      action === "approve"
        ? "Draft approuve."
        : action === "schedule"
          ? "Post programme."
          : "Draft sauvegarde.",
  });
}

async function persistEditableFields(id: string, payload: Record<string, unknown>, userId: string) {
  const store = await readStore(userId);
  const draft = store.drafts.find((entry) => entry.id === id);

  if (!draft) {
    throw new Error("Draft introuvable.");
  }

  applyEditableFields(draft, payload);
  draft.updatedAt = new Date().toISOString();

  if (!draft.approvedAt) {
    draft.approvedAt = draft.updatedAt;
  }

  if (draft.status === "draft" || draft.status === "failed") {
    draft.status = "approved";
  }

  await writeStore(store, userId);
}

function applyEditableFields(draft: Draft, payload: Record<string, unknown>) {
  draft.title = stringValue(payload.title) || draft.title;
  draft.angle = stringValue(payload.angle) || draft.angle;
  draft.hook = stringValue(payload.hook) || draft.hook;
  draft.content = stringValue(payload.content) || draft.content;
  draft.cta = stringValue(payload.cta) || draft.cta;

  const hashtags = splitList(payload.hashtags);
  if (hashtags.length > 0) {
    draft.hashtags = hashtags;
  }

  const publishAt = stringValue(payload.publishAt);
  draft.publishAt = publishAt ? new Date(publishAt).toISOString() : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function splitList(value: unknown) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
