import { getSession } from "@/lib/session";
import { updateStore } from "@/lib/store";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Non authentifie." }, { status: 401 });
  const userId = session.memberId;

  const payload = (await request.json()) as Record<string, unknown>;
  const now = new Date().toISOString();

  await updateStore((data) => {
    data.brandProfile = {
      fullName: stringValue(payload.fullName),
      headline: stringValue(payload.headline),
      bio: stringValue(payload.bio),
      audiences: splitList(payload.audiences),
      offers: splitList(payload.offers),
      proofPoints: splitList(payload.proofPoints),
      contentPillars: splitList(payload.contentPillars),
      preferredCallsToAction: splitList(payload.preferredCallsToAction),
      styleSamples: splitBlocks(payload.styleSamples),
      updatedAt: now,
    };

    data.settings.updatedAt = now;
    if ("sourceContext" in payload) {
      data.settings.sourceContext = stringValue(payload.sourceContext);
    }
  }, userId);

  return Response.json({ message: "Profil mis a jour." });
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function splitList(value: unknown) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function splitBlocks(value: unknown) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/\n\s*---+\s*\n/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}
