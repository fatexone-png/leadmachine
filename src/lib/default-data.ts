import { createHash } from "node:crypto";

import type { AppData } from "@/lib/types";

export const DEFAULT_WATCHLIST: AppData["watchlist"] = {
  accounts: [],
  keywords: ["IA", "SaaS", "leadership", "performance", "execution", "boxe", "entrepreneuriat"],
  hashtags: ["#IA", "#SaaS", "#Leadership", "#Performance", "#Entrepreneuriat"],
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_STYLE_SAMPLES = [
  [
    "On croit venir pour un cours de boxe.",
    "On enfile les gants, on se dit : ca va transpirer, ca va cogner un peu, basta.",
    "Erreur.",
    "",
    "Ce qui se joue n'est pas qu'un sport. C'est un passage. Une traversee. Une mise a nu.",
    "Parce qu'a la premiere garde bancale, c'est l'echec qui frappe.",
  ].join("\n"),
  [
    "Le temps, on ne le prend pas. On ne prend rien. Il s'impose.",
    "Il glisse, que tu sois coince dans un bouchon, plante devant une caisse ou allonge dans un cercueil.",
    "Ce qu'on appelle perdre son temps, c'est juste constater qu'on s'en est fait voler la jouissance.",
  ].join("\n"),
  [
    "Je payais l'hebergement de nobleart.fr depuis vingt piges. Pour rien.",
    "Chaque prelevement me faisait mal.",
    "",
    "On croit parfois qu'un projet meurt d'un manque d'idees.",
    "En vrai, il meurt souvent d'un angle flou et d'une energie mal placee.",
  ].join("\n"),
];

export const DEFAULT_SOURCE_CONTEXT = [
  "Profil test actif: Brice Faradji.",
  "Univers possibles: Aphaboxe, conferences, coaching, produits fitness, SaaS, performance sous pression.",
  "Objectif du test: valider un moteur editorial autonome avant duplication pour des clients.",
].join(" ");

export const DEFAULT_SIGNALS: AppData["signals"] = [
  {
    id: "seed-signal-1",
    title: "Dirigeant sous pression et qualite de decision",
    sourceType: "linkedin",
    sourceLabel: "LinkedIn",
    sourceUrl: null,
    authorName: "Diane Imbert",
    authorRole: "Dirigeante PME",
    summary: "Une prise de position sur la lucidite quand tout se crispe.",
    sourceText:
      "Quand la visibilite baisse, beaucoup d'equipes accelerent sans plus voir clair. Le vrai sujet n'est pas la vitesse. C'est la qualite de decision quand la pression monte.",
    imageContext: "",
    contentHash: createHash("sha256").update("seed-signal-1:Dirigeant PME:Quand la visibilite").digest("hex"),
    interestScore: 82,
    fitReasons: [
      "Recoupe un pilier de contenu: performance sous pression",
      "Le sujet porte une tension concrete et commentable",
      "Peut nourrir une offre: conferences et seminaires entreprise",
    ],
    status: "qualified",
    suggestion: null,
    selectedComment: null,
    createdAt: "2026-04-14T07:20:00.000Z",
    updatedAt: "2026-04-14T07:20:00.000Z",
  },
  {
    id: "seed-signal-2",
    title: "Produit flou, acquisition inutile",
    sourceType: "linkedin",
    sourceLabel: "LinkedIn",
    sourceUrl: null,
    authorName: "Nicolas Perret",
    authorRole: "Fondateur SaaS",
    summary: "Retour d'experience sur un produit lance trop tot et mal cadre.",
    sourceText:
      "Nous pensions avoir un probleme d'acquisition. En realite, nous avions surtout un probleme de clarte produit. Tant que l'angle reste flou, le marketing ne sauve rien.",
    imageContext: "carousel de 4 slides avec erreurs produit et lecons de lancement",
    contentHash: createHash("sha256").update("seed-signal-2:Fondateur SaaS:Nous pensions avoir").digest("hex"),
    interestScore: 78,
    fitReasons: [
      "Recoupe un pilier de contenu: construction de SaaS",
      "Le contenu semble ancre dans l'experience plutot que dans l'opinion vague",
      "Peut nourrir une offre: creation de SaaS et SAAAS sur mesure",
    ],
    status: "new",
    suggestion: null,
    selectedComment: null,
    createdAt: "2026-04-14T07:15:00.000Z",
    updatedAt: "2026-04-14T07:15:00.000Z",
  },
  {
    id: "seed-signal-3",
    title: "Discipline et repetition",
    sourceType: "linkedin",
    sourceLabel: "LinkedIn",
    sourceUrl: null,
    authorName: "Claire Martin",
    authorRole: "Coach / formatrice",
    summary: "Un post sur la repetition, la transmission et le reel.",
    sourceText:
      "On surestime souvent l'inspiration. On sous-estime presque toujours la repetition. Ce qui transforme une equipe, ce n'est pas un pic d'energie. C'est une discipline tenue assez longtemps.",
    imageContext: "",
    contentHash: createHash("sha256").update("seed-signal-3:Coach / formateur:On surestime souvent").digest("hex"),
    interestScore: 72,
    fitReasons: [
      "Recoupe un pilier de contenu: discipline et execution",
      "Le sujet porte une tension concrete et commentable",
    ],
    status: "new",
    suggestion: null,
    selectedComment: null,
    createdAt: "2026-04-14T07:10:00.000Z",
    updatedAt: "2026-04-14T07:10:00.000Z",
  },
];

export function createDefaultData(): AppData {
  const now = new Date().toISOString();

  return {
    plan: "free",
    postsPublished: 0,
    brandProfile: {
      fullName: "Brice Faradji",
      headline: "Entrepreneur, builder IA, ancien double champion du monde, pilote privé",
      bio: "Je transforme l'expérience vécue en contenu, offres et produits. Mon territoire: performance sous pression, exécution, IA, SaaS, sport de haut niveau et transmission.",
      audiences: [
        "dirigeants de PME",
        "fondateurs de SaaS",
        "responsables innovation",
        "DRH et directions générales",
      ],
      offers: [
        "conferences et seminaires entreprise",
        "creation de SaaS et SAAAS sur mesure",
        "EM Conseil",
        "interventions leadership sous pression",
      ],
      proofPoints: [
        "double champion du monde de boxe anglaise",
        "ingenieur en informatique et chef de projet durant 6 ans chez Alten Technologie",
        "createur des applications Aphaboxe et BFzoom",
        "auteur de deux livres",
        "createur des produits fitness Jumpfit et Jumpfight",
        "pilote prive PPL d'avion",
      ],
      contentPillars: [
        "performance sous pression",
        "discipline et execution",
        "IA appliquee au business",
        "construction de SaaS",
        "sport de haut niveau",
      ],
      preferredCallsToAction: [
        "Envoyez-moi un message si vous voulez structurer votre projet.",
        "Repondez a ce post si vous voulez le framework complet.",
        "Si vous voulez que je construise le produit avec vous, parlons-en.",
      ],
      styleSamples: DEFAULT_STYLE_SAMPLES,
      updatedAt: now,
    },
    linkedin: {
      connected: false,
      memberId: null,
      memberUrn: null,
      name: null,
      email: null,
      picture: null,
      scope: [],
      accessToken: null,
      accessTokenExpiresAt: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
      lastSyncAt: null,
    },
    settings: {
      appName: "LeadMachine",
      aiModel: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
      cronSecretConfigured: Boolean(process.env.CRON_SECRET),
      sourceContext: DEFAULT_SOURCE_CONTEXT,
      updatedAt: now,
    },
    watchlist: DEFAULT_WATCHLIST,
    signals: DEFAULT_SIGNALS,
    drafts: [],
  };
}
