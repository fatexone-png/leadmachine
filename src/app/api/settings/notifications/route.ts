import { getSession } from "@/lib/session";
import { updateStore } from "@/lib/store";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Non authentifie." }, { status: 401 });

  const body = (await request.json()) as {
    emailNotifications?: boolean;
    dailyPostTime?: string;
  };

  await updateStore((data) => {
    if (typeof body.emailNotifications === "boolean") {
      data.settings.emailNotifications = body.emailNotifications;
    }
    if (body.dailyPostTime && /^\d{2}:\d{2}$/.test(body.dailyPostTime)) {
      data.settings.dailyPostTime = body.dailyPostTime;
    }
    data.settings.updatedAt = new Date().toISOString();
  }, session.memberId);

  return Response.json({ ok: true, message: "Préférences mises à jour." });
}
