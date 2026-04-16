import { getSession } from "@/lib/session";
import { updateStore } from "@/lib/store";

export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Non authentifie." }, { status: 401 });

  await updateStore((data) => {
    data.settings.charterAcceptedAt = new Date().toISOString();
    data.settings.updatedAt = new Date().toISOString();
  }, session.memberId);

  return Response.json({ ok: true });
}
