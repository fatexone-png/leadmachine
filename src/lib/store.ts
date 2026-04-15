import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DEFAULT_SIGNALS,
  DEFAULT_SOURCE_CONTEXT,
  DEFAULT_STYLE_SAMPLES,
  DEFAULT_WATCHLIST,
  createDefaultData,
} from "@/lib/default-data";
import { TALCO_DEMO_DATA } from "@/lib/talco-demo";
import {
  canProtectStoredSecrets,
  decryptStoredSecret,
  encryptStoredSecret,
  isEncryptedStoredSecret,
} from "@/lib/secrets";
import type { AppData, SignalStatus } from "@/lib/types";

// ─── Clés KV ─────────────────────────────────────────────────────────────────

const USERS_REGISTRY_KEY = "leadmachine:users";
const useKV = Boolean(process.env.KV_REST_API_URL);

function kvKeyForUser(userId: string): string {
  return `leadmachine:user:${userId}`;
}

// ─── Queue de mutations par utilisateur ──────────────────────────────────────

const storeMutationQueues = new Map<string, Promise<unknown>>();

function getQueue(userId: string): Promise<unknown> {
  return storeMutationQueues.get(userId) ?? Promise.resolve();
}

function setQueue(userId: string, queue: Promise<unknown>): void {
  storeMutationQueues.set(userId, queue);
}

// ─── Registry des utilisateurs ───────────────────────────────────────────────

export async function registerUser(userId: string): Promise<void> {
  if (useKV) {
    const { kv } = await import("@vercel/kv");
    await kv.sadd(USERS_REGISTRY_KEY, userId);
  } else {
    await mkdir(DATA_DIR, { recursive: true });
    let users: string[] = [];
    try {
      users = JSON.parse(await readFile(USERS_FILE, "utf8")) as string[];
    } catch {
      // fichier absent au premier run
    }
    if (!users.includes(userId)) {
      users.push(userId);
      await writeFile(USERS_FILE, JSON.stringify(users), "utf8");
    }
  }
}

export async function listAllUserIds(): Promise<string[]> {
  if (useKV) {
    const { kv } = await import("@vercel/kv");
    return kv.smembers<string[]>(USERS_REGISTRY_KEY);
  }
  try {
    return JSON.parse(await readFile(USERS_FILE, "utf8")) as string[];
  } catch {
    return [];
  }
}

// ─── KV (Vercel) ─────────────────────────────────────────────────────────────

async function kvGet(userId: string): Promise<AppData | null> {
  const { kv } = await import("@vercel/kv");
  return kv.get<AppData>(kvKeyForUser(userId));
}

async function kvSet(userId: string, data: AppData): Promise<void> {
  const { kv } = await import("@vercel/kv");
  await kv.set(kvKeyForUser(userId), data);
}

// ─── Fichier local (dev) ──────────────────────────────────────────────────────

const DATA_DIR = process.env.VERCEL
  ? path.join(process.env.TMPDIR || "/tmp", "leadmachine-data")
  : path.join(process.cwd(), ".data");

const USERS_FILE = path.join(DATA_DIR, "users.json");

function dataFileForUser(userId: string): string {
  return path.join(DATA_DIR, `user-${userId}.json`);
}

async function fileGet(userId: string): Promise<AppData> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(dataFileForUser(userId), "utf8");
    return JSON.parse(raw) as AppData;
  } catch {
    const defaultData = createDefaultData();
    await fileSet(userId, defaultData);
    return defaultData;
  }
}

async function fileSet(userId: string, data: AppData): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const file = dataFileForUser(userId);
  const tempFile = `${file}.tmp`;
  await writeFile(tempFile, JSON.stringify(data, null, 2), "utf8");
  await rename(tempFile, file);
}

// ─── API publique ─────────────────────────────────────────────────────────────

function getInitialData(): AppData {
  if (process.env.DEMO_CLIENT === "talco") return TALCO_DEMO_DATA;
  return createDefaultData();
}

export async function readStore(userId: string): Promise<AppData> {
  if (useKV) {
    const data = await kvGet(userId);
    if (!data) {
      const defaultData = getInitialData();
      const normalized = normalizeData(defaultData);
      await kvSet(userId, prepareDataForStorage(normalized));
      return normalized;
    }
    const normalized = normalizeData(data);
    if (needsStorageMigration(data)) {
      await kvSet(userId, prepareDataForStorage(normalized));
    }
    return normalized;
  }
  const data = await fileGet(userId);
  const normalized = normalizeData(data);
  if (needsStorageMigration(data)) {
    await fileSet(userId, prepareDataForStorage(normalized));
  }
  return normalized;
}

