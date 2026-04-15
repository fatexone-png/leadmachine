import type {
  BrandProfile,
  CommentSuggestionInput,
  DraftGenerationInput,
  GeneratedCommentSuggestion,
  GeneratedDraft,
} from "@/lib/types";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";

export async function generateLinkedInDraft(
  input: DraftGenerationInput,
  brandProfile: BrandProfile,
  validatedPostSamples: string[] = []
): Promise<GeneratedDraft> {
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackDraft(input, brandProfile);
  }

  try {
    return await generateWithOpenAI(input, brandProfile, validatedPostSamples);
  } catch {
    return buildFallbackDraft(input, brandProfile);
  }
}

export async function generateLinkedInCommentSuggestions(
  input: CommentSuggestionInput,
  brandProfile: BrandProfile,
  validatedPostSamples: string[] = []
): Promise<GeneratedCommentSuggestion> {
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackCommentSuggestions(input, brandProfile);
  }

  try {
    return normalizeCommentSuggestions(
      await requestCommentSuggestions(
        buildCommentInstructions(),
        buildCommentPrompt(input, brandProfile, validatedPostSamples)
      )
    );
  } catch {
    return buildFallbackCommentSuggestions(input, brandProfile);
  }
}

async function generateWithOpenAI(
  input: DraftGenerationInput,
  brandProfile: BrandProfile,
  validatedPostSamples: string[]
): Promise<GeneratedDraft> {
  const initial = normalizeGeneratedDraft(
    await requestDraft(buildBaseInstructions(), buildPrompt(input, brandProfile, validatedPostSamples))
  );
  const weakSignals = findWeakSignals(initial);

  if (weakSignals.length === 0) {
    return initial;
  }

  try {
    return normalizeGeneratedDraft(
      await requestDraft(
        buildRefinementInstructions(weakSignals),
        buildRefinementPrompt(
          input,
          brandProfile,
          validatedPostSamples,
          initial,
          weakSignals
        )
      )
    );
  } catch {
    return initial;
  }
}

function buildPrompt(
  input: DraftGenerationInput,
  brandProfile: BrandProfile,
  validatedPostSamples: string[]
): string {
  return `
Brice profile:
- Name: ${brandProfile.fullName}
- Headline: ${brandProfile.headline}
- Bio: ${brandProfile.bio}
- Audiences: ${brandProfile.audiences.join(", ")}
- Offers: ${brandProfile.offers.join(", ")}
- Proof points: ${brandProfile.proofPoints.join(", ")}
- Content pillars: ${brandProfile.contentPillars.join(", ")}
- Favorite CTAs: ${brandProfile.preferredCallsToAction.join(" | ")}
- Style references:
${formatStyleSamples(brandProfile.styleSamples)}
- Recently validated LinkedIn posts:
${formatValidatedSamples(validatedPostSamples)}

Draft request:
- Spark: ${input.spark}
- Audience: ${input.audience}
- Objective: ${input.objective}
- CTA intention: ${input.cta}
- Optional source context from website, offer pages, or brand notes:
${input.sourceContext?.trim() || "None provided"}

Output guidance:
- A strong title for the internal dashboard, not a clickbait title.
- A sharp angle in one sentence.
- A hook that can open the post.
- A full LinkedIn post in French, around 900 to 1400 characters, with short paragraphs.
- The post must sound like Brice Faradji: physical, lucid, direct, and grounded in lived experience.
- Study the style references for cadence, density, tension, and sentence rhythm.
- Study the validated LinkedIn posts even more closely. They are the nearest target voice for this product.
- Do not copy hooks, sentences, metaphors, or images from the references. Write something original.
- The post can connect ring, product building, leadership, aviation, sport, or execution, but only if it serves the idea naturally.
- The post should contain at least one striking concrete image or situation, not only abstract reflection.
- Use only facts that are explicitly present in the spark, Brice profile, or validated post samples.
- Do not invent scenes, client cases, meetings, flights, dialogues, observations, or business situations that are not grounded in the inputs.
- If a detail is uncertain, remove it.
- Avoid generic lines such as "dans un monde en constante evolution", "il est essentiel", "enjeu crucial", "performance accrue", "solutions concretes".
- Avoid sounding like HR copy, agency copy, or AI copy.
- A CTA aligned with Brice's business.
- A short rationale explaining why this post can create business.
- 3 to 6 relevant hashtags.
- 3 to 6 factual anchors. Each anchor must be a short true statement supported by the spark or known profile.
`;
}

