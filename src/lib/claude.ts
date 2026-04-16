import Anthropic from "@anthropic-ai/sdk";

import type {
  BrandProfile,
  CommentSuggestionInput,
  DraftGenerationInput,
  GeneratedCommentSuggestion,
  GeneratedDraft,
} from "@/lib/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultHeaders: {
    "anthropic-beta": "prompt-caching-2024-07-31",
  },
});

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

// ─── Public exports ───────────────────────────────────────────────────────────

export async function generateLinkedInDraft(
  input: DraftGenerationInput,
  brandProfile: BrandProfile,
  validatedPostSamples: string[] = []
): Promise<GeneratedDraft> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return buildFallbackDraft(input, brandProfile);
  }

  try {
    const initial = await requestDraft(input, brandProfile, validatedPostSamples, "base");
    const weakSignals = findWeakSignals(initial);

    if (weakSignals.length === 0) return initial;

    try {
      return await requestDraft(
        input,
        brandProfile,
        validatedPostSamples,
        "refinement",
        initial,
        weakSignals
      );
    } catch {
      return initial;
    }
  } catch {
    return buildFallbackDraft(input, brandProfile);
  }
}

export async function generateLinkedInCommentSuggestions(
  input: CommentSuggestionInput,
  brandProfile: BrandProfile,
  validatedPostSamples: string[] = []
): Promise<GeneratedCommentSuggestion> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return buildFallbackCommentSuggestions(input, brandProfile);
  }

  try {
    return await requestComments(input, brandProfile, validatedPostSamples);
  } catch {
    return buildFallbackCommentSuggestions(input, brandProfile);
  }
}

export async function scoreSignalWithClaude(
  sourceText: string,
  imageContext: string,
  brandProfile: BrandProfile
): Promise<{ score: number; fitReasons: string[] }> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: [
      {
        type: "text",
        text: buildScoringInstructions(brandProfile),
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [SIGNAL_SCORE_TOOL],
    tool_choice: { type: "tool", name: "score_signal" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildBrandProfileContext(brandProfile),
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: buildScoringPrompt(sourceText, imageContext),
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("No tool_use block in signal scoring response");
  }

  const result = toolUse.input as { score: number; fitReasons: string[] };
  return {
    score: Math.min(100, Math.max(0, result.score)),
    fitReasons: (result.fitReasons || []).slice(0, 5),
  };
}

export async function analyzeWebsiteVoice(
  websiteText: string,
  websiteUrl: string
): Promise<{ sourceContext: string; businessContext: string; styleSample: string; toneKeywords: string[] }> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    tools: [WEBSITE_VOICE_TOOL],
    tool_choice: { type: "tool", name: "extract_brand_voice" },
    messages: [
      {
        role: "user",
        content: [
          "Analyze this website content and extract TWO things separately:",
          "1. The BUSINESS CONTEXT: what this person or firm actually does, for whom, in which domain — concrete enough that an AI could generate LinkedIn posts on the RIGHT topics (law, accounting, consulting, tech — be specific about practice areas, client types, expertise).",
          "2. The WRITING STYLE: tone, voice, sentence rhythm — how they write, not what they write about.",
          "",
          `Website: ${websiteUrl}`,
          "",
          "Content:",
          websiteText.slice(0, 9000),
        ].join("\n"),
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("No tool_use block in website voice analysis response");
  }

  return toolUse.input as { sourceContext: string; businessContext: string; styleSample: string; toneKeywords: string[] };
}

export interface AIGeneratedTopic {
  title: string;
  angle: string;
  why: string;
  trigger: string;
  interestScore: number;
  contentPillar: string;
}

export async function generateTopicsFromProfile({
  businessContext,
  contentPillars,
  audiences,
  fullName,
}: {
  businessContext: string;
  contentPillars: string[];
  audiences: string[];
  fullName: string;
}): Promise<AIGeneratedTopic[]> {
  const pillarsText = contentPillars.length > 0 ? contentPillars.join(", ") : "non définis";
  const audiencesText = audiences.length > 0 ? audiences.join(", ") : "professionnels";

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    tools: [TOPIC_GENERATION_TOOL],
    tool_choice: { type: "tool", name: "generate_topics" },
    messages: [
      {
        role: "user",
        content: `Tu es PostPilote, assistant LinkedIn pour des professionnels français.

Profil de l'utilisateur :
- Nom : ${fullName || "Professionnel"}
- Activité : ${businessContext}
- Piliers de contenu : ${pillarsText}
- Audience cible : ${audiencesText}

Génère exactement 5 sujets de posts LinkedIn pertinents et concrets pour cet utilisateur.
Chaque sujet doit être directement ancré dans son domaine d'expertise réel — pas générique.
Les sujets doivent varier : partage d'expertise, retour d'expérience, actualité sectorielle, conseil pratique, prise de position.`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("No tool_use in topic generation");
  const result = toolUse.input as { topics: AIGeneratedTopic[] };
  return (result.topics || []).slice(0, 5);
}

// ─── Tool schemas ─────────────────────────────────────────────────────────────

const DRAFT_TOOL: Anthropic.Tool = {
  name: "generate_linkedin_draft",
  description: "Output the generated LinkedIn post draft with all required fields.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short internal dashboard title, not a clickbait headline" },
      angle: { type: "string", description: "The angle of the post in one sentence" },
      hook: { type: "string", description: "Opening hook for the post" },
      content: { type: "string", description: "Full LinkedIn post in French, 900-1400 characters, short paragraphs" },
      cta: { type: "string", description: "Call to action aligned with Brice's business" },
      rationale: { type: "string", description: "Why this post can create business value" },
      hashtags: {
        type: "array",
        items: { type: "string" },
        description: "3 to 6 relevant hashtags",
      },
      truthAnchors: {
        type: "array",
        items: { type: "string" },
        description: "3 to 6 factual anchors grounded in the spark or brand profile",
      },
    },
    required: ["title", "angle", "hook", "content", "cta", "rationale", "hashtags", "truthAnchors"],
  },
};

