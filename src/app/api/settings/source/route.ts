import { getSession } from "@/lib/session";
import { updateStore } from "@/lib/store";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Non authentifie." }, { status: 401 });
  const userId = session.memberId;

  const payload = (await request.json()) as { sourceContext?: string };
  const now = new Date().toISOString();

  await updateStore((data) => {
    data.settings.sourceContext = payload.sourceContext?.trim() || "";
    data.settings.updatedAt = now;
  }, userId);

  return Response.json({ message: "Source editoriale mise a jour." });
}