function buildRefinementPrompt(
  input: DraftGenerationInput,
  brandProfile: BrandProfile,
  validatedPostSamples: string[],
  draft: GeneratedDraft,
  weakSignals: string[]
) {
  return `
You are revising a weak first draft for Brice Faradji.

Keep the same business objective:
- Spark: ${input.spark}
- Audience: ${input.audience}
- Objective: ${input.objective}
- CTA intention: ${input.cta}

Brice profile:
- Name: ${brandProfile.fullName}
- Headline: ${brandProfile.headline}
- Bio: ${brandProfile.bio}
- Proof points: ${brandProfile.proofPoints.join(", ")}
- Offers: ${brandProfile.offers.join(", ")}
- Style references:
${formatStyleSamples(brandProfile.styleSamples)}
- Recently validated LinkedIn posts:
${formatValidatedSamples(validatedPostSamples)}

Weak signals to remove:
${weakSignals.map((signal) => `- ${signal}`).join("\n")}

Current weak draft:
${JSON.stringify(draft, null, 2)}

Revision goals:
- Make it sharper, denser, and more lived-in.
- Prefer a real scene, a friction point, or a body-level sensation over abstract commentary.
- Cut soft consultant phrasing and generic inspiration language.
- Keep it original. Do not copy the references.
- Remove every invented or weakly supported detail.
- Keep only claims grounded in the spark or known profile.
- Keep a CTA aligned with Brice's conferences, seminars, or product work.
  `;
}

function buildCommentPrompt(
  input: CommentSuggestionInput,
  brandProfile: BrandProfile,
  validatedPostSamples: string[]
): string {
  return `
Brice profile:
- Name: ${brandProfile.fullName}
- Headline: ${brandProfile.headline}
- Bio: ${brandProfile.bio}
- Audiences: ${brandProfile.audiences.join(", ")}
- Offers: ${brandProfile.offers.join(", ")}
- Proof points: ${brandProfile.proofPoints.join(", ")}
- Content pillars: ${brandProfile.contentPillars.join(", ")}
- Favorite CTAs: ${brandProfile.preferredCallsToAction.join(" | ")}
- Style references:
${formatStyleSamples(brandProfile.styleSamples)}
- Recently validated LinkedIn posts:
${formatValidatedSamples(validatedPostSamples)}

Reaction target:
- Author name: ${input.authorName || "Unknown"}
- Post text: ${input.sourceText}
- Image context: ${input.imageContext || "No image provided"}
- Target audience for Brice: ${input.targetAudience}
- Business objective: ${input.objective}
- Optional source context from website, offer pages, or brand notes:
${input.sourceContext?.trim() || "None provided"}

Goal:
- Write 3 different French LinkedIn comments Brice could post under this content.
- Comments must feel native to LinkedIn, not like mini-posts pasted into comments.
- Each comment should be 120 to 280 characters maximum.
- One comment can be sharp and direct, one more generous, one more contrarian.
- Stay grounded in the source post or image context. Do not invent facts.
- Do not flatter mechanically. Do not say "tellement vrai", "bravo", "merci pour ce partage" unless earned and specific.
- Do not sound like AI, a growth hacker, or a ghostwriter template.
- The best comments should open a conversation, deepen the idea, or add a field-tested angle.
- Avoid hashtags unless truly necessary. Avoid emojis.
- If the image context matters, use it concretely.
- Prefer one idea per comment.
- Prefer clean, spoken French over polished copywriting.
- Avoid introductions like "Je suis d'accord", "Tres juste", "Excellent post".
- A strong comment should sound like a practitioner entering the discussion, not a fan applauding.

Return:
- a one-line lead describing the reaction strategy
- 3 comments
- the best angle in one sentence
- a short rationale explaining why these comments can create useful visibility or conversations
- 2 to 4 cautions about what Brice should avoid when posting under this content
`;
}

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
    truthAnchors: [
      proof,
      firstOffer,
      brandProfile.headline,
      input.spark,
    ]
      .map((value) => value.trim())
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

