import { collectSignalsFromFeed } from "@/lib/feed";
import { listAllUserIds, updateStore } from "@/lib/store";

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const incomingSecret = authHeader?.replace("Bearer ", "");

  if (!configuredSecret) {
    return Response.json(
      { error: "CRON_SECRET is not configured on this deployment." },
      { status: 503 }
    );
  }

  if (incomingSecret !== configuredSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userIds = await listAllUserIds();
  let totalNew = 0;

  for (const userId of userIds) {
    try {
      const data = await updateStore(async (state) => {
        if (state.watchlist.keywords.length === 0 && state.watchlist.accounts.length === 0) {
          return state;
        }

        const result = await collectSignalsFromFeed(
          state.watchlist,
          state.brandProfile,
          state.signals,
          state.linkedin.accessToken
        );

        if (result.signals.length > 0) {
          state.signals = [...state.signals, ...result.signals];
        }
      }, userId);

      const newCount = data.signals.filter(
        (s) => new Date(s.createdAt).getTime() > Date.now() - 60_000
      ).length;

      totalNew += newCount;
    } catch {
      // continue for other users on error
    }
  }

  return Response.json({
    collected: totalNew,
    message: `${totalNew} new signal(s) collected across ${userIds.length} user(s).`,
  });
}
