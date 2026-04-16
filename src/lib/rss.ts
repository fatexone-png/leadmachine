export interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

// ─── Curated French professional & legal news feeds ───────────────────────────

export const RSS_FEEDS: { url: string; label: string; sector: string[] }[] = [
  {
    url: "https://www.village-justice.com/rss.php",
    label: "Village de la Justice",
    sector: ["juridique", "droit", "avocat", "barreau"],
  },
  {
    url: "https://www.lemonde.fr/economie/rss_full.xml",
    label: "Le Monde — Économie",
    sector: ["business", "économie", "entreprise"],
  },
  {
    url: "https://www.lesechos.fr/rss/rss_une.xml",
    label: "Les Échos",
    sector: ["business", "économie", "finance", "entreprise"],
  },
  {
    url: "https://www.bfmtv.com/rss/economie/",
    label: "BFM TV — Économie",
    sector: ["business", "économie", "finance"],
  },
  {
    url: "https://www.lefigaro.fr/rss/figaro_actualites.xml",
    label: "Le Figaro",
    sector: ["actualité", "business", "politique"],
  },
  {
    url: "https://www.challenges.fr/rss.xml",
    label: "Challenges",
    sector: ["business", "entrepreneurs", "management"],
  },
];

// ─── Fetch and parse an RSS feed ─────────────────────────────────────────────

export async function fetchRssItems(feedUrl: string, sourceLabel: string): Promise<RssItem[]> {
  let xml: string;
  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent": "LeadMachine/1.0 (+https://tail-rho.vercel.app)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    xml = await response.text();
  } catch {
    return [];
  }

  return parseRssXml(xml, sourceLabel);
}

// ─── Simple RSS XML parser (no external deps) ─────────────────────────────────

function parseRssXml(xml: string, source: string): RssItem[] {
  const items: RssItem[] = [];

  // Extract <item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const title = extractTag(block, "title");
    const link = extractTag(block, "link") || extractTag(block, "guid");
    const description = stripHtml(extractTag(block, "description") || extractTag(block, "summary") || "");
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "dc:date") || new Date().toISOString();

    if (title && link) {
      items.push({ title, link, description, pubDate, source });
    }
  }

  return items.slice(0, 20);
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = regex.exec(xml);
  if (!match) return "";
  return (match[1] ?? match[2] ?? "").trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 500);
}

// ─── Filter items by user keywords ───────────────────────────────────────────

export function filterRssItemsByKeywords(items: RssItem[], keywords: string[]): RssItem[] {
  if (keywords.length === 0) return items;

  const normalized = keywords.map((k) => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

  return items.filter((item) => {
    const text = `${item.title} ${item.description}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return normalized.some((kw) => text.includes(kw));
  });
}
