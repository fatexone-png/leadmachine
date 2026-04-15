export type DraftStatus =
  | "draft"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export type SignalStatus =
  | "new"
  | "qualified"
  | "rejected"
  | "comment_ready"
  | "handled";

export interface StyleSource {
  id: string;
  url: string;
  label: string;
  scrapedAt: string | null;
  toneKeywords: string[];
}

export interface BrandProfile {
  fullName: string;
  headline: string;
  bio: string;
  websiteUrl: string;
  styleSources: StyleSource[];
  tonePreset: "formal" | "direct" | "educational" | "storytelling";
  postLengthPreset: "short" | "medium" | "long";
  audiences: string[];
  offers: string[];
  proofPoints: string[];
  contentPillars: string[];
  preferredCallsToAction: string[];
  styleSamples: string[];
  updatedAt: string;
}

export interface LinkedInConnection {
  connected: boolean;
  memberId: string | null;
  memberUrn: string | null;
  name: string | null;
  email: string | null;
  picture: string | null;
  scope: string[];
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
  lastSyncAt: string | null;
}

export interface Draft {
  id: string;
  title: string;
  spark: string;
  objective: string;
  audience: string;
  angle: string;
  hook: string;
  content: string;
  cta: string;
  rationale: string;
  hashtags: string[];
  truthAnchors: string[];
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  publishAt: string | null;
  publishedAt: string | null;
  remotePostId: string | null;
  lastError: string | null;
}

export interface AppSettings {
  appName: string;
  aiModel: string;
  cronSecretConfigured: boolean;
  sourceContext: string;
  updatedAt: string;
}

export interface Signal {
  id: string;
  title: string;
  sourceType: string;
  sourceLabel: string;
  sourceUrl: string | null;
  authorName: string;
  authorRole?: string;
  summary: string;
  sourceText: string;
  imageContext: string;
  contentHash: string;
  interestScore: number;
  fitReasons: string[];
  status: SignalStatus;
  suggestion: GeneratedCommentSuggestion | null;
  selectedComment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Watchlist {
  accounts: string[];
  keywords: string[];
  hashtags: string[];
  updatedAt: string;
}

export interface AppData {
  plan: "free" | "pro";
  postsPublished: number;
  brandProfile: BrandProfile;
  linkedin: LinkedInConnection;
  settings: AppSettings;
  watchlist: Watchlist;
  signals: Signal[];
  drafts: Draft[];
}

export interface DraftGenerationInput {
  spark: string;
  audience: string;
  objective: string;
  cta: string;
  sourceContext?: string;
}

export interface CommentSuggestionInput {
  sourceText: string;
  imageContext: string;
  authorName: string;
  targetAudience: string;
  objective: string;
  sourceContext?: string;
}

export interface GeneratedDraft {
  title: string;
  angle: string;
  hook: string;
  content: string;
  cta: string;
  rationale: string;
  hashtags: string[];
  truthAnchors: string[];
}

export interface GeneratedCommentSuggestion {
  lead: string;
  comments: string[];
  bestAngle: string;
  rationale: string;
  cautions: string[];
}

export interface SignalImportInput {
  title: string;
  sourceType: string;
  sourceLabel: string;
  sourceUrl: string;
  authorName: string;
  authorRole?: string;
  sourceText: string;
  imageContext: string;
}