const COMMENT_TOOL: Anthropic.Tool = {
  name: "generate_comment_suggestions",
  description: "Output 3 LinkedIn comment suggestions for Brice to post under this content.",
  input_schema: {
    type: "object",
    properties: {
      lead: { type: "string", description: "One-line reaction strategy" },
      comments: {
        type: "array",
        items: { type: "string" },
        description: "Exactly 3 French LinkedIn comments, 120-280 characters each",
      },
      bestAngle: { type: "string", description: "The best angle in one sentence" },
      rationale: { type: "string", description: "Why these comments create useful visibility or conversations" },
      cautions: {
        type: "array",
        items: { type: "string" },
        description: "2 to 4 cautions about what Brice should avoid when posting under this content",
      },
    },
    required: ["lead", "comments", "bestAngle", "rationale", "cautions"],
  },
};

const SIGNAL_SCORE_TOOL: Anthropic.Tool = {
  name: "score_signal",
  description: "Output the editorial relevance score and fit reasons for this signal.",
  input_schema: {
    type: "object",
    properties: {
      score: {
        type: "integer",
        description: "Relevance score from 0 (completely irrelevant) to 100 (perfect editorial fit). Be discriminating.",
      },
      fitReasons: {
        type: "array",
        items: { type: "string" },
        description: "Up to 5 short reasons why this signal fits the brand profile. Empty array if irrelevant.",
      },
    },
    required: ["score", "fitReasons"],
  },
};

