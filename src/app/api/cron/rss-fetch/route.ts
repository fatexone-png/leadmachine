import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";

import { scoreSignalWithClaude } from "@/lib/claude";
import { RSS_FEEDS, fetchRssItems, filterRssItemsByKeywords } from "@/lib/rss";
import { listAllUserIds, readStore, writeStore } from "@/lib/store";

// Vercel cron runs this at 06:00 UTC every day (before daily-generate at 07:00)
// Fetches curated RSS feeds, scores articles, adds relevant ones as signals

const MAX_SIGNALS_PER_USER = 30;
const MIN_SCORE = 55;

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!configuredSecret || authHeader?.replace("Bearer ", "") !== configuredSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all RSS feeds once (shared across users)
  const allItems = (
    await Promise.allSettled(
      RSS_FEEDS.map((feed) => fetchRssItems(feed.url, feed.label))
    )
  ).flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  const userIds = await listAllUserIds();
  const results: { userId: string; added: number }[] = [];

  for (const userId of userIds) {
    try {
      const count = await processUserSignals(userId, allItems);
      results.push({ userId, added: count });
    } catch {
      results.push({ userId, added: 0 });
    }
  }

  return Response.json({
    rssItems: allItems.length,
    users: results.length,
    results,
  });
}

async function processUserSignals(
  userId: string,
  allItems: Awaited<ReturnType<typeof fetchRssItems>>
): Promise<number> {
  const store = await readStore(userId);

  // Only for users who've completed onboarding
  if (!store.settings.onboardingCompleted) return 0;

  // Build user keyword list from watchlist + content pillars + headline
  const keywords = [
    ...store.watchlist.keywords,
    ...store.watchlist.hashtags.map((h) => h.replace("#", "")),
    ...store.brandProfile.contentPillars,
    store.brandProfile.headline,
  ].filter(Boolean);

  // Filter by user keywords (or keep all if no keywords defined)
  const relevant = keywords.length > 0
    ? filterRssItemsByKeywords(allItems, keywords)
    : allItems.slice(0, 10);

  if (relevant.length === 0) return 0;

  // Get existing content hashes to avoid duplicates
  const existingHashes = new Set(store.signals.map((s) => s.contentHash));

  let added = 0;
  const now = new Date().toISOString();

  for (const item of relevant.slice(0, 8)) {
    const contentHash = createHash("sha256")
      .update(`rss:${item.link}:${item.title}`)
      .digest("hex");

    if (existingHashes.has(contentHash)) continue;

    // Score with Claude if available
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
    // Trim to max signals
    if (store.signals.length > MAX_SIGNALS_PER_USER) {
      store.signals = store.signals
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, MAX_SIGNALS_PER_USER);
    }
    await writeStore(store, userId);
  }

  return added;
}
