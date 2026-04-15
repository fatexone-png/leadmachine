import { publishDueDraftsWithOptions } from "@/lib/publishing";

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const incomingSecret = authHeader?.replace("Bearer ", "");
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  if (!configuredSecret) {
    return Response.json(
      { error: "CRON_SECRET is not configured on this deployment." },
      { status: 503 }
    );
  }

  if (incomingSecret !== configuredSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await publishDueDraftsWithOptions({ dryRun });
  return Response.json(result);
}