export async function writeStore(data: AppData, userId: string): Promise<void> {
  const next = normalizeData(data);
  await runSerializedStoreMutation(userId, async () => {
    await persistStore(userId, prepareDataForStorage(next));
  });
}

export async function updateStore(
  updater: (data: AppData) => AppData | void | Promise<AppData | void>,
  userId: string
): Promise<AppData> {
  return runSerializedStoreMutation(userId, async () => {
    const current = await readStore(userId);
    const result = await updater(current);
    const next = normalizeData(result ?? current);
    await persistStore(userId, prepareDataForStorage(next));
    return next;
  });
}

// ─── Normalisation ────────────────────────────────────────────────────────────

function normalizeData(data: AppData): AppData {
  const signals = "signals" in data && Array.isArray(data.signals) ? data.signals : DEFAULT_SIGNALS;
  const drafts = "drafts" in data && Array.isArray(data.drafts) ? data.drafts : [];
  const watchlist = "watchlist" in data && data.watchlist && typeof data.watchlist === "object"
    ? data.watchlist
    : DEFAULT_WATCHLIST;
  const accessToken = safeDecryptStoredSecret(data.linkedin.accessToken);
  const refreshToken = safeDecryptStoredSecret(data.linkedin.refreshToken);
  const linkedInSecretsUnavailable =
    hasEncryptedSecretWithoutKey(data.linkedin.accessToken, accessToken) ||
    hasEncryptedSecretWithoutKey(data.linkedin.refreshToken, refreshToken);

  return {
    ...data,
    plan: data.plan === "pro" ? "pro" : "free",
    postsPublished: typeof data.postsPublished === "number" ? data.postsPublished : 0,
    brandProfile: {
      ...data.brandProfile,
      audiences: sanitizeList(data.brandProfile.audiences),
      offers: sanitizeList(data.brandProfile.offers),
      proofPoints: sanitizeList(data.brandProfile.proofPoints),
      contentPillars: sanitizeList(data.brandProfile.contentPillars),
      preferredCallsToAction: sanitizeList(data.brandProfile.preferredCallsToAction),
      styleSamples: sanitizeList(data.brandProfile.styleSamples ?? DEFAULT_STYLE_SAMPLES),
    },
    settings: {
      ...data.settings,
      aiModel:
        (data.settings as unknown as Record<string, unknown>).aiModel as string ||
        (data.settings as unknown as Record<string, unknown>).openAIModel as string ||
        "claude-sonnet-4-6",
      cronSecretConfigured: Boolean(process.env.CRON_SECRET),
      sourceContext: data.settings?.sourceContext?.trim() || DEFAULT_SOURCE_CONTEXT,
    },
    watchlist: {
      accounts: sanitizeList(watchlist.accounts),
      keywords: sanitizeList(watchlist.keywords),
      hashtags: sanitizeList(watchlist.hashtags),
      updatedAt: watchlist.updatedAt || new Date().toISOString(),
    },
    linkedin: {
      ...data.linkedin,
      connected: linkedInSecretsUnavailable ? false : data.linkedin.connected,
      scope: sanitizeScopeList(data.linkedin.scope),
      accessToken,
      accessTokenExpiresAt: linkedInSecretsUnavailable ? null : data.linkedin.accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt: linkedInSecretsUnavailable ? null : data.linkedin.refreshTokenExpiresAt,
      lastSyncAt: linkedInSecretsUnavailable ? null : data.linkedin.lastSyncAt,
    },
    signals: [...signals]
      .map((signal) => {
        const normalizedAuthor = normalizeSignalAuthor(signal.id, signal.authorName, signal.authorRole);

        return {
          ...signal,
          authorName: normalizedAuthor.authorName,
          authorRole: normalizedAuthor.authorRole,
          status: sanitizeSignalStatus(signal.status),
          fitReasons: sanitizeList(signal.fitReasons ?? []),
          suggestion: signal.suggestion
            ? {
                ...signal.suggestion,
                comments: sanitizeList(signal.suggestion.comments ?? []),
                cautions: sanitizeList(signal.suggestion.cautions ?? []),
              }
            : null,
          selectedComment: signal.selectedComment?.trim() || null,
          imageContext: signal.imageContext?.trim() || "",
          sourceUrl: signal.sourceUrl?.trim() || null,
          sourceType: signal.sourceType?.trim() || "linkedin",
          sourceLabel: signal.sourceLabel?.trim() || "LinkedIn",
          contentHash: signal.contentHash?.trim() || "",
        };
      })
      .sort((left, right) => {
        if (left.status === right.status) {
          if (right.interestScore !== left.interestScore) {
            return right.interestScore - left.interestScore;
          }
          return right.updatedAt.localeCompare(left.updatedAt);
        }
        return rankSignalStatus(left.status) - rankSignalStatus(right.status);
      }),
    drafts: [...drafts]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((draft) => ({
        ...draft,
        truthAnchors: sanitizeList(draft.truthAnchors ?? []),
      })),
  };
}