function buildHashtags(values: string[]): string[] {
  const unique = new Set<string>();

  for (const value of values) {
    const normalized = normalizeHashtag(value);
    if (normalized) {
      unique.add(normalized);
    }
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
      index === 0 ? chunk.toLowerCase() : capitalize(chunk.toLowerCase())
    )
    .join("");

  return normalized ? `#${normalized}` : "";
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeGeneratedDraft(draft: GeneratedDraft): GeneratedDraft {
  return {
    ...draft,
    hashtags: draft.hashtags.map(normalizeHashtag).filter(Boolean).slice(0, 6),
    truthAnchors: (draft.truthAnchors || [])
      .map((anchor) => anchor.trim())
      .filter(Boolean)
      .slice(0, 6),
  };
}

function formatStyleSamples(samples: string[]) {
  if (samples.length === 0) {
    return "- None";
  }

  return samples
    .slice(0, 3)
    .map(
      (sample, index) =>
        `  ${index + 1}. """\n${sample.trim()}\n  """`
    )
    .join("\n");
}

function buildBaseInstructions() {
  return [
    "You are a sharp French ghostwriter for Brice Faradji.",
    "Write in French.",
    "Write like a real operator, not like a marketing assistant.",
    "Avoid hype, startup clichés, coaching jargon, and generic business platitudes.",
    "Use short paragraphs adapted to LinkedIn.",
    "Keep the tone embodied, concrete, tense, and credible.",
    "Sound like someone who has lived the pressure, not someone commenting from the side.",
    "Prefer lived experience, sharp contrasts, and precise verbs over abstract concepts.",
    "No emoji. No list formatting inside the post unless absolutely necessary.",
    "Do not write a bland corporate post.",
    "Do not flatten Brice into a generic consultant voice.",
    "Do not invent achievements, client cases, scenes, meetings, flights, dialogues, or observations.",
    "Hashtags must be common, correctly spelled, and business-relevant.",
    "Return only valid JSON that matches the schema.",
  ].join(" ");
}

function buildCommentInstructions() {
  return [
    "You write French LinkedIn comments for Brice Faradji.",
    "Comments must sound human, specific, credible, and useful.",
    "Do not sound like engagement bait, praise farming, or generic networking copy.",
    "Avoid empty compliments, filler, and motivational sludge.",
    "Stay anchored in the source material only.",
    "Keep the tone embodied, direct, and observant.",
    "Return only valid JSON that matches the schema.",
  ].join(" ");
}

function buildRefinementInstructions(weakSignals: string[]) {
  return [
    "You are a ruthless French editor improving a weak LinkedIn draft for Brice Faradji.",
    "Write in French.",
    "Remove generic inspiration language, soft consultant copy, and AI-sounding filler.",
    `Specifically remove these weak signals: ${weakSignals.join("; ")}.`,
    "Prefer short, decisive paragraphs.",
    "Keep the text physical, concrete, and credible.",
    "Do not make it lyrical for the sake of style.",
    "Do not make it corporate.",
    "Do not keep any detail that is not grounded in the inputs.",
    "Return only valid JSON that matches the schema.",
  ].join(" ");
}

function normalizeCommentSuggestions(
  suggestion: GeneratedCommentSuggestion
): GeneratedCommentSuggestion {
  return {
    ...suggestion,
    comments: (suggestion.comments || []).map((comment) => comment.trim()).filter(Boolean).slice(0, 3),
    cautions: (suggestion.cautions || []).map((item) => item.trim()).filter(Boolean).slice(0, 4),
  };
}

async function requestDraft(
  instructions: string,
  input: string
): Promise<GeneratedDraft> {
  return requestJsonResponse<GeneratedDraft>({
    instructions,
    input,
    schemaName: "leadmachine_linkedin_post",
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "title",
        "angle",
        "hook",
        "content",
        "cta",
        "rationale",
        "hashtags",
        "truthAnchors",
      ],
      properties: {
        title: { type: "string" },
        angle: { type: "string" },
        hook: { type: "string" },
        content: { type: "string" },
        cta: { type: "string" },
        rationale: { type: "string" },
        hashtags: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 6,
        },
        truthAnchors: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 6,
        },
      },
    },
  });
}

async function requestCommentSuggestions(
  instructions: string,
  input: string
): Promise<GeneratedCommentSuggestion> {
  return requestJsonResponse<GeneratedCommentSuggestion>({
    instructions,
    input,
    schemaName: "leadmachine_linkedin_comments",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["lead", "comments", "bestAngle", "rationale", "cautions"],
      properties: {
        lead: { type: "string" },
        comments: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 3,
        },
        bestAngle: { type: "string" },
        rationale: { type: "string" },
        cautions: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 4,
        },
      },
    },
  });
}

async function requestJsonResponse<T>({
  instructions,
  input,
  schemaName,
  schema,
}: {
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      instructions,
      input,
      max_output_tokens: 1200,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };
  const outputText =
    payload.output_text ||
    payload.output
      ?.flatMap((entry) => entry.content || [])
      .find((entry) => entry.type === "output_text" && entry.text)?.text;

  if (!outputText) {
    throw new Error("OpenAI response did not contain text output");
  }

  return JSON.parse(outputText) as T;
}

function findWeakSignals(draft: GeneratedDraft) {
  const combined = normalizeText(
    [draft.title, draft.angle, draft.hook, draft.content, draft.rationale].join("\n")
  );
  const signals: string[] = [];
  const bannedPatterns = [
    "enjeu crucial",
    "il est facile",
    "il est possible",
    "dans le monde des affaires",
    "les vrais leaders",
    "signal d alarme",
    "invitation a la lucidite",
    "une necessite",
    "solutions concretes",
    "demarrez ce voyage",
    "la clarte vous attend",
    "j invite chaque dirigeant",
    "ce post parle",
  ];

  for (const pattern of bannedPatterns) {
    if (combined.includes(pattern)) {
      signals.push(`contains generic phrase: ${pattern}`);
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
    signals.push("not enough short LinkedIn paragraphs");
  }

  if ((draft.truthAnchors || []).length < 3) {
    signals.push("not enough factual anchors");
  }

  return signals;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim();
}

function formatValidatedSamples(samples: string[]) {
  if (samples.length === 0) {
    return "- None yet";
  }

  return samples
    .slice(0, 2)
    .map(
      (sample, index) =>
        `  ${index + 1}. """\n${sample.trim()}\n  """`
    )
    .join("\n");
}
