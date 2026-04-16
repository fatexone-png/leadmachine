import { createHash } from "node:crypto";

import type { AppData } from "@/lib/types";

const now = new Date().toISOString();

export const TALCO_DEMO_DATA: AppData = {
  plan: "free",
  postsPublished: 0,
  brandProfile: {
    fullName: "Delphine Ghighi",
    headline: "Avocate associée — TAL&CO | Industrie, Innovation, Risques, Entreprises en difficulté",
    bio: "J'accompagne des dirigeants et des entreprises industrielles et technologiques sur les sujets qui engagent vraiment : contrats complexes, prévention des risques, restructuration. Chez TAL&CO, nous travaillons avec des clients qui ne cherchent pas un avocat généraliste. Ils cherchent quelqu'un qui comprend leur secteur.",
    websiteUrl: "",
    styleSources: [],
    tonePreset: "formal",
    postLengthPreset: "medium",
    audiences: [
      "dirigeants de PME industrielles",
      "fondateurs de startups technologiques",
      "directeurs juridiques d'ETI",
      "entrepreneurs en phase de croissance ou de difficulté",
    ],
    offers: [
      "prévention des risques et formation",
      "accompagnement entreprises en difficulté",
      "contrats d'affaires complexes",
      "conseil industrie et innovation",
      "contentieux des affaires",
    ],
    proofPoints: [
      "avocate associée fondatrice de TAL&CO AARPI",
      "cabinet présent à Lyon et Paris",
      "expertise reconnue en industrie, Règlement Machines et cybersécurité industrielle",
      "accompagnement de restructurations et procédures collectives",
      "conseil régulier de dirigeants de PME et d'ETI",
    ],
    contentPillars: [
      "entreprises en difficulté et restructuration",
      "prévention des risques juridiques",
      "innovation et industrie",
      "contrats et partenariats d'affaires",
      "décision et responsabilité du dirigeant",
    ],
    preferredCallsToAction: [
      "Si votre situation ressemble à ce que je décris, parlons-en. Un échange de 20 minutes suffit souvent à clarifier les options.",
      "Vous avez une question sur ce sujet ? Écrivez-moi directement.",
      "TAL&CO — Lyon · Paris. On prend le temps de comprendre avant de conseiller.",
    ],
    styleSamples: [
      "Il y a un moment précis dans chaque entreprise en difficulté où l'issue est encore entre les mains du dirigeant.\n\nCe moment dure rarement plus de quelques semaines.\n\nAvant, tout semble encore gérable. Après, les options juridiques se ferment une par une.",
      "Le contrat qu'on signe vite est souvent celui qu'on regrette longtemps.\n\nJ'ai vu des entreprises perdre des années de travail sur un contrat de trois pages signé sans relecture sérieuse.\n\nLa prévention juridique n'est pas un coût. C'est le prix d'une décision éclairée.",
    ],
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
    appName: "TAL&CO — Moteur éditorial",
    aiModel: "claude-sonnet-4-6",
    cronSecretConfigured: false,
    sourceContext: [
      "Ton professionnel, direct, ancré dans le réel. Pas de jargon juridique inutile.",
      "Écriture sobre, phrases courtes, accroche sur un problème concret du dirigeant.",
      "Vocabulaire du terrain : 'risque', 'responsabilité', 'décision', 'contrat', 'enjeu'.",
    ].join(" "),
    businessContext: [
      "Cabinet TAL&CO AARPI — Avocats d'affaires à Lyon et Paris.",
      "Associées : Delphine Ghighi et Richard Esquier.",
      "Domaines d'expertise : prévention des risques (Règlement Machines, cybersécurité industrielle), droit des entreprises en difficulté (procédures collectives, restructuration), contrats d'affaires complexes, droit de l'industrie et de l'innovation.",
      "Clients cibles : dirigeants de PME industrielles, ETI en transformation, startups technologiques, entreprises sous pression opérationnelle ou réglementaire.",
      "Positionnement : expertise sectorielle pointue, accompagnement stratégique des dirigeants, proximité terrain. Ce n'est pas un cabinet généraliste.",
      "Objectif LinkedIn : être visible auprès des décideurs qui ont un problème juridique concret à résoudre — pas pour 'faire du contenu' mais pour déclencher des prises de contact qualifiées.",
    ].join(" "),
    charterAcceptedAt: now,
    onboardingCompleted: true,
    emailNotifications: false,
    dailyPostTime: "08:00",
    updatedAt: now,
  },
  watchlist: {
    accounts: [],
    keywords: ["Règlement Machines", "industrie", "cybersécurité", "procédure collective", "contrats"],
    hashtags: ["#Industrie", "#DroitDesAffaires", "#Innovation", "#EntreprisesEnDifficulté"],
    updatedAt: now,
  },
  signals: [
    {
      id: "talco-signal-1",
      title: "Règlement Machines 2023 — nouvelles obligations pour les fabricants",
      sourceType: "article",
      sourceLabel: "ACRITEC",
      sourceUrl: "https://www.acritec.fr/reglement-machines-2023-1230-changements-2027/",
      authorName: "ACRITEC — Sécurité industrielle",
      summary: "Le nouveau Règlement Machines entre en vigueur en 2027. Les fabricants ont 3 ans pour se mettre en conformité. Beaucoup ne l'ont pas encore anticipé.",
      sourceText: "Le nouveau Règlement Machines (UE) 2023/1230 entrera en application le 20 janvier 2027. Il remplace la directive Machines 2006/42/CE et introduit des obligations nouvelles, notamment sur les systèmes d'IA intégrés aux machines et sur la cybersécurité. Les fabricants et intégrateurs qui n'ont pas encore lancé leur analyse de conformité prennent du retard.",
      imageContext: "",
      contentHash: createHash("sha256").update("talco-signal-1:Federation des Industries:Règlement Machines").digest("hex"),
      interestScore: 91,
      fitReasons: [
        "Recoupe un pilier de contenu : industrie et innovation",
        "Peut nourrir une offre : conseil industrie et prévention des risques",
        "Parle à une audience cible : dirigeants de PME industrielles",
        "Le sujet porte une tension concrète et commentable",
        "Contenu ancré dans l'expérience terrain du cabinet",
      ],
      status: "qualified",
      suggestion: null,
      selectedComment: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "talco-signal-2",
      title: "Procédure collective — le dirigeant qui a attendu trop longtemps",
      sourceType: "article",
      sourceLabel: "Litige.fr",
      sourceUrl: "https://www.litige.fr/articles/procedure-collective-et-sauvegarde-de-l-entreprise",
      authorName: "Litige.fr — Droit des entreprises",
      summary: "Retour sur une liquidation qui aurait pu être une sauvegarde si le dirigeant avait agi 6 mois plus tôt.",
      sourceText: "Beaucoup de dirigeants arrivent en procédure collective après avoir épuisé toutes leurs réserves personnelles. Le mandat ad hoc et la conciliation sont des outils puissants — mais ils n'existent que si l'entreprise n'est pas encore en cessation de paiements. L'erreur la plus fréquente : confondre 'difficulté' et 'faillite inévitable'.",
      imageContext: "",
      contentHash: createHash("sha256").update("talco-signal-2:Tribunal de Commerce:Procedure collective").digest("hex"),
      interestScore: 88,
      fitReasons: [
        "Recoupe un pilier de contenu : entreprises en difficulté et restructuration",
        "Peut nourrir une offre : accompagnement entreprises en difficulté",
        "Parle à une audience cible : dirigeants de PME",
        "Le sujet porte une tension concrète et commentable",
      ],
      status: "new",
      suggestion: null,
      selectedComment: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "talco-signal-3",
      title: "Contrats de partenariat — la clause qu'on oublie toujours",
      sourceType: "article",
      sourceLabel: "ACBM Avocats",
      sourceUrl: "https://www.acbm-avocats.com/proteger-vos-creations-comprendre-et-utiliser-la-clause-de-propriete-intellectuelle/",
      authorName: "Cabinet ACBM Avocats",
      summary: "Retour d'expérience sur une clause de propriété intellectuelle mal rédigée qui a coûté 2 ans de développement à une startup.",
      sourceText: "On a signé un contrat de co-développement sans préciser clairement à qui appartenaient les améliorations apportées à notre technologie par le partenaire. Deux ans plus tard, le partenaire a revendiqué une partie de notre IP. Le litige nous a coûté plus cher que le développement lui-même.",
      imageContext: "",
      contentHash: createHash("sha256").update("talco-signal-3:Fondateur SaaS:Contrats de partenariat").digest("hex"),
      interestScore: 82,
      fitReasons: [
        "Recoupe un pilier de contenu : contrats et partenariats d'affaires",
        "Peut nourrir une offre : contrats d'affaires complexes",
        "Le contenu est ancré dans l'expérience plutôt que dans l'opinion vague",
      ],
      status: "new",
      suggestion: null,
      selectedComment: null,
      createdAt: now,
      updatedAt: now,
    },
  ],
  drafts: [
    {
      id: "talco-draft-1",
      title: "Entreprises en difficulté — le bon moment pour agir",
      spark: "Il y a un moment précis dans chaque entreprise en difficulté où l'issue est encore dans les mains du dirigeant. Ce moment dure rarement plus de quelques semaines.",
      objective: "prévention",
      audience: "dirigeants de PME",
      angle: "Le timing est tout — agir avant la cessation de paiements change radicalement les options disponibles.",
      hook: "Il y a un moment précis dans chaque entreprise en difficulté où l'issue est encore entre les mains du dirigeant.",
      content: `Il y a un moment précis dans chaque entreprise en difficulté où l'issue est encore entre les mains du dirigeant.

Ce moment dure rarement plus de quelques semaines.

Avant, tout semble encore gérable. Après, les options juridiques se ferment une par une — et ce qui aurait pu être une restructuration propre devient une liquidation.

Ce que j'observe : la plupart des dirigeants arrivent trop tard. Pas par négligence. Par refus de nommer ce qui se passe.

Nommer ne signifie pas capituler. Ça signifie choisir le bon outil au bon moment : mandat ad hoc, conciliation, sauvegarde. Trois dispositifs. Trois niveaux d'urgence. Trois résultats très différents.

Si vous sentez que la trésorerie devient le sujet central de vos réunions, c'est le bon moment pour en parler. Pas dans six mois.`,
      cta: "Si votre situation ressemble à ce que je décris, parlons-en. Un échange de 20 minutes suffit souvent à clarifier les options.",
      rationale: "Ce post cible le moment de bascule psychologique du dirigeant — avant qu'il soit trop tard pour agir. Il positionne TAL&CO comme le cabinet qu'on appelle quand il est encore temps.",
      hashtags: ["#EntreprisesEnDifficulté", "#Restructuration", "#DroitDesAffaires", "#Dirigeants", "#Lyon"],
      truthAnchors: [
        "mandat ad hoc, conciliation et sauvegarde sont trois outils distincts avec des conditions d'accès différentes",
        "la cessation de paiements ferme l'accès aux procédures amiables",
        "TAL&CO accompagne les entreprises en difficulté depuis Lyon et Paris",
      ],
      status: "draft",
      createdAt: now,
      updatedAt: now,
      approvedAt: null,
      publishAt: null,
      publishedAt: null,
      remotePostId: null,
      lastError: null,
    },
    {
      id: "talco-draft-2",
      title: "Innovation sans protection — travailler pour ses concurrents",
      spark: "Innover sans protéger les contrats qui entourent l'innovation, c'est offrir son travail à ses concurrents.",
      objective: "conseil industrie et innovation",
      audience: "fondateurs de startups technologiques",
      angle: "La fuite ne vient pas du brevet — elle vient des relations mal encadrées autour de l'innovation.",
      hook: "Innover sans protéger, c'est travailler pour ses concurrents.",
      content: `Innover sans protéger, c'est travailler pour ses concurrents.

Les entreprises industrielles et technologiques que j'accompagne font souvent la même erreur : elles investissent dans la R&D, déposent leur brevet, et oublient de sécuriser les contrats qui entourent l'innovation.

Partenariats de développement. Accords de confidentialité. Clauses de propriété dans les contrats prestataires.

La fuite ne vient presque jamais du brevet. Elle vient de la relation mal encadrée.

Un co-développeur qui revendique une amélioration. Un prestataire qui repart avec votre savoir-faire. Un partenaire industriel qui exploite ce qu'il a appris à votre contact.

Ces situations se règlent mal après coup. Elles se préviennent avant de signer.

Nous travaillons avec des entreprises qui ont compris que la protection juridique de l'innovation n'est pas un frein à la croissance. C'est ce qui la rend durable.`,
      cta: "Vous avez un partenariat ou un contrat de co-développement à sécuriser ? Écrivez-moi directement.",
      rationale: "Ce post s'adresse aux fondateurs et dirigeants qui innovent sans mesurer leur exposition contractuelle. Il positionne TAL&CO comme le cabinet qui comprend les enjeux industriels et technologiques, pas seulement le droit.",
      hashtags: ["#Innovation", "#PropriétéIntellectuelle", "#Industrie", "#DroitDesAffaires", "#Technologie"],
      truthAnchors: [
        "TAL&CO a une expertise reconnue en industrie et Règlement Machines",
        "la propriété des améliorations dans les contrats de co-développement est un contentieux fréquent",
        "les accords de confidentialité et les clauses IP doivent être adaptés à chaque relation",
      ],
      status: "draft",
      createdAt: now,
      updatedAt: now,
      approvedAt: null,
      publishAt: null,
      publishedAt: null,
      remotePostId: null,
      lastError: null,
    },
  ],
};
