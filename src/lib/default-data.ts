import type { AppData } from "@/lib/types";

export const DEFAULT_WATCHLIST: AppData["watchlist"] = {
  accounts: [],
  keywords: [],
  hashtags: [],
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_STYLE_SAMPLES: string[] = [];

export const DEFAULT_SOURCE_CONTEXT = "";

export const DEFAULT_SIGNALS: AppData["signals"] = [];

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
      appName: "PostPilote",
      aiModel: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
      cronSecretConfigured: Boolean(process.env.CRON_SECRET),
      sourceContext: "",
      businessContext: "",
      charterAcceptedAt: null,
      onboardingCompleted: false,
      emailNotifications: false,
      dailyPostTime: "08:00",
      updatedAt: now,
    },
    watchlist: DEFAULT_WATCHLIST,
    signals: DEFAULT_SIGNALS,
    drafts: [],
  };
}