const WEBSITE_VOICE_TOOL: Anthropic.Tool = {
  name: "extract_brand_voice",
  description: "Extract both the business context AND writing style from a website to guide LinkedIn post generation.",
  input_schema: {
    type: "object",
    properties: {
      businessContext: {
        type: "string",
        description: "4-8 sentences describing WHAT this person/firm does and FOR WHOM. Be concrete and specific: sector (droit pénal des affaires, expertise comptable, conseil en stratégie, etc.), types of clients (dirigeants de PME, groupes familiaux, startups, etc.), specific practice areas or services, geographic zone, key differentiators. This context will tell the AI WHAT TOPICS to write about on LinkedIn — it must be precise enough to generate relevant content.",
      },
      sourceContext: {
        type: "string",
        description: "3-5 sentences describing HOW they write: tone, sentence rhythm, level of formality, vocabulary style. Separate from the business context — this describes the voice, not the substance.",
      },
      styleSample: {
        type: "string",
        description: "A 150-300 character sample of a LinkedIn post written in the brand's voice. No hashtags, no CTA — just pure brand voice on a topic relevant to their business.",
      },
      toneKeywords: {
        type: "array",
        items: { type: "string" },
        description: "5 to 8 keywords describing the brand's tone (e.g. 'expert', 'direct', 'pédagogue', 'technique', 'accessible', 'sobre', 'engagé')",
      },
    },
    required: ["businessContext", "sourceContext", "styleSample", "toneKeywords"],
  },
};

const TOPIC_GENERATION_TOOL: Anthropic.Tool = {
  name: "generate_topics",
  description: "Generate 5 relevant LinkedIn post topic ideas based on the user's professional profile.",
  input_schema: {
    type: "object",
    properties: {
      topics: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Titre accrocheur du sujet, max 80 caractères." },
            angle: { type: "string", description: "L'angle spécifique à prendre — 1 phrase courte." },
            why: { type: "string", description: "Pourquoi ce sujet est pertinent pour l'audience cible — 1 phrase." },
            trigger: { type: "string", description: "La situation, actualité ou constat qui justifie d'écrire ce post maintenant." },
            interestScore: { type: "number", description: "Score de pertinence entre 65 et 92." },
            contentPillar: { type: "string", description: "Le pilier de contenu associé (ex: expertise, retour d'expérience, conseil, actualité sectorielle, prise de position)." },
          },
          required: ["title", "angle", "why", "trigger", "interestScore", "contentPillar"],
        },
        minItems: 5,
        maxItems: 5,
      },
    },
    required: ["topics"],
  },
};

// ─── Core request functions ───────────────────────────────────────────────────

async function requestDraft(
  input: DraftGenerationInput,
  brandProfile: BrandProfile,
  validatedPostSamples: string[],
  mode: "base" | "refinement",
  previousDraft?: GeneratedDraft,
  weakSignals?: string[]
): Promise<GeneratedDraft> {
  const systemText =
    mode === "base"
      ? buildDraftInstructions(brandProfile)
      : buildRefinementInstructions(weakSignals!, brandProfile);

  const userPrompt =
    mode === "base"
      ? buildDraftPrompt(input, validatedPostSamples)
      : buildRefinementPrompt(input, previousDraft!, weakSignals!);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: systemText,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [DRAFT_TOOL],
    tool_choice: { type: "tool", name: "generate_linkedin_draft" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildBrandProfileContext(brandProfile, [], input.businessContext),
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: userPrompt,
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("No tool_use block in draft response");
  }

  return normalizeDraft(toolUse.input as GeneratedDraft);
}

async function requestComments(
  input: CommentSuggestionInput,
  brandProfile: BrandProfile,
  validatedPostSamples: string[]
): Promise<GeneratedCommentSuggestion> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: buildCommentInstructions(brandProfile),
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [COMMENT_TOOL],
    tool_choice: { type: "tool", name: "generate_comment_suggestions" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildBrandProfileContext(brandProfile, validatedPostSamples, input.sourceContext),
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: buildCommentPrompt(input),
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("No tool_use block in comment response");
  }

  return normalizeComments(toolUse.input as GeneratedCommentSuggestion);
}

// ─── System prompts ───────────────────────────────────────────────────────────

