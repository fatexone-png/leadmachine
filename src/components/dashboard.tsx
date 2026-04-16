"use client";

import Link from "next/link";
import {
  useState,
  useTransition,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";

import { CharterModal } from "@/components/charter-modal";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import type {
  AppData,
  Draft,
  DraftStatus,
  Signal,
  SignalStatus,
} from "@/lib/types";

type Tab = "pilotage" | "studio" | "calendrier" | "fondations";

interface DashboardProps {
  data: AppData;
  notices: string[];
  environment: {
    claudeConfigured: boolean;
    linkedInConfigured: boolean;
    cronConfigured: boolean;
    appUrl: string;
  };
}

interface SignalImportState {
  title: string;
  sourceType: string;
  sourceLabel: string;
  sourceUrl: string;
  authorName: string;
  authorRole: string;
  sourceText: string;
  imageContext: string;
}

interface ReactionStrategyState {
  targetAudience: string;
  objective: string;
}

const draftStatusCopy: Record<DraftStatus, string> = {
  draft: "Brouillon",
  approved: "Approuve",
  scheduled: "Programme",
  publishing: "Publication en cours",
  published: "Publie",
  failed: "Erreur",
};

const signalStatusCopy: Record<SignalStatus, string> = {
  new: "Nouveau",
  qualified: "Qualifie",
  rejected: "Ecarte",
  comment_ready: "Commentaire pret",
  handled: "Traite",
};

export function Dashboard({ data, notices, environment }: DashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isNewUser = !data.brandProfile.bio && data.drafts.length === 0;
  const [activeTab, setActiveTab] = useState<Tab>(isNewUser ? "fondations" : "studio");
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);
  const [copiedCommentIndex, setCopiedCommentIndex] = useState<number | null>(null);
  const [sourceContextDraft, setSourceContextDraft] = useState<string | null>(null);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(data.signals[0]?.id ?? null);
  const [showImportForm, setShowImportForm] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(data.drafts[0]?.id ?? null);
  const [strategy, setStrategy] = useState<ReactionStrategyState>({
    targetAudience: data.brandProfile.audiences[0] || "",
    objective: "ouvrir la conversation",
  });
  const [signalImport, setSignalImport] = useState<SignalImportState>({
    title: "",
    sourceType: "linkedin",
    sourceLabel: "LinkedIn",
    sourceUrl: "",
    authorName: "",
    authorRole: "",
    sourceText: "",
    imageContext: "",
  });
  // Style sources management
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceLabel, setNewSourceLabel] = useState("");
  const [scrapingSourceId, setScrapingSourceId] = useState<string | null>(null);
  const styleSources = data.brandProfile.styleSources ?? [];
  // Generate success feedback
  const [generateSuccess, setGenerateSuccess] = useState(false);
  // Profile advanced accordion
  const [showAdvancedProfile, setShowAdvancedProfile] = useState(false);

  const sourceContext = sourceContextDraft ?? data.settings.sourceContext;
  const selectedSignal =
    data.signals.find((signal) => signal.id === selectedSignalId) ?? data.signals[0] ?? null;
  const newSignals = data.signals.filter((signal) => signal.status === "new").length;
  const qualifiedSignals = data.signals.filter((signal) => signal.status === "qualified").length;
  const signalsToReview = newSignals + qualifiedSignals;

  const draftsToShip = data.drafts.filter(
    (draft) => draft.status === "draft" || draft.status === "approved" || draft.status === "failed"
  ).length;
  const publishedPosts = data.drafts.filter((draft) => draft.status === "published").length;

  function showToast(message: string, isError = false) {
    setToast({ message, isError });
    window.setTimeout(() => setToast(null), 3500);
  }

  function runMutation(
    url: string,
    init: RequestInit,
    successMessage?: string,
    onSuccess?: () => void
  ) {
    startTransition(async () => {
      const response = await fetch(url, init);
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        showToast(payload.error || "Une erreur est survenue.", true);
        return;
      }

      if (successMessage || payload.message) {
        showToast(payload.message || successMessage || "");
      }

      onSuccess?.();
      router.refresh();
    });
  }

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    runMutation(
      "/api/profile",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          headline: formData.get("headline"),
          bio: formData.get("bio"),
          audiences: formData.get("audiences"),
          offers: formData.get("offers"),
          proofPoints: formData.get("proofPoints"),
          contentPillars: formData.get("contentPillars"),
          preferredCallsToAction: formData.get("preferredCallsToAction"),
          styleSamples: formData.get("styleSamples"),
          sourceContext,
        }),
      },
      "Profil mis a jour."
    );
  }

  function handleSourceSave() {
    runMutation(
      "/api/settings/source",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceContext }),
      },
      "Source editoriale mise a jour.",
      () => setSourceContextDraft(null)
    );
  }

  function handleScrapeSource(sourceId: string, url: string, label: string) {
    setScrapingSourceId(sourceId);
    startTransition(async () => {
      const response = await fetch("/api/profile/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, label, sourceId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        toneKeywords?: string[];
      };
      setScrapingSourceId(null);
      if (!response.ok) {
        showToast(payload.error || "Impossible d'analyser cette source.", true);
        return;
      }
      showToast(payload.message || "Source analysée.");
      router.refresh();
    });
  }

  function handleAddSource() {
    if (!newSourceUrl.trim()) return;
    const label = newSourceLabel.trim() || new URL(newSourceUrl.startsWith("http") ? newSourceUrl : `https://${newSourceUrl}`).hostname;
    const id = crypto.randomUUID();
    // Optimistically add then scrape
    runMutation(
      "/api/profile",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data.brandProfile,
          audiences: data.brandProfile.audiences.join("\n"),
          offers: data.brandProfile.offers.join("\n"),
          proofPoints: data.brandProfile.proofPoints.join("\n"),
          contentPillars: data.brandProfile.contentPillars.join("\n"),
          preferredCallsToAction: data.brandProfile.preferredCallsToAction.join("\n"),
          styleSamples: data.brandProfile.styleSamples.join("\n\n---\n\n"),
          styleSources: [
            ...styleSources,
            { id, url: newSourceUrl.trim(), label, scrapedAt: null, toneKeywords: [] },
          ],
        }),
      },
      undefined,
      () => {
        setNewSourceUrl("");
        setNewSourceLabel("");
        handleScrapeSource(id, newSourceUrl.trim(), label);
      }
    );
  }

  function handleRemoveSource(sourceId: string) {
    runMutation(
      "/api/profile",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data.brandProfile,
          audiences: data.brandProfile.audiences.join("\n"),
          offers: data.brandProfile.offers.join("\n"),
          proofPoints: data.brandProfile.proofPoints.join("\n"),
          contentPillars: data.brandProfile.contentPillars.join("\n"),
          preferredCallsToAction: data.brandProfile.preferredCallsToAction.join("\n"),
          styleSamples: data.brandProfile.styleSamples.join("\n\n---\n\n"),
          styleSources: styleSources.filter((s) => s.id !== sourceId),
        }),
      },
      "Source supprimée."
    );
  }

  function handleGenerateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setGenerateSuccess(false);

    runMutation(
      "/api/drafts/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spark: formData.get("spark"),
          audience: formData.get("audience"),
          objective: formData.get("objective"),
          cta: formData.get("cta"),
          sourceContext,
        }),
      },
      "Nouveau brouillon genere.",
      () => {
        setGenerateSuccess(true);
        setShowMobileDetail(true);
        window.setTimeout(() => setGenerateSuccess(false), 2200);
      }
    );
  }

  function handleSignalImportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const response = await fetch("/api/signals/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signalImport),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        signalId?: string;
      };

      if (!response.ok || !payload.signalId) {
        showToast(payload.error || "Impossible d'ajouter le signal.", true);
        return;
      }

      setSignalImport((current) => ({
        ...current,
        title: "",
        sourceUrl: "",
        authorName: "",
        authorRole: "",
        sourceText: "",
        imageContext: "",
      }));
      setSelectedSignalId(payload.signalId);
      showToast(payload.message || "Signal ajoute a l'inbox.");
      router.refresh();
    });
  }

  function handleGenerateCommentForSignal(signalId: string) {
    startTransition(async () => {
      const response = await fetch(`/api/signals/${signalId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetAudience: strategy.targetAudience,
          objective: strategy.objective,
          sourceContext,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        showToast(payload.error || "Impossible de proposer un commentaire.", true);
        return;
      }

      showToast(payload.message || "Commentaire propose.");
      router.refresh();
    });
  }

  function handleSignalAction(
    signalId: string,
    action: "qualify" | "reject" | "selectComment" | "markHandled" | "reopen",
    selectedComment?: string
  ) {
    runMutation(
      `/api/signals/${signalId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, selectedComment }),
      },
      undefined
    );
  }

  async function handleCopyComment(comment: string, index: number) {
    try {
      await navigator.clipboard.writeText(comment);
      setCopiedCommentIndex(index);
      window.setTimeout(() => {
        setCopiedCommentIndex((current) => (current === index ? null : current));
      }, 1800);
    } catch {
      showToast("Impossible de copier le commentaire.", true);
    }
  }

  function handleDraftAction(form: HTMLFormElement, draftId: string, action: string) {
    const formData = new FormData(form);

    runMutation(
      `/api/drafts/${draftId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          title: formData.get("title"),
          angle: formData.get("angle"),
          hook: formData.get("hook"),
          content: formData.get("content"),
          cta: formData.get("cta"),
          hashtags: formData.get("hashtags"),
          publishAt: formData.get("publishAt"),
        }),
      },
      undefined
    );
  }

  const selectedDraft = data.drafts.find((d) => d.id === selectedDraftId) ?? data.drafts[0] ?? null;

  const isPaywalled = data.plan === "free" && data.postsPublished >= 5;
  const isFreeNearLimit = data.plan === "free" && data.postsPublished >= 4 && data.postsPublished < 5;

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(198,95,37,0.10),transparent_40%),linear-gradient(180deg,rgba(255,248,241,0.97),rgba(244,239,230,0.99))]" />

      {/* ── Charter gate ── */}
      {!data.settings.charterAcceptedAt && (
        <CharterModal name={data.brandProfile.fullName || data.linkedin.name} />
      )}

      {/* ── Paywall overlay ── */}
      {isPaywalled && <PaywallOverlay email={data.linkedin.email} />}

      {/* ── Near-limit banner ── */}
      {isFreeNearLimit && (
        <div className="relative z-10 flex items-center justify-between gap-3 bg-amber-50 border-b border-amber-200 px-5 py-2.5">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Il vous reste 1 post gratuit.</span>{" "}
            Passez à Pro pour continuer à publier sans interruption.
          </p>
          <a href="/upgrade" className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 transition">
            Passer à Pro
          </a>
        </div>
      )}

      {/* Toast */}
      {toast ? (
        <div
          className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3.5 text-sm font-medium shadow-lg backdrop-blur ${
            toast.isError
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="ml-1 opacity-50 hover:opacity-100">✕</button>
        </div>
      ) : null}

      {/* ── Topbar ── */}
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-black/8 bg-white/90 px-4 backdrop-blur sm:px-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-bold tracking-tight text-stone-950 transition hover:opacity-70">
            PostPilote
          </Link>
          {data.brandProfile.fullName ? (
            <>
              <span className="text-stone-300">·</span>
              <span className="text-sm text-stone-600">{data.brandProfile.fullName}</span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {notices.map((notice) => (
            <span key={notice} className="hidden rounded-full border border-accent/25 bg-accent-soft px-3 py-1 text-xs font-medium text-stone-800 sm:inline-flex">
              {notice}
            </span>
          ))}
          <div className="hidden items-center gap-2 sm:flex">
            <StatusDot active={environment.claudeConfigured} label="IA" />
            <StatusDot active={data.linkedin.connected} label="LinkedIn" />
            <StatusDot active={environment.cronConfigured} label="Auto" />
          </div>
          {/* Mobile : indicateurs compacts */}
          <div className="flex items-center gap-1 sm:hidden">
            <span className={`h-2 w-2 rounded-full ${environment.claudeConfigured ? "bg-emerald-500" : "bg-stone-300"}`} title="IA" />
            <span className={`h-2 w-2 rounded-full ${data.linkedin.connected ? "bg-emerald-500" : "bg-stone-300"}`} title="LinkedIn" />
            <span className={`h-2 w-2 rounded-full ${environment.cronConfigured ? "bg-emerald-500" : "bg-stone-300"}`} title="Auto" />
          </div>
          {/* Déconnexion — toujours visible */}
          {data.linkedin.connected && (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                runMutation(
                  "/api/linkedin/disconnect",
                  { method: "POST", headers: { "Content-Type": "application/json" } },
                  "Compte LinkedIn déconnecté.",
                  () => { window.location.href = "/"; }
                )
              }
              className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="hidden sm:inline">Déconnecter</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Tab bar ── */}
      <nav className="relative z-10 flex h-12 shrink-0 items-stretch border-b border-black/8 bg-white/80 backdrop-blur">
        {(["pilotage", "studio", "calendrier", "fondations"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => { setActiveTab(tab); setShowMobileDetail(false); }}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 text-sm font-semibold transition sm:flex-none sm:px-5 ${
              activeTab === tab
                ? "border-b-2 border-stone-950 text-stone-950"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            {tab === "pilotage" ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:hidden"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <span className="hidden sm:inline">Sujets</span>
                <span className="sm:hidden">Sujets</span>
                {signalsToReview > 0 && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">{signalsToReview}</span>}
              </>
            ) : tab === "studio" ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:hidden"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                <span>Posts</span>
                {draftsToShip > 0 && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">{draftsToShip}</span>}
              </>
            ) : tab === "calendrier" ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span className="hidden sm:inline">Calendrier</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:hidden"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>Profil</span>
              </>
            )}
          </button>
        ))}
      </nav>

      {/* ── Onboarding progress bar (after wizard, during setup) ── */}
      {isNewUser && (data.brandProfile.websiteUrl || data.brandProfile.bio) && (
        <div className="relative z-10 border-b border-black/6 bg-white/80 px-4 py-2 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${[Boolean(data.brandProfile.websiteUrl), Boolean(data.brandProfile.bio), data.drafts.length > 0].filter(Boolean).length * 33.3}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-stone-500">
              {[Boolean(data.brandProfile.websiteUrl), Boolean(data.brandProfile.bio), data.drafts.length > 0].filter(Boolean).length}/3 étapes
            </span>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="relative flex-1 overflow-hidden">

        {/* ── Onboarding wizard (replaces all tabs until complete) ── */}
        {data.settings.charterAcceptedAt && !data.settings.onboardingCompleted ? (
          <OnboardingWizard
            linkedInConnected={data.linkedin.connected}
            hasWebsiteAnalyzed={(data.brandProfile.styleSources ?? []).some((s) => s.scrapedAt)}
            userName={data.brandProfile.fullName || data.linkedin.name}
          />
        ) : null}

        {/* ── Main tabs (only when onboarding is done) ── */}
        {(data.settings.onboardingCompleted || !data.settings.charterAcceptedAt) && (
        <>

        {/* ── SUJETS ── */}
        {activeTab === "pilotage" ? (
          <div className="flex h-full overflow-hidden animate-fade-in">

            {/* Left: signal list */}
            <div className={`${showMobileDetail ? "hidden sm:flex" : "flex"} w-full shrink-0 flex-col overflow-hidden border-r border-black/8 sm:w-80 xl:w-96`}>
              {/* List header */}
              <div className="flex shrink-0 items-center justify-between border-b border-black/6 bg-white/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-stone-900">Sujets</span>
                  {signalsToReview > 0 && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">{signalsToReview}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowImportForm((v) => !v)}
                  className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-black/20"
                >
                  {showImportForm ? "← Liste" : "+ Ajouter"}
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto">
                {showImportForm ? (
                  <form className="grid gap-3 p-4" onSubmit={handleSignalImportSubmit}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Ajouter un sujet</p>
                    <Field label="Titre">
                      <input value={signalImport.title} onChange={(e) => setSignalImport((c) => ({ ...c, title: e.target.value }))} className={inputClassName} placeholder="Ex: Post sur la conformité machines" />
                    </Field>
                    <Field label="Auteur du post">
                      <input value={signalImport.authorName} onChange={(e) => setSignalImport((c) => ({ ...c, authorName: e.target.value }))} className={inputClassName} placeholder="Ex: Diane Imbert" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Fonction / contexte">
                        <input value={signalImport.authorRole} onChange={(e) => setSignalImport((c) => ({ ...c, authorRole: e.target.value }))} className={inputClassName} placeholder="Ex: Dirigeante PME" />
                      </Field>
                      <Field label="Type">
                        <select value={signalImport.sourceType} onChange={(e) => setSignalImport((c) => ({ ...c, sourceType: e.target.value }))} className={inputClassName}>
                          <option value="linkedin">LinkedIn</option>
                          <option value="article">Article</option>
                          <option value="newsletter">Newsletter</option>
                          <option value="note">Note</option>
                        </select>
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Canal">
                        <input value={signalImport.sourceLabel} onChange={(e) => setSignalImport((c) => ({ ...c, sourceLabel: e.target.value }))} className={inputClassName} placeholder="Ex: LinkedIn" />
                      </Field>
                      <Field label="URL">
                        <input value={signalImport.sourceUrl} onChange={(e) => setSignalImport((c) => ({ ...c, sourceUrl: e.target.value }))} className={inputClassName} placeholder="https://..." />
                      </Field>
                    </div>
                    <Field label="Texte du post ou article">
                      <textarea required rows={5} value={signalImport.sourceText} onChange={(e) => setSignalImport((c) => ({ ...c, sourceText: e.target.value }))} className={textareaClassName} placeholder="Collez le texte ici." />
                    </Field>
                    <Field label="Contexte image (optionnel)">
                      <textarea rows={2} value={signalImport.imageContext} onChange={(e) => setSignalImport((c) => ({ ...c, imageContext: e.target.value }))} className={textareaClassName} placeholder="Carousel, schéma, capture…" />
                    </Field>
                    <button type="submit" className={primaryButtonClassName} disabled={isPending}>
                      {isPending ? "Analyse en cours..." : "Analyser et ajouter"}
                    </button>
                  </form>
                ) : data.signals.length === 0 ? (
                  <div className="p-4">
                    <EmptyState message="Aucun sujet pour l'instant. Cliquez sur + Ajouter pour en saisir un." />
                  </div>
                ) : (
                  <div className="divide-y divide-black/5">
                    {data.signals.map((signal) => (
                      <button
                        key={signal.id}
                        type="button"
                        onClick={() => { setSelectedSignalId(signal.id); setShowMobileDetail(true); }}
                        className={`w-full p-4 text-left transition hover:bg-stone-50 ${selectedSignal?.id === signal.id ? "bg-accent-soft/60 border-l-2 border-l-accent" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">Publie par</p>
                            <p className="truncate text-sm font-semibold text-stone-900">{signal.authorName || "Auteur inconnu"}</p>
                            <p className="truncate text-xs text-stone-500">{signal.authorRole ? `${signal.authorRole} · ${signal.sourceLabel}` : signal.sourceLabel}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            signal.status === "qualified" ? "bg-emerald-100 text-emerald-800"
                            : signal.status === "comment_ready" ? "bg-sky-100 text-sky-800"
                            : signal.status === "rejected" ? "bg-stone-100 text-stone-500"
                            : "bg-amber-100 text-amber-800"
                          }`}>
                            {signal.interestScore}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold leading-5 text-stone-900">{signal.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{signal.summary}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: workbench */}
            <div className={`${showMobileDetail ? "flex" : "hidden sm:flex"} flex-1 flex-col overflow-hidden`}>
              {/* Bouton retour mobile */}
              <div className="flex shrink-0 items-center gap-3 border-b border-black/6 bg-white/60 px-4 py-3 sm:hidden">
                <button type="button" onClick={() => setShowMobileDetail(false)} className="flex items-center gap-1.5 text-sm font-semibold text-stone-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  Sujets
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {selectedSignal ? (
                <SignalWorkbench
                  copiedCommentIndex={copiedCommentIndex}
                  isPending={isPending}
                  onCopyComment={handleCopyComment}
                  onGenerateComment={handleGenerateCommentForSignal}
                  onSignalAction={handleSignalAction}
                  selectedSignal={selectedSignal}
                  setStrategy={setStrategy}
                  strategy={strategy}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-stone-400">Sélectionnez un sujet à gauche pour l'analyser.</p>
                </div>
              )}
              </div>
            </div>
          </div>
        ) : null}

        {/* ── POSTS ── */}
        {activeTab === "studio" ? (
          <div className="flex h-full overflow-hidden animate-fade-in">

            {/* Left: generate + pipeline */}
            <div className={`${showMobileDetail ? "hidden sm:flex" : "flex"} w-full shrink-0 flex-col overflow-hidden border-r border-black/8 sm:w-80 xl:w-96`}>
              <div className="flex shrink-0 items-center justify-between border-b border-black/6 bg-white/60 px-4 py-3">
                <span className="text-sm font-semibold text-stone-900">Générer un post</span>
                <div className="flex gap-1.5">
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{draftsToShip} à valider</span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{publishedPosts} publiés</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <form className="grid gap-4" onSubmit={handleGenerateSubmit}>
                  <Field label="Votre idée de départ">
                    <textarea name="spark" rows={5} required placeholder="Ex: Les dirigeants qui attendent trop longtemps avant de consulter un avocat…" className={textareaClassName} />
                  </Field>
                  <Field label="Audience cible">
                    <input name="audience" defaultValue={data.brandProfile.audiences[0] || ""} className={inputClassName} />
                  </Field>
                  <Field label="Objectif du post">
                    <select name="objective" className={inputClassName} defaultValue="notoriete">
                      <option value="notoriete">Notoriété</option>
                      <option value="prevention">Prévention</option>
                      <option value="conseil">Conseil</option>
                      <option value="expertise">Démontrer l'expertise</option>
                      <option value="engagement">Ouvrir la conversation</option>
                    </select>
                  </Field>
                  <Field label="Call to action">
                    <input name="cta" defaultValue={data.brandProfile.preferredCallsToAction[0] || ""} className={inputClassName} />
                  </Field>
                  <button
                    type="submit"
                    disabled={isPending}
                    className={`${primaryButtonClassName} ${generateSuccess ? "animate-success-pop bg-emerald-600!" : ""}`}
                  >
                    {isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Spinner />
                        Génération en cours…
                      </span>
                    ) : generateSuccess ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        Post créé !
                      </span>
                    ) : "Générer le post"}
                  </button>
                  {data.drafts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowMobileDetail(true)}
                      className="mt-2 w-full rounded-full border border-black/10 bg-white py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 sm:hidden"
                    >
                      Voir mes posts ({data.drafts.length})
                    </button>
                  )}
                </form>
              </div>
            </div>

            {/* Right: draft list */}
            <div className={`${showMobileDetail ? "flex" : "hidden sm:flex"} flex-1 flex-col overflow-hidden`}>
              {/* Bouton retour mobile */}
              <div className="flex shrink-0 items-center gap-3 border-b border-black/6 bg-white/60 px-4 py-3 sm:hidden">
                <button type="button" onClick={() => setShowMobileDetail(false)} className="flex items-center gap-1.5 text-sm font-semibold text-stone-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  Générer
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-3 border-b border-black/6 bg-white/60 px-4 py-3">
                <span className="text-sm font-semibold text-stone-900">Mes posts</span>
                {data.drafts.length > 1 && (
                  <div className="flex gap-1 overflow-x-auto">
                    {data.drafts.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDraftId(d.id)}
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                          selectedDraft?.id === d.id
                            ? "bg-stone-950 text-white"
                            : "border border-black/10 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                      >
                        {d.title.length > 28 ? `${d.title.slice(0, 28)}…` : d.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {data.drafts.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-2xl">✍️</div>
                    <div>
                      <p className="text-base font-semibold text-stone-900">Votre premier post LinkedIn</p>
                      <p className="mt-1 text-sm leading-6 text-stone-500">Décrivez votre idée à gauche — l'IA rédige un post dans votre voix en quelques secondes.</p>
                    </div>
                  </div>
                ) : selectedDraft ? (
                  <DraftCard
                    key={`${selectedDraft.id}-${selectedDraft.updatedAt}`}
                    draft={selectedDraft}
                    isPending={isPending}
                    onAction={(form, action) => handleDraftAction(form, selectedDraft.id, action)}
                  />
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* ── CALENDRIER ── */}
        {activeTab === "calendrier" ? (
          <div className="h-full overflow-y-auto p-4 sm:p-6 animate-fade-in">
            <CalendarView drafts={data.drafts} />
          </div>
        ) : null}

        {/* ── MON PROFIL ── */}
        {activeTab === "fondations" ? (
          <div className="flex h-full flex-col overflow-y-auto sm:flex-row sm:overflow-hidden animate-fade-in">

            {/* Left: LinkedIn + source */}
            <div className="flex w-full shrink-0 flex-col border-b border-black/8 sm:w-80 sm:border-b-0 sm:border-r sm:overflow-y-auto xl:w-96">
              <div className="shrink-0 border-b border-black/6 bg-white/60 px-4 py-3">
                <span className="text-sm font-semibold text-stone-900">Connexion & sources</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid gap-5">
                  {/* LinkedIn */}
                  <section className="grid gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">LinkedIn</p>
                    {!environment.linkedInConfigured ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                        Configurez LINKEDIN_CLIENT_ID et LINKEDIN_CLIENT_SECRET pour activer la connexion.
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <a href="/api/linkedin/connect" className={primaryButtonClassName}>
                        {data.linkedin.connected ? "Reconnecter" : "Connecter LinkedIn"}
                      </a>
                      {data.linkedin.connected ? (
                        <button type="button" className={secondaryButtonClassName} disabled={isPending}
                          onClick={() => runMutation("/api/linkedin/disconnect", { method: "POST", headers: { "Content-Type": "application/json" } }, "Compte LinkedIn déconnecté.", () => { window.location.href = "/"; })}
                        >
                          Déconnecter
                        </button>
                      ) : null}
                    </div>
                    <div className="rounded-[1.4rem] border border-black/8 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700">
                      <StatusInfo label="Statut" value={data.linkedin.connected ? `Connecté — ${data.linkedin.name}` : "Non connecté"} />
                      <StatusInfo label="Publication" value={environment.cronConfigured ? "Automatique" : "Manuelle"} />
                    </div>
                  </section>

                  {/* ── Sources d'inspiration ── */}
                  <section className="grid gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Sources d'inspiration</p>
                      <p className="mt-1 text-xs leading-5 text-stone-400">
                        L'IA visite ces pages, capture leur plume et construit votre style éditorial unique.
                      </p>
                    </div>

                    {/* Existing sources */}
                    {styleSources.length > 0 && (
                      <div className="grid gap-2">
                        {styleSources.map((src) => (
                          <div key={src.id} className="flex items-center gap-2 rounded-2xl border border-black/8 bg-white px-3 py-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-xs font-semibold text-stone-900">{src.label}</p>
                              <p className="truncate text-[10px] text-stone-400">{src.url.replace(/https?:\/\//, "")}</p>
                              {src.toneKeywords.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {src.toneKeywords.slice(0, 4).map((kw) => (
                                    <span key={kw} className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[9px] font-medium text-stone-700">{kw}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {src.scrapedAt ? (
                                <span className="text-[10px] text-stone-400">
                                  {new Date(src.scrapedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Non analysé</span>
                              )}
                              <button
                                type="button"
                                title="Re-analyser"
                                disabled={isPending || scrapingSourceId === src.id}
                                onClick={() => handleScrapeSource(src.id, src.url, src.label)}
                                className="rounded-full border border-black/10 px-2 py-0.5 text-[10px] font-semibold text-stone-600 transition hover:bg-stone-100 disabled:opacity-40"
                              >
                                {scrapingSourceId === src.id ? "…" : "↻"}
                              </button>
                              <button
                                type="button"
                                title="Supprimer"
                                disabled={isPending}
                                onClick={() => handleRemoveSource(src.id)}
                                className="rounded-full border border-black/10 px-2 py-0.5 text-[10px] font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-40"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new source */}
                    <div className="grid gap-2">
                      <input
                        type="url"
                        value={newSourceUrl}
                        onChange={(e) => setNewSourceUrl(e.target.value)}
                        placeholder="https://monsite.fr ou linkedin.com/in/..."
                        className={inputClassName}
                      />
                      <div className="flex gap-2">
                        <input
                          value={newSourceLabel}
                          onChange={(e) => setNewSourceLabel(e.target.value)}
                          placeholder="Nom (ex: Mon site, Confrère inspirant…)"
                          className={`${inputClassName} flex-1`}
                        />
                        <button
                          type="button"
                          onClick={handleAddSource}
                          disabled={isPending || !newSourceUrl.trim()}
                          className="shrink-0 rounded-full bg-stone-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-stone-800 disabled:opacity-40"
                        >
                          + Ajouter
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* ── Ton & longueur ── */}
                  <section className="grid gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Réglages de style IA</p>
                    <Field label="Ton des posts">
                      <select
                        defaultValue={data.brandProfile.tonePreset ?? "direct"}
                        onChange={(e) => runMutation("/api/profile", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ...data.brandProfile, tonePreset: e.target.value, audiences: data.brandProfile.audiences.join("\n"), offers: data.brandProfile.offers.join("\n"), proofPoints: data.brandProfile.proofPoints.join("\n"), contentPillars: data.brandProfile.contentPillars.join("\n"), preferredCallsToAction: data.brandProfile.preferredCallsToAction.join("\n"), styleSamples: data.brandProfile.styleSamples.join("\n\n---\n\n"), styleSources }),
                        }, "Ton mis à jour.")}
                        className={inputClassName}
                      >
                        <option value="formal">Formel — ton expert, phrases structurées</option>
                        <option value="direct">Direct — phrases courtes, impact immédiat</option>
                        <option value="educational">Pédagogique — expliquer pour convaincre</option>
                        <option value="storytelling">Storytelling — récit, émotion, narration</option>
                      </select>
                    </Field>
                    <Field label="Longueur des posts">
                      <select
                        defaultValue={data.brandProfile.postLengthPreset ?? "medium"}
                        onChange={(e) => runMutation("/api/profile", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ...data.brandProfile, postLengthPreset: e.target.value, audiences: data.brandProfile.audiences.join("\n"), offers: data.brandProfile.offers.join("\n"), proofPoints: data.brandProfile.proofPoints.join("\n"), contentPillars: data.brandProfile.contentPillars.join("\n"), preferredCallsToAction: data.brandProfile.preferredCallsToAction.join("\n"), styleSamples: data.brandProfile.styleSamples.join("\n\n---\n\n"), styleSources }),
                        }, "Longueur mise à jour.")}
                        className={inputClassName}
                      >
                        <option value="short">Court — 400 à 700 caractères</option>
                        <option value="medium">Moyen — 700 à 1 200 caractères</option>
                        <option value="long">Long — 1 200 à 2 000 caractères</option>
                      </select>
                    </Field>
                  </section>

                  {/* ── Contexte éditorial ── */}
                  <section className="grid gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Contexte éditorial</p>
                      <p className="mt-1 text-xs leading-5 text-stone-400">Généré automatiquement par l'analyse de vos sources. Modifiable.</p>
                    </div>
                    <textarea
                      value={sourceContext}
                      onChange={(e) => setSourceContextDraft(e.target.value)}
                      rows={6}
                      className={textareaClassName}
                      placeholder="Analysez votre site ci-dessus pour remplir ce champ automatiquement…"
                    />
                    <button type="button" className={primaryButtonClassName} disabled={isPending} onClick={handleSourceSave}>
                      Sauvegarder le contexte
                    </button>
                  </section>

                  {/* ── Automatisation ── */}
                  <section className="grid gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Automatisation</p>
                      <p className="mt-1 text-xs leading-5 text-stone-400">
                        Recevez chaque matin un post prêt à valider par email. Un clic pour approuver, un clic pour refuser.
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-black/8 bg-white px-4 py-3">
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={data.settings.emailNotifications}
                          onChange={(e) =>
                            runMutation("/api/settings/notifications", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ emailNotifications: e.target.checked }),
                            }, e.target.checked ? "Emails activés." : "Emails désactivés.")
                          }
                        />
                        <div className={`h-5 w-9 rounded-full transition-colors ${data.settings.emailNotifications ? "bg-accent" : "bg-stone-200"}`} />
                        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${data.settings.emailNotifications ? "translate-x-4" : "translate-x-0.5"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-900">Post quotidien par email</p>
                        <p className="text-xs text-stone-400">{data.linkedin.email || "Connectez LinkedIn pour activer"}</p>
                      </div>
                    </label>
                    {data.settings.emailNotifications && (
                      <Field label="Heure de génération (UTC)">
                        <input
                          type="time"
                          defaultValue={data.settings.dailyPostTime || "08:00"}
                          className={inputClassName}
                          onBlur={(e) =>
                            runMutation("/api/settings/notifications", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ dailyPostTime: e.target.value }),
                            }, "Heure mise à jour.")
                          }
                        />
                      </Field>
                    )}
                    {!process.env.NEXT_PUBLIC_EMAIL_CONFIGURED && data.settings.emailNotifications && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                        Ajoutez <code>RESEND_API_KEY</code> dans vos variables d'environnement pour activer l'envoi d'emails.
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>

            {/* Right: profile form */}
            <div className="flex-1 overflow-y-auto p-4 pb-12 sm:p-6">
              <form key={data.brandProfile.updatedAt} className="grid max-w-2xl gap-4" onSubmit={handleProfileSubmit}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Votre identité éditoriale</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nom complet">
                    <input name="fullName" defaultValue={data.brandProfile.fullName} className={inputClassName} />
                  </Field>
                  <Field label="Headline">
                    <input name="headline" defaultValue={data.brandProfile.headline} className={inputClassName} />
                  </Field>
                </div>
                <Field label="Site web">
                  <input name="websiteUrl" type="url" defaultValue={data.brandProfile.websiteUrl} placeholder="https://votresite.fr" className={inputClassName} />
                </Field>
                <Field label="Bio">
                  <textarea name="bio" defaultValue={data.brandProfile.bio} rows={3} className={textareaClassName} />
                </Field>

                {/* Advanced fields accordion */}
                <button
                  type="button"
                  onClick={() => setShowAdvancedProfile((v) => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-stone-500 transition hover:text-stone-800"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className={`transition-transform duration-200 ${showAdvancedProfile ? "rotate-90" : ""}`}
                  >
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                  {showAdvancedProfile ? "Masquer les champs avancés" : "Afficher les champs avancés"}
                  <span className="text-[10px] font-normal text-stone-400">(audiences, offres, piliers…)</span>
                </button>

                {showAdvancedProfile && (
                  <div className="grid gap-4 animate-fade-in">
                    <Field label="Audiences (une par ligne)">
                      <textarea name="audiences" defaultValue={data.brandProfile.audiences.join("\n")} rows={3} className={textareaClassName} />
                    </Field>
                    <Field label="Offres (une par ligne)">
                      <textarea name="offers" defaultValue={data.brandProfile.offers.join("\n")} rows={3} className={textareaClassName} />
                    </Field>
                    <Field label="Preuves & références (une par ligne)">
                      <textarea name="proofPoints" defaultValue={data.brandProfile.proofPoints.join("\n")} rows={4} className={textareaClassName} />
                    </Field>
                    <Field label="Piliers de contenu (un par ligne)">
                      <textarea name="contentPillars" defaultValue={data.brandProfile.contentPillars.join("\n")} rows={3} className={textareaClassName} />
                    </Field>
                    <Field label="Appels à l'action préférés (un par ligne)">
                      <textarea name="preferredCallsToAction" defaultValue={data.brandProfile.preferredCallsToAction.join("\n")} rows={3} className={textareaClassName} />
                    </Field>
                    <Field label="Exemples de style (séparés par ---)">
                      <>
                        <textarea name="styleSamples" defaultValue={data.brandProfile.styleSamples.join("\n\n---\n\n")} rows={10} className={textareaClassName} />
                        <p className="text-xs leading-5 text-stone-500">Un exemple par bloc, séparé par <code>---</code>.</p>
                      </>
                    </Field>
                  </div>
                )}

                {/* Hidden fields so form still submits advanced data when accordion is closed */}
                {!showAdvancedProfile && (
                  <>
                    <input type="hidden" name="audiences" value={data.brandProfile.audiences.join("\n")} />
                    <input type="hidden" name="offers" value={data.brandProfile.offers.join("\n")} />
                    <input type="hidden" name="proofPoints" value={data.brandProfile.proofPoints.join("\n")} />
                    <input type="hidden" name="contentPillars" value={data.brandProfile.contentPillars.join("\n")} />
                    <input type="hidden" name="preferredCallsToAction" value={data.brandProfile.preferredCallsToAction.join("\n")} />
                    <input type="hidden" name="styleSamples" value={data.brandProfile.styleSamples.join("\n\n---\n\n")} />
                  </>
                )}

                <button type="submit" className={primaryButtonClassName} disabled={isPending}>
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2"><Spinner /> Enregistrement…</span>
                  ) : "Enregistrer le profil"}
                </button>
              </form>
            </div>
          </div>
        ) : null}

        </>
        )}

      </div>
    </div>
  );
}


function CalendarView({ drafts }: { drafts: Draft[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Build a 5-week grid starting from the first day of the month
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const statusColor: Partial<Record<DraftStatus, string>> = {
    scheduled: "bg-accent text-white",
    approved: "bg-emerald-500 text-white",
    published: "bg-stone-700 text-white",
    draft: "bg-stone-200 text-stone-700",
    failed: "bg-red-400 text-white",
  };

  const monthName = today.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Vue calendrier</p>
          <h2 className="mt-1 text-xl font-semibold capitalize tracking-[-0.03em] text-stone-950">{monthName}</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          {[
            { label: "Brouillon", cls: "bg-stone-200 text-stone-700" },
            { label: "Approuvé", cls: "bg-emerald-500 text-white" },
            { label: "Programmé", cls: "bg-accent text-white" },
            { label: "Publié", cls: "bg-stone-700 text-white" },
          ].map(({ label, cls }) => (
            <span key={label} className={`rounded-full px-2 py-0.5 font-semibold ${cls}`}>{label}</span>
          ))}
        </div>
      </div>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wide text-stone-400">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="h-16 rounded-xl" />;

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayDrafts = drafts.filter((d) => {
            const ref = d.publishAt || d.publishedAt || d.createdAt;
            return ref?.startsWith(dateStr);
          });
          const isToday = day === today.getDate();

          return (
            <div
              key={day}
              className={`flex h-16 flex-col rounded-xl border p-1.5 ${
                isToday ? "border-accent/40 bg-accent-soft" : "border-black/6 bg-white/60"
              }`}
            >
              <span className={`mb-1 text-[10px] font-bold ${isToday ? "text-accent" : "text-stone-500"}`}>
                {day}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayDrafts.slice(0, 2).map((d) => (
                  <span
                    key={d.id}
                    title={d.title}
                    className={`truncate rounded px-1 text-[8px] font-semibold leading-4 ${statusColor[d.status] ?? "bg-stone-100 text-stone-500"}`}
                  >
                    {d.title.length > 16 ? `${d.title.slice(0, 16)}…` : d.title}
                  </span>
                ))}
                {dayDrafts.length > 2 && (
                  <span className="text-[8px] text-stone-400">+{dayDrafts.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upcoming list */}
      {drafts.filter((d) => d.publishAt && d.status === "scheduled").length > 0 && (
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Programmés à venir</p>
          <div className="grid gap-2">
            {drafts
              .filter((d) => d.publishAt && d.status === "scheduled")
              .sort((a, b) => (a.publishAt ?? "").localeCompare(b.publishAt ?? ""))
              .map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white px-4 py-3">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-900">{d.title}</p>
                    <p className="text-xs text-stone-400">
                      {new Date(d.publishAt!).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-stone-700">Programmé</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin-smooth shrink-0" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function PaywallOverlay({ email }: { email: string | null }) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = (await res.json()) as { url?: string; error?: string };
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || "Une erreur est survenue.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-4xl border border-black/8 bg-white p-8 shadow-2xl">
        {/* Icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-2xl">🎯</div>

        {/* Copy */}
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
          Vous avez publié 5 posts gratuits
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Votre audience commence à vous reconnaître sur LinkedIn.
          Ne disparaissez pas maintenant — c'est exactement là que la régularité crée la confiance.
        </p>

        {/* Offer */}
        <div className="mt-6 rounded-3xl border border-accent/30 bg-accent-soft p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Offre Pro</p>
              <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-stone-950">
                39€<span className="text-base font-normal text-stone-500">/mois</span>
              </p>
            </div>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">Recommandé</span>
          </div>
          <ul className="mt-4 space-y-2">
            {["Posts illimités", "Publication automatique", "IA pleine puissance", "Sans engagement"].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-stone-700">
                <svg className="shrink-0 text-accent" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="mt-5 w-full rounded-full bg-accent py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
          >
            {loading ? "Redirection vers le paiement…" : "Continuer avec Pro — 39€/mois"}
          </button>
          {email && (
            <p className="mt-2 text-center text-xs text-stone-400">Compte : {email}</p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-stone-400">
          Résiliation en 1 clic depuis votre espace client ·{" "}
          <a href="/upgrade" className="underline hover:text-stone-700">Voir tous les tarifs</a>
        </p>
      </div>
    </div>
  );
}

function StatusDot({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
      active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-50 text-stone-500"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-stone-400"}`} />
      {label}
    </span>
  );
}

