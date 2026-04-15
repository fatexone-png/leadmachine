import {
  deleteLinkedInPost,
  ensureFreshConnection,
  publishLinkedInPost,
} from "@/lib/linkedin";
import { listAllUserIds, readStore, writeStore } from "@/lib/store";
import type { AppData, Draft } from "@/lib/types";

export const FREE_POST_LIMIT = 5;

export async function publishDraftById(draftId: string, userId: string): Promise<Draft> {
  let data = await readStore(userId);
  const draft = data.drafts.find((entry) => entry.id === draftId);

  if (!draft) {
    throw new Error("Draft not found.");
  }

  if (draft.status === "published") {
    return draft;
  }

  if (!data.linkedin.connected) {
    throw new Error("Connect your LinkedIn account before publishing.");
  }

  // Vérification limite freemium
  if (data.plan === "free" && data.postsPublished >= FREE_POST_LIMIT) {
    throw new Error("FREE_LIMIT_REACHED");
  }

  mutateDraft(data, draftId, {
    status: "publishing",
    lastError: null,
    updatedAt: new Date().toISOString(),
  });
  await writeStore(data, userId);

  try {
    const freshConnection = await ensureFreshConnection(data.linkedin);
    data.linkedin = freshConnection;
    await writeStore(data, userId);

    const publishingTarget = data.drafts.find((entry) => entry.id === draftId);
    if (!publishingTarget) {
      throw new Error("Draft disappeared during publishing.");
    }

    const result = await publishLinkedInPost(freshConnection, publishingTarget);
    const publishedAt = new Date().toISOString();

    data = await readStore(userId);
    mutateDraft(data, draftId, {
      status: "published",
      publishedAt,
      lastError: null,
      remotePostId: result.remotePostId,
      updatedAt: publishedAt,
    });
    // Incrémenter le compteur de posts publiés
    data.postsPublished = (data.postsPublished ?? 0) + 1;
    await writeStore(data, userId);
  } catch (error) {
    data = await readStore(userId);
    mutateDraft(data, draftId, {
      status: "failed",
      lastError: error instanceof Error ? error.message : "Unknown publishing error",
      updatedAt: new Date().toISOString(),
    });
    await writeStore(data, userId);
    throw error;
  }

  const finalState = await readStore(userId);
  const finalDraft = finalState.drafts.find((entry) => entry.id === draftId);

  if (!finalDraft) {
    throw new Error("Published draft not found.");
  }

  return finalDraft;
}

export async function deletePublishedDraftById(draftId: string, userId: string): Promise<Draft> {
  let data = await readStore(userId);
  const draft = data.drafts.find((entry) => entry.id === draftId);

  if (!draft) {
    throw new Error("Draft not found.");
  }

  if (!draft.remotePostId) {
    throw new Error("This draft has no remote LinkedIn post to delete.");
  }

  if (!data.linkedin.connected) {
    throw new Error("Connect your LinkedIn account before deleting a post.");
  }

  mutateDraft(data, draftId, {
    status: "publishing",
    lastError: null,
    updatedAt: new Date().toISOString(),
  });
  await writeStore(data, userId);

  try {
    const freshConnection = await ensureFreshConnection(data.linkedin);
    data.linkedin = freshConnection;
    await writeStore(data, userId);

    await deleteLinkedInPost(freshConnection, draft.remotePostId);

    data = await readStore(userId);
    mutateDraft(data, draftId, {
      status: "draft",
      remotePostId: null,
      publishedAt: null,
      approvedAt: null,
      publishAt: null,
      lastError: null,
      updatedAt: new Date().toISOString(),
    });
    await writeStore(data, userId);
  } catch (error) {
    data = await readStore(userId);
    mutateDraft(data, draftId, {
      status: "published",
      lastError: error instanceof Error ? error.message : "Unknown delete error",
      updatedAt: new Date().toISOString(),
    });
    await writeStore(data, userId);
    throw error;
  }

  const finalState = await readStore(userId);
  const finalDraft = finalState.drafts.find((entry) => entry.id === draftId);

  if (!finalDraft) {
    throw new Error("Draft not found after delete.");
  }

  return finalDraft;
}

export async function publishDueDrafts(): Promise<{
  dryRun: boolean;
  dueIds: string[];
  publishedIds: string[];
  failed: Array<{ id: string; error: string }>;
}> {
  return publishDueDraftsWithOptions({ dryRun: false });
}

export async function publishDueDraftsWithOptions({
  dryRun,
}: {
  dryRun: boolean;
}): Promise<{
  dryRun: boolean;
  dueIds: string[];
  publishedIds: string[];
  failed: Array<{ id: string; error: string }>;
}> {
  const userIds = await listAllUserIds();
  const dueIds: string[] = [];
  const publishedIds: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const userId of userIds) {
    const state = await readStore(userId);
    const now = Date.now();
    const dueDrafts = state.drafts.filter((draft) => {
      if (draft.status !== "scheduled" || !draft.publishAt) return false;
      return new Date(draft.publishAt).getTime() <= now;
    });

    dueIds.push(...dueDrafts.map((d) => d.id));

    if (!dryRun) {
      for (const draft of dueDrafts) {
        try {
          await publishDraftById(draft.id, userId);
          publishedIds.push(draft.id);
        } catch (error) {
          failed.push({
            id: draft.id,
            error: error instanceof Error ? error.message : "Unknown publishing error",
          });
        }
      }
    }
  }

  return { dryRun, dueIds, publishedIds, failed };
}

function mutateDraft(data: AppData, draftId: string, partial: Partial<Draft>) {
  data.drafts = data.drafts.map((draft) =>
    draft.id === draftId ? { ...draft, ...partial } : draft
  );
}