function rankSignalStatus(status: string) {
  switch (status) {
    case "qualified": return 0;
    case "new": return 1;
    case "comment_ready": return 2;
    case "handled": return 3;
    case "rejected": return 4;
    default: return 5;
  }
}

function sanitizeSignalStatus(status: string): SignalStatus {
  if (status === "posted") {
    return "handled";
  }

  if (
    status === "new" ||
    status === "qualified" ||
    status === "rejected" ||
    status === "comment_ready" ||
    status === "handled"
  ) {
    return status;
  }

  return "new";
}

function normalizeSignalAuthor(
  signalId: string,
  authorName: string | null | undefined,
  authorRole: string | null | undefined
) {
  const trimmedName = authorName?.trim() || "";
  const trimmedRole = authorRole?.trim() || "";

  if (signalId === "seed-signal-1" && trimmedName === "Dirigeant PME") {
    return {
      authorName: "Diane Imbert",
      authorRole: trimmedRole || "Dirigeante PME",
    };
  }

  if (signalId === "seed-signal-2" && trimmedName === "Fondateur SaaS") {
    return {
      authorName: "Nicolas Perret",
      authorRole: trimmedRole || "Fondateur SaaS",
    };
  }

  if (signalId === "seed-signal-3" && trimmedName === "Coach / formateur") {
    return {
      authorName: "Claire Martin",
      authorRole: trimmedRole || "Coach / formatrice",
    };
  }

  return {
    authorName: trimmedName || "Auteur inconnu",
    authorRole: trimmedRole,
  };
}

function prepareDataForStorage(data: AppData): AppData {
  return {
    ...data,
    linkedin: {
      ...data.linkedin,
      accessToken: encryptStoredSecret(data.linkedin.accessToken),
      refreshToken: encryptStoredSecret(data.linkedin.refreshToken),
    },
  };
}

function needsStorageMigration(data: AppData) {
  const signals = Array.isArray(data.signals) ? data.signals : [];
  const linkedin = data.linkedin ?? { accessToken: null, refreshToken: null };
  const hasLegacySignalStatus = signals.some((signal) => (signal.status as string) === "posted");
  const hasLegacyDemoAuthors = signals.some(
    (signal) =>
      (signal.id === "seed-signal-1" && signal.authorName === "Dirigeant PME") ||
      (signal.id === "seed-signal-2" && signal.authorName === "Fondateur SaaS") ||
      (signal.id === "seed-signal-3" && signal.authorName === "Coach / formateur")
  );
  const hasPlaintextSecrets =
    canProtectStoredSecrets() &&
    [linkedin.accessToken, linkedin.refreshToken].some(
      (value) => Boolean(value) && !isEncryptedStoredSecret(value)
    );

  return hasLegacySignalStatus || hasLegacyDemoAuthors || hasPlaintextSecrets;
}

function sanitizeList(values: string[]): string[] {
  return values.map((v) => v.trim()).filter(Boolean);
}

function sanitizeScopeList(values: string[]): string[] {
  return values
    .flatMap((v) => v.split(/[\s,]+/))
    .map((v) => v.trim())
    .filter(Boolean);
}

function safeDecryptStoredSecret(value: string | null) {
  try {
    return decryptStoredSecret(value);
  } catch {
    return null;
  }
}

function hasEncryptedSecretWithoutKey(
  storedValue: string | null | undefined,
  decryptedValue: string | null
) {
  return Boolean(storedValue) && isEncryptedStoredSecret(storedValue) && decryptedValue === null;
}

async function persistStore(userId: string, data: AppData) {
  if (useKV) {
    await kvSet(userId, data);
    return;
  }

  await fileSet(userId, data);
}

function runSerializedStoreMutation<T>(userId: string, mutation: () => Promise<T>): Promise<T> {
  const nextMutation = getQueue(userId).then(mutation, mutation);
  setQueue(userId, nextMutation.then(() => undefined, () => undefined));
  return nextMutation;
}