function buildDraftInstructions(brandProfile: BrandProfile): string {
  const name = brandProfile.fullName || "l'utilisateur";
  return [
    `You are a sharp French ghostwriter for ${name}.`,
    "Write in French.",
    "Write like a real practitioner, not like a marketing assistant.",
    "Avoid hype, startup clichés, coaching jargon, and generic business platitudes.",
    "Use short paragraphs adapted to LinkedIn.",
    "Keep the tone embodied, concrete, and credible.",
    "Sound like someone who has lived the pressure, not someone commenting from the side.",
    "Prefer lived experience, sharp contrasts, and precise verbs over abstract concepts.",
    "No emoji. No list formatting inside the post unless absolutely necessary.",
    "Do not write a bland corporate post.",
    `Do not flatten ${name} into a generic consultant voice.`,
    "Do not invent achievements, client cases, scenes, meetings, dialogues, or observations.",
    "Hashtags must be common, correctly spelled, and business-relevant.",
    "Use only the generate_linkedin_draft tool to return your output.",
  ].join(" ");
}

function buildRefinementInstructions(weakSignals: string[], brandProfile: BrandProfile): string {
  const name = brandProfile.fullName || "l'utilisateur";
  return [
    `You are a ruthless French editor improving a weak LinkedIn draft for ${name}.`,
    "Write in French.",
    "Remove generic inspiration language, soft consultant copy, and AI-sounding filler.",
    `Specifically fix these weak signals: ${weakSignals.join("; ")}.`,
    "Prefer short, decisive paragraphs.",
    "Keep the text physical, concrete, and credible.",
    "Do not make it lyrical for the sake of style.",
    "Do not make it corporate.",
    "Do not keep any detail that is not grounded in the inputs.",
    "Use only the generate_linkedin_draft tool to return your output.",
  ].join(" ");
}

function buildCommentInstructions(brandProfile: BrandProfile): string {
  const name = brandProfile.fullName || "l'utilisateur";
  return [
    `You write French LinkedIn comments for ${name}.`,
    "Comments must sound human, specific, credible, and useful.",
    "Do not sound like engagement bait, praise farming, or generic networking copy.",
    "Avoid empty compliments, filler, and motivational sludge.",
    "Stay anchored in the source material only.",
    "Keep the tone embodied, direct, and observant.",
    "Use only the generate_comment_suggestions tool to return your output.",
  ].join(" ");
}

