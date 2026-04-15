import { createHash } from "node:crypto";

import type { AppData } from "@/lib/types";

export const DEFAULT_WATCHLIST: AppData["watchlist"] = {
  accounts: [],
  keywords: [],
  hashtags: [],
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_STYLE_SAMPLES: string[] = [];

export const DEFAULT_SOURCE_CONTEXT = "";

export const DEFAULT_SIGNALS: AppData["signals"] = [
  {
    id: "seed-signal-1",
    title: "Dirigeant sous pression et qualité de décision",
    sourceType: "linkedin",
    sourceLabel: "LinkedIn",
    sourceUrl: null,
    authorName: "Diane Imbert",
    authorRole: "Dirigeante PME",
    summary: "Une prise de position sur la lucidité quand tout se crispe.",
    sourceText:
      "Quand la visibilité baisse, beaucoup d'équipes accélèrent sans plus voir clair. Le vrai sujet n'est pas la vitesse. C'est la qualité de décision quand la pression monte.",
    imageContext: "",
    contentHash: createHash("sha256").update("seed-signal-1:Dirigeant PME:Quand la visibilite").digest("hex"),
    interestScore: 82,
    fitReasons: [
      "Post qui ouvre une conversation sur la gestion de crise",
      "Sujet commentable depuis votre expertise",
      "Bonne visibilité potentielle auprès des dirigeants",
    ],
    status: "qualified",
    suggestion: null,
    selectedComment: null,
    createdAt: "2026-04-14T07:20:00.000Z",
    updatedAt: "2026-04-14T07:20:00.000Z",
  },
  {
    id: "seed-signal-2",
    title: "Quand un projet échoue par manque de clarté",
    sourceType: "linkedin",
    sourceLabel: "LinkedIn",
    sourceUrl: null,
    authorName: "Nicolas Perret",
    authorRole: "Fondateur",
    summary: "Retour d'expérience sur un projet lancé trop tôt sans positionnement clair.",
    sourceText:
      "Nous pensions avoir un problème d'acquisition. En réalité, nous avions surtout un problème de clarté. Tant que l'angle reste flou, rien ne fonctionne — ni le discours, ni la vente.",
    imageContext: "",
    contentHash: createHash("sha256").update("seed-signal-2:Fondateur SaaS:Nous pensions avoir").digest("hex"),
    interestScore: 74,
    fitReasons: [
      "Post ancré dans l'expérience concrète, pas dans l'opinion",
      "Sujet universel — facilement commentable depuis votre vécu",
    ],
    status: "new",
    suggestion: null,
    selectedComment: null,
    createdAt: "2026-04-14T07:15:00.000Z",
    updatedAt: "2026-04-14T07:15:00.000Z",
  },
];

export function createDefaultData(): AppData {
  const now = new Date().toISOString();

  return {
    plan: "free",
    postsPublished: 0,
    brandProfile: {
      fullName: "",
      headline: "",
      bio: "",
      websiteUrl: "",
      styleSources: [],
      tonePreset: "direct",
      postLengthPreset: "medium",
      audiences: [],
      offers: [],
      proofPoints: [],
      contentPillars: [],
      preferredCallsToAction: [],
      styleSamples: [],
      updatedAt: now,
    },
    linkedin: {
      connected: false,
      memberId: null,
      memberUrn: null,
      name: null,
      email: null,
      picture: null,
      scope: [],
      accessToken: null,
      accessTokenExpiresAt: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
      lastSyncAt: null,
    },
    settings: {
      appName: "LeadMachine",
      aiModel: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
      cronSecretConfigured: Boolean(process.env.CRON_SECRET),
      sourceContext: "",
      updatedAt: now,
    },
    watchlist: DEFAULT_WATCHLIST,
    signals: DEFAULT_SIGNALS,
    drafts: [],
  };
}
