import { createHash, randomUUID } from "node:crypto";

import { scoreSignalWithClaude } from "@/lib/claude";
import { RSS_FEEDS, fetchRssItems, filterRssItemsByKeywords } from "@/lib/rss";
import { getSession } from "@/lib/session";
import { readStore, writeStore } from "@/lib/store";

const MAX_SIGNALS_PER_USER = 30;
const MIN_SCORE = 40; // lower threshold for manual refresh

export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Non authentifié." }, { status: 401 });
  const userId = session.memberId;

  // Fetch all RSS feeds
  const allItems = (
    await Promise.allSettled(
      RSS_FEEDS.map((feed) => fetchRssItems(feed.url, feed.label))
    )
  ).flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  if (allItems.length === 0) {
    return Response.json({ added: 0, message: "Aucun article récupéré." });
  }

  const store = await readStore(userId);

  const keywords = [
    ...store.watchlist.keywords,
    ...store.watchlist.hashtags.map((h) => h.replace("#", "")),
    ...store.brandProfile.contentPillars,
    store.brandProfile.headline,
  ].filter(Boolean);

  // Try keyword filter first, fall back to all items if no match
  let relevant = keywords.length > 0
    ? filterRssItemsByKeywords(allItems, keywords)
    : allItems;

  // If keyword filter returned nothing, use all items (let Claude score them)
  if (relevant.length === 0) relevant = allItems.slice(0, 10);

  const existingHashes = new Set(store.signals.map((s) => s.contentHash));
  let added = 0;
  const now = new Date().toISOString();

  for (const item of relevant.slice(0, 8)) {
    const contentHash = createHash("sha256")
      .update(`rss:${item.link}:${item.title}`)
      .digest("hex");

    if (existingHashes.has(contentHash)) continue;

    let score = 60;
    let fitReasons: string[] = ["Article récupéré depuis votre veille RSS"];

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const result = await scoreSignalWithClaude(
          `${item.title}. ${item.description}`,
          "",
          store.brandProfile
        );
        score = result.score;
        fitReasons = result.fitReasons.length > 0 ? result.fitReasons : fitReasons;
      } catch {
        // keep defaults
      }
    }

    if (score < MIN_SCORE) continue;

    store.signals.push({
      id: randomUUID(),
      title: item.title.slice(0, 120),
      sourceType: "rss",
      sourceLabel: item.source,
      sourceUrl: item.link,
      authorName: item.source,
      authorRole: "Actualité",
      summary: item.description.slice(0, 280),
      sourceText: `${item.title}. ${item.description}`.slice(0, 1200),
      imageContext: "",
      contentHash,
      interestScore: score,
      fitReasons,
      status: "new",
      suggestion: null,
      selectedComment: null,
      createdAt: now,
      updatedAt: now,
    });

    existingHashes.add(contentHash);
    added++;
  }

  if (added > 0) {
    if (store.signals.length > MAX_SIGNALS_PER_USER) {
      store.signals = store.signals
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, MAX_SIGNALS_PER_USER);
    }
    await writeStore(store, userId);
  }

  const message = added > 0
    ? `${added} nouvel${added > 1 ? "s" : ""} article${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""} dans vos sujets.`
    : "Pas de nouveaux articles — tout est déjà à jour.";

  return Response.json({ added, message });
}
