import { getSession } from "@/lib/session";
import { updateStore } from "@/lib/store";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Non authentifie." }, { status: 401 });
  const userId = session.memberId;

  const payload = (await request.json()) as Record<string, unknown>;
  const now = new Date().toISOString();

  await updateStore((data) => {
    data.watchlist = {
      accounts: splitList(payload.accounts),
      keywords: splitList(payload.keywords),
      hashtags: splitList(payload.hashtags),
      updatedAt: now,
    };
  }, userId);

  return Response.json({ message: "Watchlist mise a jour." });
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