function SignalWorkbench({
  copiedCommentIndex,
  isPending,
  onCopyComment,
  onGenerateComment,
  onSignalAction,
  selectedSignal,
  setStrategy,
  strategy,
}: {
  copiedCommentIndex: number | null;
  isPending: boolean;
  onCopyComment: (comment: string, index: number) => Promise<void>;
  onGenerateComment: (signalId: string) => void;
  onSignalAction: (
    signalId: string,
    action: "qualify" | "reject" | "selectComment" | "markHandled" | "reopen",
    selectedComment?: string
  ) => void;
  selectedSignal: Signal;
  setStrategy: Dispatch<SetStateAction<ReactionStrategyState>>;
  strategy: ReactionStrategyState;
}) {
  const suggestion = selectedSignal.suggestion;
  const authorMeta = selectedSignal.authorRole
    ? `${selectedSignal.authorRole} · ${selectedSignal.sourceLabel}`
    : selectedSignal.sourceLabel;

  return (
    <div className="grid gap-4 max-w-2xl">

      {/* ── Section 1 : Le post original ── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
          Post repéré dans votre secteur
        </p>
        <div className="rounded-[1.75rem] border border-black/10 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          {/* Auteur */}
          <div className="flex items-center gap-3 border-b border-black/6 px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-sm font-bold text-stone-600">
              {getSignalAuthorInitials(selectedSignal.authorName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">Publié par</p>
              <p className="truncate text-sm font-semibold text-stone-950">{selectedSignal.authorName || "Auteur inconnu"}</p>
              <p className="text-xs text-stone-400">{authorMeta}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                selectedSignal.interestScore >= 80 ? "bg-emerald-100 text-emerald-700"
                : selectedSignal.interestScore >= 60 ? "bg-amber-100 text-amber-700"
                : "bg-stone-100 text-stone-600"
              }`}>
                {selectedSignal.interestScore >= 80 ? "Très pertinent" : selectedSignal.interestScore >= 60 ? "Pertinent" : "À évaluer"}
              </span>
              {selectedSignal.sourceUrl ? (
                <a
                  href={selectedSignal.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-black/10 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
                >
                  {selectedSignal.sourceType === "article" ? "Lire l'article ↗" : `Voir sur ${selectedSignal.sourceLabel} ↗`}
                </a>
              ) : (
                <span className="rounded-full border border-dashed border-black/12 px-3 py-1 text-xs text-stone-400">
                  Ajouté manuellement
                </span>
              )}
            </div>
          </div>

          {/* Texte du post */}
          <div className="px-5 py-4">
            <div className="mb-3 flex flex-wrap gap-2 text-xs text-stone-500">
              {selectedSignal.authorRole ? (
                <span className="rounded-full border border-black/8 bg-stone-50 px-3 py-1">
                  {selectedSignal.authorRole}
                </span>
              ) : null}
              <span className="rounded-full border border-black/8 bg-stone-50 px-3 py-1">
                via {selectedSignal.sourceLabel}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-stone-800">{selectedSignal.sourceText}</p>
            {selectedSignal.imageContext ? (
              <p className="mt-3 rounded-xl border border-black/6 bg-stone-50 px-3 py-2 text-xs text-stone-500">
                📎 {selectedSignal.imageContext}
              </p>
            ) : null}
          </div>

          {/* Pourquoi ce post vous concerne */}
          {selectedSignal.fitReasons.length > 0 ? (
            <div className="border-t border-black/6 px-5 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Pourquoi commenter ce post</p>
              <div className="flex flex-wrap gap-2">
                {selectedSignal.fitReasons.map((reason) => (
                  <span key={reason} className="rounded-full border border-black/8 bg-stone-50 px-3 py-1 text-xs text-stone-600">
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Section 2 : Vos actions ── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
          Rédiger votre commentaire
        </p>
        <div className="rounded-[1.75rem] border border-black/8 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Audience visée">
              <input
                value={strategy.targetAudience}
                onChange={(event) =>
                  setStrategy((current) => ({ ...current, targetAudience: event.target.value }))
                }
                className={inputClassName}
              />
            </Field>
            <Field label="Objectif">
              <select
                value={strategy.objective}
                onChange={(event) =>
                  setStrategy((current) => ({ ...current, objective: event.target.value }))
                }
                className={inputClassName}
              >
                <option value="ouvrir la conversation">Ouvrir la conversation</option>
                <option value="montrer une lecture terrain">Montrer une lecture terrain</option>
                <option value="renforcer la credibilite">Renforcer la crédibilité</option>
                <option value="attirer des prospects">Attirer des prospects</option>
              </select>
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className={primaryButtonClassName}
              disabled={isPending}
              onClick={() => onGenerateComment(selectedSignal.id)}
            >
              {suggestion ? "Regénérer le commentaire" : "Proposer un commentaire"}
            </button>
            <button
              type="button"
              className={secondaryButtonClassName}
              disabled={isPending}
              onClick={() => onSignalAction(selectedSignal.id, "qualify")}
            >
              Qualifier
            </button>
            <button
              type="button"
              className={secondaryButtonClassName}
              disabled={isPending}
              onClick={() => onSignalAction(selectedSignal.id, "reject")}
            >
              Écarter
            </button>
            {selectedSignal.status === "rejected" ? (
              <button
                type="button"
                className={secondaryButtonClassName}
                disabled={isPending}
                onClick={() => onSignalAction(selectedSignal.id, "reopen")}
              >
                Rouvrir
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {selectedSignal.selectedComment ? (
        <section className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950">
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-700">Commentaire retenu</p>
          <p className="mt-3 whitespace-pre-wrap">{selectedSignal.selectedComment}</p>
          <p className="mt-3 text-xs leading-5 text-emerald-800/80">
            Copiez ce commentaire, publiez-le manuellement sur LinkedIn, puis marquez ce sujet comme traité.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className={secondaryButtonClassName}
              onClick={() => onCopyComment(selectedSignal.selectedComment as string, 99)}
            >
              {copiedCommentIndex === 99 ? "Copie" : "Copier le commentaire"}
            </button>
            <button
              type="button"
              className={primaryButtonClassName}
              disabled={isPending}
              onClick={() => onSignalAction(selectedSignal.id, "markHandled")}
            >
              Marquer comme traité
            </button>
          </div>
        </section>
      ) : null}

      {suggestion ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <SignalInsightCard
              eyebrow="Angle recommande"
              title={suggestion.bestAngle}
              body={suggestion.lead}
            />
            <SignalInsightCard
              eyebrow="Pourquoi cette piste"
              title="Lecture machine"
              body={suggestion.rationale}
            />
          </div>

          <div className="grid gap-4">
            {suggestion.comments.map((comment, index) => (
              <section
                key={`${index}-${comment.slice(0, 24)}`}
                className="grid gap-3 rounded-[1.75rem] border border-black/8 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                      {commentCardTitle(index)}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      Une version exploitable tout de suite, sans effet IA visible.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={secondaryButtonClassName}
                      onClick={() => onCopyComment(comment, index)}
                    >
                      {copiedCommentIndex === index ? "Copie" : "Copier"}
                    </button>
                    <button
                      type="button"
                      className={primaryButtonClassName}
                      disabled={isPending}
                      onClick={() => onSignalAction(selectedSignal.id, "selectComment", comment)}
                    >
                      Retenir
                    </button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-stone-800">{comment}</p>
              </section>
            ))}
          </div>

          <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            <p className="text-xs uppercase tracking-[0.22em] text-amber-700">Points d&apos;attention</p>
            <div className="mt-3 grid gap-2">
              {suggestion.cautions.map((item) => (
                <p
                  key={item}
                  className="rounded-2xl border border-amber-200/70 bg-white/70 px-4 py-3"
                >
                  {item}
                </p>
              ))}
            </div>
          </section>
        </>
      ) : (
        <EmptyState message="Clique sur `Proposer un commentaire` pour transformer ce signal brut en reaction vraiment actionnable." />
      )}
    </div>
  );
}
function DraftCard({
  draft,
  isPending,
  onAction,
}: {
  draft: Draft;
  isPending: boolean;
  onAction: (form: HTMLFormElement, action: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  function copyPost() {
    const text = [
      draft.content,
      draft.cta ? `\n${draft.cta}` : "",
      draft.hashtags.length > 0 ? `\n${draft.hashtags.join(" ")}` : "",
    ]
      .join("")
      .trim();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <form
      className="grid gap-0 overflow-hidden rounded-[1.7rem] border border-black/8 bg-white shadow-[0_10px_35px_rgba(18,18,18,0.05)]"
      onSubmit={(event) => {
        event.preventDefault();
        onAction(event.currentTarget, "save");
      }}
    >
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/6 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-stone-400">{draft.objective}</p>
          <p className="mt-0.5 text-base font-semibold tracking-[-0.02em] text-stone-950">{draft.title}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
          draft.status === "published" ? "bg-emerald-100 text-emerald-700"
          : draft.status === "approved" ? "bg-sky-100 text-sky-700"
          : draft.status === "scheduled" ? "bg-violet-100 text-violet-700"
          : draft.status === "failed" ? "bg-red-100 text-red-700"
          : "bg-stone-100 text-stone-600"
        }`}>
          {draftStatusCopy[draft.status]}
        </span>
      </div>

      {/* ── Post preview (lecture) ── */}
      <div className="px-5 py-5">
        <p className="whitespace-pre-wrap text-sm leading-7 text-stone-800">{draft.content}</p>
        {draft.cta ? (
          <p className="mt-3 text-sm font-medium text-stone-700">{draft.cta}</p>
        ) : null}
        {draft.hashtags.length > 0 ? (
          <p className="mt-2 text-sm text-stone-400">{draft.hashtags.join(" ")}</p>
        ) : null}
      </div>

      {/* ── Actions principales ── */}
      <div className="flex flex-wrap items-center gap-3 border-t border-black/6 px-5 py-4">
        {/* Copier = action principale */}
        <button
          type="button"
          onClick={copyPost}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            copied
              ? "bg-emerald-100 text-emerald-700"
              : "bg-accent text-white hover:bg-accent-strong"
          }`}
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              Copié !
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              Copier le post
            </>
          )}
        </button>

        <button
          type="button"
          className={secondaryButtonClassName}
          disabled={isPending}
          onClick={(event) => {
            const form = event.currentTarget.form;
            if (form) onAction(form, "approve");
          }}
        >
          Approuver
        </button>

        <button
          type="button"
          onClick={() => setShowEdit((v) => !v)}
          className="ml-auto rounded-full border border-black/10 px-3 py-2 text-xs font-medium text-stone-500 transition hover:bg-stone-50"
        >
          {showEdit ? "Masquer l'édition" : "Modifier"}
        </button>
      </div>

      {/* ── Édition (masquée par défaut) ── */}
      {showEdit ? (
        <div className="grid gap-4 border-t border-black/6 bg-stone-50/60 px-5 py-5">
          <Field label="Angle">
            <input name="angle" defaultValue={draft.angle} className={inputClassName} />
          </Field>
          <Field label="Hook">
            <textarea name="hook" defaultValue={draft.hook} rows={2} className={textareaClassName} />
          </Field>
          <Field label="Post">
            <textarea name="content" defaultValue={draft.content} rows={10} className={textareaClassName} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CTA">
              <input name="cta" defaultValue={draft.cta} className={inputClassName} />
            </Field>
            <Field label="Hashtags">
              <input name="hashtags" defaultValue={draft.hashtags.join(", ")} className={inputClassName} />
            </Field>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <Field label="Programmer pour">
                <input type="datetime-local" name="publishAt" defaultValue={toDateTimeLocal(draft.publishAt)} className={inputClassName} />
              </Field>
            </div>
            <button type="submit" className={secondaryButtonClassName} disabled={isPending}>
              Sauver
            </button>
            <button
              type="button"
              className={secondaryButtonClassName}
              disabled={isPending}
              onClick={(event) => {
                const form = event.currentTarget.form;
                if (form) onAction(form, "schedule");
              }}
            >
              Programmer
            </button>
          </div>

          {/* LinkedIn optionnel */}
          <div className="rounded-2xl border border-black/6 bg-white p-4">
            <p className="mb-3 text-xs font-medium text-stone-400">Publication directe (optionnel — nécessite LinkedIn connecté)</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={secondaryButtonClassName}
                disabled={isPending}
                onClick={(event) => {
                  const form = event.currentTarget.form;
                  if (form) onAction(form, "publishNow");
                }}
              >
                Publier sur LinkedIn
              </button>
              {draft.status === "published" && draft.remotePostId ? (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                  disabled={isPending}
                  onClick={(event) => {
                    const form = event.currentTarget.form;
                    if (form) onAction(form, "deleteRemote");
                  }}
                >
                  Supprimer le post LinkedIn
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 rounded-3xl border border-black/6 bg-stone-50 p-4 text-sm leading-6 text-stone-600">
        <StatusInfo label="Rationale" value={draft.rationale} />
        {draft.truthAnchors.length > 0 ? (
          <StatusInfo label="Ancrages factuels" value={draft.truthAnchors.join(" | ")} />
        ) : null}
        <StatusInfo label="Cree" value={formatDate(draft.createdAt)} />
        {draft.publishAt ? (
          <StatusInfo label="Publication planifiee" value={formatDate(draft.publishAt)} />
        ) : null}
        {draft.publishedAt ? (
          <StatusInfo label="Publie le" value={formatDate(draft.publishedAt)} />
        ) : null}
        {draft.remotePostId ? (
          <StatusInfo label="Post ID" value={draft.remotePostId} />
        ) : null}
        {draft.lastError ? (
          <p className="font-medium text-red-700">Erreur: {draft.lastError}</p>
        ) : null}
      </div>
    </form>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-stone-800">
      <span>{label}</span>
      {children}
    </label>
  );
}
function SignalInsightCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section className="rounded-[1.7rem] border border-black/8 bg-stone-50 p-5 text-sm leading-6 text-stone-700">
      <p className="text-xs uppercase tracking-[0.22em] text-stone-500">{eyebrow}</p>
      <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-stone-950">{title}</h3>
      <p className="mt-2">{body}</p>
    </section>
  );
}
function StatusInfo({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-medium text-stone-900">{label}:</span> {value}
    </p>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[1.6rem] border border-dashed border-black/12 bg-stone-50 p-6 text-sm leading-6 text-stone-600">
      {message}
    </div>
  );
}

function getSignalAuthorInitials(authorName: string) {
  const parts = authorName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "?";
  }

  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function commentCardTitle(index: number) {
  if (index === 0) {
    return "Option 1 · Sobre";
  }

  if (index === 1) {
    return "Option 2 · Conversation";
  }

  return "Option 3 · Plus tranchee";
}
function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const formatter = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Paris",
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("day")} ${getPart("month")} ${getPart("year")} a ${getPart("hour")}:${getPart("minute")}`;
}

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15";
const textareaClassName = `${inputClassName} min-h-[120px] resize-y`;
const primaryButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-strong hover:shadow active:scale-95 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-stone-900 shadow-sm transition hover:border-black/20 hover:bg-stone-50 hover:shadow active:scale-95 disabled:cursor-not-allowed disabled:opacity-60";
