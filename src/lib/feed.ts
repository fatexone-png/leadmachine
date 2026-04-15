import { createSignalFromImport } from "@/lib/signals";
import { scoreSignalWithClaude } from "@/lib/claude";
import type { BrandProfile, Signal, Watchlist } from "@/lib/types";

const LINKEDIN_SEARCH_URL = "https://www.linkedin.com/search/feed";
const LINKEDIN_FEED_URL = "https://www.linkedin.com/feed/";
const MAX_SIGNALS_PER_RUN = 20;
const MIN_SCORE_FOR_AUTO_IMPORT = 60;

export interface CollectedSignal {
  sourceText: string;
  authorName: string;
  sourceUrl: string | null;
  imageContext: string;
  sourceType: string;
  sourceLabel: string;
}

export interface FeedCollectionResult {
  collected: number;
  imported: number;
  skipped: number;
  duplicates: number;
  errors: number;
  signals: Signal[];
}

/**
 * Collects signals from LinkedIn based on the watchlist.
 * Since LinkedIn doesn't have a public search API, this uses
 * a heuristic approach: scans the feed for relevant content.
 */
export async function collectSignalsFromFeed(
  watchlist: Watchlist,
  brandProfile: BrandProfile,
  existingSignals: Signal[],
  linkedinAccessToken: string | null
): Promise<FeedCollectionResult> {
  const result: FeedCollectionResult = {
    collected: 0,
    imported: 0,
    skipped: 0,
    duplicates: 0,
    errors: 0,
    signals: [],
  };

  // No access token — skip collection (no automated LinkedIn API for feed scraping)
  // In production, you'd use a browser automation or RSS-like service
  if (!linkedinAccessToken) {
    return result;
  }

  try {
    const collected = await collectFromLinkedInFeed(watchlist, linkedinAccessToken);
    result.collected = collected.length;

    for (const item of collected.slice(0, MAX_SIGNALS_PER_RUN)) {
      const contentHash = computeContentHash(item.sourceText, item.authorName, item.sourceType);

      // Deduplicate against existing signals
      if (existingSignals.some((s) => s.contentHash === contentHash)) {
        result.duplicates++;
        continue;
      }

      // Quick heuristic scoring first
      const fitReasons = buildFitReasons(item.sourceText, brandProfile, item.imageContext);
      const heuristicScore = fitReasons.length * 14 + 35;

      // Only auto-import if score meets threshold
      if (heuristicScore < MIN_SCORE_FOR_AUTO_IMPORT) {
        result.skipped++;
        continue;
      }

      // Enhance with Claude scoring if available
      let finalScore = heuristicScore;
      let finalFitReasons = fitReasons;

      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const claudeResult = await scoreSignalWithClaude(
            item.sourceText,
            item.imageContext,
            brandProfile
          );
          finalScore = claudeResult.score;
          finalFitReasons = claudeResult.fitReasons;
        } catch {
          // Fall back to heuristic score
        }
      }

      if (finalScore < MIN_SCORE_FOR_AUTO_IMPORT) {
        result.skipped++;
        continue;
      }

      // Create signal from collected content
      const signal = createSignalFromImport(
        {
          title: buildTitle(item.sourceText),
          sourceType: item.sourceType,
          sourceLabel: item.sourceLabel,
          sourceUrl: item.sourceUrl ?? "",
          authorName: item.authorName,
          sourceText: item.sourceText,
          imageContext: item.imageContext,
        },
        brandProfile
      );

      // Override with enhanced scoring results
      signal.interestScore = finalScore;
      signal.fitReasons = finalFitReasons;
      signal.status = finalScore >= 65 ? "qualified" : "new";

      result.signals.push(signal);
      result.imported++;
    }
  } catch {
    result.errors++;
  }

  return result;
}

/**
 * Collects recent posts from LinkedIn feed matching watchlist criteria.
 * Uses LinkedIn's internal feed API via the access token.
 */
async function collectFromLinkedInFeed(
  watchlist: Watchlist,
  accessToken: string
): Promise<CollectedSignal[]> {
  const signals: CollectedSignal[] = [];

  // LinkedIn REST API v2 doesn't expose a general feed search endpoint.
  // Instead, we use the UGC Posts search API to find relevant content.
  // This searches for posts containing watchlist keywords.

  const searchTerms = [
    ...watchlist.keywords,
    ...watchlist.hashtags.map((h) => h.replace("#", "")),
  ];

  const uniqueTerms = [...new Set(searchTerms)].filter(Boolean).slice(0, 10);

  for (const term of uniqueTerms) {
    try {
      const params = new URLSearchParams({
        q: "content",
        searchText: term,
        authorType: "non-self",
        count: "10",
        start: "0",
      });

      const response = await fetch(
        `https://api.linkedin.com/v2/search?q=${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Restli-Protocol-Version": "2.0.0",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as {
        elements?: Array<{
          author?: string;
          text?: string;
          created?: Record<string, number>;
        }>;
      };

      for (const element of data.elements ?? []) {
        if (!element.text || element.text.length < 50) {
          continue;
        }

        signals.push({
          sourceText: element.text,
          authorName: element.author ?? "Unknown",
          sourceUrl: null,
          imageContext: "",
          sourceType: "linkedin",
          sourceLabel: "LinkedIn",
        });
      }
    } catch {
      // Continue with next term
    }
  }

  return signals;
}

/**
 * Builds a title from the source text.
 */
function buildTitle(sourceText: string): string {
  return sourceText
    .split(/[.!?\n]/)
    .map((chunk) => chunk.trim())
    .find(Boolean)
    ?.slice(0, 80) || "Signal detecte";
}

/**
 * Builds fit reasons by matching content against brand profile.
 */
function buildFitReasons(
  sourceText: string,
  brandProfile: BrandProfile,
  imageContext: string
): string[] {
  const haystack = normalizeText([sourceText, imageContext].filter(Boolean).join(" "));
  const reasons = new Set<string>();

  for (const pillar of brandProfile.contentPillars) {
    if (containsAnyWord(haystack, pillar)) {
      reasons.add(`Recoupe un pilier de contenu: ${pillar}`);
    }
  }

  for (const offer of brandProfile.offers) {
    if (containsAnyWord(haystack, offer)) {
      reasons.add(`Peut nourrir une offre: ${offer}`);
    }
  }

  for (const audience of brandProfile.audiences) {
    if (containsAnyWord(haystack, audience)) {
      reasons.add(`Parle a une audience cible: ${audience}`);
    }
  }

  if (/(risque|pression|discipline|execution|leadership|strategie|decision)/.test(haystack)) {
    reasons.add("Le sujet porte une tension concrete et commentable");
  }

  if (/(retour|lecon|erreur|echec|cas|terrain|experience)/.test(haystack)) {
    reasons.add("Le contenu semble ancre dans l'experience plutot que dans l'opinion vague");
  }

  return Array.from(reasons).slice(0, 4);
}

/**
 * Computes a content hash for deduplication.
 */
function computeContentHash(sourceText: string, authorName: string, sourceType: string): string {
  const normalized = normalizeText(sourceText).slice(0, 500);
  const { createHash } = require("node:crypto");
  return createHash("sha256").update(`${authorName}:${sourceType}:${normalized}`).digest("hex");
}

/**
 * Checks if a haystack contains any significant word from a needle.
 */
function containsAnyWord(haystack: string, needle: string): boolean {
  return normalizeText(needle)
    .split(" ")
    .filter((chunk) => chunk.length > 3)
    .some((chunk) => haystack.includes(chunk));
}

/**
 * Normalizes text for comparison.
 */
function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim();
}
