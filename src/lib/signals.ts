import { createHash, randomUUID } from "node:crypto";

import type { BrandProfile, Signal, SignalImportInput } from "@/lib/types";

export function createSignalFromImport(
  input: SignalImportInput,
  brandProfile: BrandProfile
): Signal {
  const now = new Date().toISOString();
  const sourceText = input.sourceText.trim();
  const title = input.title.trim() || buildTitle(sourceText);
  const summary = buildSummary(sourceText);
  const fitReasons = buildFitReasons(sourceText, brandProfile, input.imageContext);
  const interestScore = buildInterestScore(fitReasons);
  const contentHash = computeContentHash(sourceText, input.authorName, input.sourceType);

  return {
    id: randomUUID(),
    title,
    sourceType: input.sourceType.trim() || "linkedin",
    sourceLabel: input.sourceLabel.trim() || "LinkedIn",
    sourceUrl: normalizeUrl(input.sourceUrl),
    authorName: input.authorName.trim() || "Source inconnue",
    authorRole: input.authorRole?.trim() || "",
    summary,
    sourceText,
    imageContext: input.imageContext.trim(),
    contentHash,
    interestScore,
    fitReasons,
    status: interestScore >= 65 ? "qualified" : "new",
    suggestion: null,
    selectedComment: null,
    createdAt: now,
    updatedAt: now,
  };
}

function buildTitle(sourceText: string) {
  return sourceText
    .split(/[.!?\n]/)
    .map((chunk) => chunk.trim())
    .find(Boolean)
    ?.slice(0, 80) || "Signal detecte";
}

function buildSummary(sourceText: string) {
  return sourceText.replace(/\s+/g, " ").trim().slice(0, 140);
}

function buildFitReasons(
  sourceText: string,
  brandProfile: BrandProfile,
  imageContext: string
) {
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

function buildInterestScore(fitReasons: string[]) {
  return Math.min(92, 35 + fitReasons.length * 14);
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function containsAnyWord(haystack: string, needle: string) {
  return normalizeText(needle)
    .split(" ")
    .filter((chunk) => chunk.length > 3)
    .some((chunk) => haystack.includes(chunk));
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim();
}

function computeContentHash(sourceText: string, authorName: string, sourceType: string): string {
  const normalized = normalizeText(sourceText).slice(0, 500);
  return createHash("sha256").update(`${authorName}:${sourceType}:${normalized}`).digest("hex");
}
