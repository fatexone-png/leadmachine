import { randomUUID } from "node:crypto";

import { analyzeWebsiteVoice } from "@/lib/claude";
import { getSession } from "@/lib/session";
import { updateStore } from "@/lib/store";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Non authentifie." }, { status: 401 });
  const userId = session.memberId;

  const payload = (await request.json()) as {
    url?: string;
    label?: string;
    sourceId?: string; // if re-scraping an existing source
    isMainWebsite?: boolean;
  };

  const rawUrl = payload.url?.trim();
  if (!rawUrl) return Response.json({ error: "URL manquante." }, { status: 400 });

  let url: URL;
  try {
    url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
  } catch {
    return Response.json({ error: "URL invalide." }, { status: 400 });
  }

  // Fetch page content
  let htmlContent: string;
  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PostPilote/1.0; +https://tail-rho.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      return Response.json(
        { error: `Impossible d'accéder au site (status ${response.status}).` },
        { status: 422 }
      );
    }
    htmlContent = await response.text();
  } catch {
    return Response.json(
      { error: "Impossible d'accéder au site. Vérifiez l'URL et réessayez." },
      { status: 422 }
    );
  }

  // Strip HTML to plain text
  const plainText = htmlContent
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (plainText.length < 100) {
    return Response.json(
      { error: "Le site ne contient pas assez de texte lisible." },
      { status: 422 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "L'IA n'est pas configurée." }, { status: 503 });
  }

  const analysis = await analyzeWebsiteVoice(plainText, url.hostname);
  const now = new Date().toISOString();
  const label = payload.label?.trim() || url.hostname;
  const isMainWebsite = payload.isMainWebsite ?? false;

  await updateStore((data) => {
    // Update the main website context if it's the primary source
    if (isMainWebsite) {
      data.settings.sourceContext = analysis.sourceContext;
      data.settings.businessContext = analysis.businessContext;
      data.brandProfile.websiteUrl = url.toString();
    }

    // Add/update in styleSources
    if (!data.brandProfile.styleSources) data.brandProfile.styleSources = [];
    const existingIdx = payload.sourceId
      ? data.brandProfile.styleSources.findIndex((s) => s.id === payload.sourceId)
      : data.brandProfile.styleSources.findIndex((s) => s.url === url.toString());

    const sourceEntry = {
      id: payload.sourceId ?? (existingIdx >= 0 ? data.brandProfile.styleSources[existingIdx].id : randomUUID()),
      url: url.toString(),
      label,
      scrapedAt: now,
      toneKeywords: analysis.toneKeywords,
      businessContext: analysis.businessContext,
    };

    if (existingIdx >= 0) {
      data.brandProfile.styleSources[existingIdx] = sourceEntry;
    } else {
      data.brandProfile.styleSources.push(sourceEntry);
    }

    // Add style sample
    if (analysis.styleSample && !data.brandProfile.styleSamples.includes(analysis.styleSample)) {
      data.brandProfile.styleSamples = [
        analysis.styleSample,
        ...data.brandProfile.styleSamples.slice(0, 4),
      ];
    }

    // For non-main sources: always update contexts from latest scrape
    if (!isMainWebsite) {
      if (!data.settings.sourceContext) {
        data.settings.sourceContext = analysis.sourceContext;
      }
      if (!data.settings.businessContext) {
        data.settings.businessContext = analysis.businessContext;
      }
    }

    data.settings.updatedAt = now;
  }, userId);

  return Response.json({
    message: `"${label}" analysé. La plume a été enrichie.`,
    sourceContext: analysis.sourceContext,
    toneKeywords: analysis.toneKeywords,
    label,
  });
}