function buildScoringInstructions(brandProfile: BrandProfile): string {
  const name = brandProfile.fullName || "l'utilisateur";
  return [
    `You score the editorial relevance of a LinkedIn signal for ${name}'s content strategy.`,
    "Score from 0 (completely irrelevant) to 100 (perfect fit).",
    "Consider: content pillar match, audience relevance, offer alignment, whether the content is experience-based vs vague opinion, how commentable the tension is, and business potential.",
    "Be precise and discriminating — not every post about leadership deserves 80+.",
    "Use only the score_signal tool to return your output.",
  ].join(" ");
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildBrandProfileContext(
  brandProfile: BrandProfile,
  validatedPostSamples: string[] = [],
  businessContext?: string
): string {
  const parts = [
    `Brand profile — ${brandProfile.fullName || "Utilisateur"}:`,
    `- Headline: ${brandProfile.headline || "—"}`,
    `- Bio: ${brandProfile.bio || "—"}`,
    `- Audiences: ${brandProfile.audiences.join(", ") || "—"}`,
    `- Offers / services: ${brandProfile.offers.join(", ") || "—"}`,
    `- Proof points: ${brandProfile.proofPoints.join(", ") || "—"}`,
    `- Content pillars: ${brandProfile.contentPillars.join(", ") || "—"}`,
    `- Preferred CTAs: ${brandProfile.preferredCallsToAction.join(" | ") || "—"}`,
    `- Style references:\n${formatStyleSamples(brandProfile.styleSamples)}`,
  ];

  if (businessContext?.trim()) {
    parts.push(`- Business context (what they do, for whom, their domain):\n  ${businessContext.trim()}`);
  }

  if (validatedPostSamples.length > 0) {
    parts.push(`- Recently validated LinkedIn posts:\n${formatValidatedSamples(validatedPostSamples)}`);
  }

  return parts.join("\n");
}

function buildDraftPrompt(input: DraftGenerationInput, validatedPostSamples: string[]): string {
  return [
    "Draft request:",
    `- Spark (idea from the user): ${input.spark}`,
    `- Target audience: ${input.audience}`,
    `- Post objective: ${input.objective}`,
    `- CTA intention: ${input.cta || "None specified"}`,
    input.businessContext?.trim()
      ? `- Business context (WHAT to write about — their actual domain, clients, expertise):\n  ${input.businessContext.trim()}`
      : "",
    input.sourceContext?.trim()
      ? `- Writing style context (HOW to write — tone, voice):\n  ${input.sourceContext.trim()}`
      : "",
    "",
    "Recently validated LinkedIn posts (nearest target voice — study them closely):",
    formatValidatedSamples(validatedPostSamples),
    "",
    "Output guidance:",
    "- A strong internal dashboard title (not a clickbait headline).",
    "- A sharp angle in one sentence.",
    "- A hook that opens the post without a rhetorical question.",
    "- A full LinkedIn post in French, with short paragraphs (min 5 paragraphs).",
    "- The post must be grounded in the user's actual domain (law, accounting, consulting, etc.) — use the business context to ensure the topic is relevant to their practice.",
    "- Study the style references for cadence, density, tension, and sentence rhythm.",
    "- Do not copy hooks, sentences, metaphors, or images from references. Write something original.",
    "- Include at least one concrete situation or friction point a professional in their field would recognize.",
    "- Use only facts explicitly present in the spark, profile, or business context.",
    "- Do not invent scenes, client cases, meetings, dialogues, or observations. If uncertain, cut it.",
    "- Banned phrases: 'dans un monde en constante evolution', 'il est essentiel', 'enjeu crucial', 'performance accrue', 'solutions concretes', 'les vrais leaders', 'il est temps de', 'n'attendez plus', 'je vous invite', 'en partageant', 'en conclusion', 'de nombreuses entreprises'.",
    "- No emoji, no corporate tone, no AI-sounding filler.",
    "- A CTA aligned with the user's actual business and services (not generic).",
    "- A short rationale explaining why this post can generate qualified business conversations.",
    "- 3 to 6 relevant hashtags (common, correctly spelled, sector-specific).",
    "- 3 to 6 factual anchors: short true statements supported by the spark or brand profile.",
  ].filter(Boolean).join("\n");
}

function buildRefinementPrompt(
  input: DraftGenerationInput,
  draft: GeneratedDraft,
  weakSignals: string[]
): string {
  return [
    "Revise this weak first draft. Keep the same business objective:",
    `- Spark: ${input.spark}`,
    `- Audience: ${input.audience}`,
    `- Objective: ${input.objective}`,
    `- CTA intention: ${input.cta}`,
    "",
    `Weak signals to fix: ${weakSignals.join("; ")}`,
    "",
    `Current draft:\n${JSON.stringify(draft, null, 2)}`,
    "",
    "Revision goals:",
    "- Sharper, denser, more lived-in.",
    "- Prefer a real scene, a friction point, or a body-level sensation over abstract commentary.",
    "- Cut soft consultant phrasing and generic inspiration language.",
    "- Remove every invented or weakly supported detail.",
    "- Keep only claims grounded in the spark or known profile.",
  ].join("\n");
}

function buildCommentPrompt(input: CommentSuggestionInput): string {
  return [
    "Reaction target:",
    `- Author: ${input.authorName || "Unknown"}`,
    `- Post text: ${input.sourceText}`,
    `- Image/carousel context: ${input.imageContext || "No image provided"}`,
    `- Target audience for Brice: ${input.targetAudience}`,
    `- Business objective: ${input.objective}`,
    `- Source context: ${input.sourceContext?.trim() || "None provided"}`,
    "",
    "Instructions:",
    "- Write 3 different French LinkedIn comments Brice could post under this content.",
    "- Comments must feel native to LinkedIn, not like mini-posts pasted into a comment box.",
    "- Each comment: 120 to 280 characters maximum.",
    "- One sharp and direct, one more generous, one more contrarian.",
    "- Stay grounded in the source post. Do not invent facts.",
    "- Do not flatter mechanically. Never use 'tellement vrai', 'bravo', 'merci pour ce partage'.",
    "- Prefer one idea per comment. Prefer clean, spoken French.",
    "- No hashtags, no emojis.",
    "- A strong comment sounds like a practitioner entering the discussion, not a fan applauding.",
    "- Do not introduce yourself: no 'Je suis d'accord', 'Très juste', 'Excellent post'.",
  ].join("\n");
}

function buildScoringPrompt(sourceText: string, imageContext: string): string {
  const parts = ["Signal to score:", `Text: ${sourceText}`];
  if (imageContext) parts.push(`Image/carousel context: ${imageContext}`);
  return parts.join("\n");
}

// ─── Weak signal detection ────────────────────────────────────────────────────

const BANNED_PATTERNS = [
  // Generic motivational / coaching sludge
  "enjeu crucial",
  "il est facile",
  "il est possible",
  "il est temps de",
  "n attendez plus",
  "n hesitez pas",
  "les vrais leaders",
  "invitation a la lucidite",
  "une necessite",
  "solutions concretes",
  "demarrez ce voyage",
  "la clarte vous attend",
  "j invite chaque dirigeant",
  "dans le monde des affaires",
  "signal d alarme",
  // AI / consultant copy
  "ce post parle",
  "ce post aborde",
  "ce post demontre",
  "ce post s adresse",
  "en partageant",
  "en proposant une",
  "en conclusion",
  "pour conclure",
  "il est essentiel",
  "il est important",
  "dans un monde en constante",
  "les defis d aujourd hui",
  "dans notre monde",
  "enjeux actuels",
  "contexte actuel",
  "de nombreuses entreprises",
  "je vous invite",
  "je suis convaincu",
  "performance accrue",
  "croissance durable",
  "lever les freins",
  "passer a l action",
  "un monde complexe",
  "face aux defis",
  // Generic opener patterns
  "cela m a fait reflechir",
  "il y a quelque chose d important",
  "laissez moi vous partager",
  "j ai appris une lecon importante",
];

function findWeakSignals(draft: GeneratedDraft): string[] {
  const combined = normalizeText(
    [draft.title, draft.angle, draft.hook, draft.content, draft.rationale].join("\n")
  );
  const signals: string[] = [];

  for (const pattern of BANNED_PATTERNS) {
    if (combined.includes(pattern)) {
      signals.push(`contains generic phrase: "${pattern}"`);
    }
  }

  const questionCount = (draft.content.match(/\?/g) || []).length;
  if (questionCount > 1) {
    signals.push("too many rhetorical questions");
  }

  if (normalizeText(draft.hook).endsWith("?")) {
    signals.push("hook ends with a generic question");
  }

  if (draft.content.split("\n\n").length < 5) {
    signals.push("not enough short LinkedIn paragraphs (need at least 5)");
  }

  if ((draft.truthAnchors || []).length < 3) {
    signals.push("not enough factual anchors (need at least 3)");
  }

  return signals;
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normalizeDraft(draft: GeneratedDraft): GeneratedDraft {
  return {
    ...draft,
    hashtags: (draft.hashtags || []).map(normalizeHashtag).filter(Boolean).slice(0, 6),
    truthAnchors: (draft.truthAnchors || []).map((a) => a.trim()).filter(Boolean).slice(0, 6),
  };
}

function normalizeComments(suggestion: GeneratedCommentSuggestion): GeneratedCommentSuggestion {
  return {
    ...suggestion,
    comments: (suggestion.comments || []).map((c) => c.trim()).filter(Boolean).slice(0, 3),
    cautions: (suggestion.cautions || []).map((c) => c.trim()).filter(Boolean).slice(0, 4),
  };
}

// ─── Fallbacks ────────────────────────────────────────────────────────────────

function buildFallbackDraft(
  input: DraftGenerationInput,
  brandProfile: BrandProfile
): GeneratedDraft {
  const proof = brandProfile.proofPoints[0] || "un parcours exigeant";
  const pillar = brandProfile.contentPillars[0] || "execution";
  const firstOffer = brandProfile.offers[1] || brandProfile.offers[0] || "EM Conseil";
  const cta =
    input.cta ||
    brandProfile.preferredCallsToAction[0] ||
    "Envoyez-moi un message si vous voulez aller plus loin.";
  const hook = `On parle souvent de ${pillar} comme d'une idee abstraite. Dans la vraie vie, cela ressemble plutot a ceci : ${input.spark}.`;
  const content = [
    hook,
    `J'ai appris cela sur plusieurs terrains a la fois: ${proof}, la construction de produits et l'accompagnement de projets qui doivent produire un resultat concret.`,
    `Ce que je retiens aujourd'hui, c'est qu'un projet avance quand on sait canaliser l'energie, clarifier le prochain mouvement et executer sans theatre. C'est valable pour un entrepreneur, une equipe et pour tout produit qui veut trouver son marche.`,
    `C'est exactement l'approche que je mets maintenant dans ${firstOffer} et dans les SaaS/SAAAS que je construis: moins de bruit, plus de structure, plus d'action.`,
    cta,
  ].join("\n\n");

  return {
    title: `Post LinkedIn - ${input.objective}`,
    angle: `Transformer une experience personnelle en lecon business utile pour ${input.audience}.`,
    hook,
    content,
    cta,
    rationale:
      "Le post relie une experience forte a une lecon directement exploitable et ouvre naturellement vers une conversation business.",
    hashtags: buildHashtags([input.audience, input.objective, ...brandProfile.contentPillars]),
    truthAnchors: [proof, firstOffer, brandProfile.headline, input.spark]
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 4),
  };
}

function buildFallbackCommentSuggestions(
  input: CommentSuggestionInput,
  brandProfile: BrandProfile
): GeneratedCommentSuggestion {
  const pillar = brandProfile.contentPillars[0] || "execution";
  const proof = brandProfile.proofPoints[0] || "un parcours de terrain";
  const author = input.authorName || "l'auteur";

  return {
    lead: "Entrer dans la conversation avec un angle terrain, sans surjouer l'accord.",
    comments: [
      `${author} met le doigt sur quelque chose de rare: un point utile, pas une formule. Quand le propos reste au contact du reel, la discussion devient enfin interessante.`,
      `Le point fort ici, c'est le lien entre lucidite et execution. Beaucoup comprennent l'idee. Beaucoup moins tiennent quand il faut decider, encaisser et continuer.`,
      `Je nuancerais sur un point: comprendre ne suffit pas. Ce qui separe les gens, ensuite, c'est la discipline de repetition. C'est souvent la que tout se joue.`,
    ],
    bestAngle: `Ajouter un angle ${pillar} et terrain pour faire emerger la credibilite de Brice sans voler la vedette au post original.`,
    rationale: `Ces commentaires prolongent le post de ${author} au lieu de le paraphraser. Ils repositionnent Brice comme quelqu'un qui a vecu la pression et peut enrichir la conversation avec ${proof}.`,
    cautions: [
      "Ne pas transformer le commentaire en pitch commercial",
      "Ne pas paraphraser simplement le post original",
      "Ne pas jouer le desaccord artificiel si le contenu ne le justifie pas",
    ],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildHashtags(values: string[]): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    const normalized = normalizeHashtag(value);
    if (normalized) unique.add(normalized);
  }
  return Array.from(unique).slice(0, 5);
}

function normalizeHashtag(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk, index) =>
      index === 0
        ? chunk.toLowerCase()
        : chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase()
    )
    .join("");

  return normalized ? `#${normalized}` : "";
}

function formatStyleSamples(samples: string[]): string {
  if (samples.length === 0) return "- None";
  return samples
    .slice(0, 3)
    .map((sample, index) => `  ${index + 1}. """\n${sample.trim()}\n  """`)
    .join("\n");
}

function formatValidatedSamples(samples: string[]): string {
  if (samples.length === 0) return "- None yet";
  return samples
    .slice(0, 3)
    .map((sample, index) => `  ${index + 1}. """\n${sample.trim()}\n  """`)
    .join("\n");
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim();
}
