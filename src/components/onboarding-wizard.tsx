"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface OnboardingWizardProps {
  linkedInConnected: boolean;
  hasWebsiteAnalyzed: boolean;
  userName: string | null;
}

export function OnboardingWizard({ linkedInConnected, hasWebsiteAnalyzed, userName }: OnboardingWizardProps) {
  const router = useRouter();
  const initialStep = !linkedInConnected ? 0 : !hasWebsiteAnalyzed ? 1 : 2;
  const [step, setStep] = useState(initialStep);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<{ businessContext?: string; toneKeywords?: string[] } | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  async function handleAnalyzeSite(e: FormEvent) {
    e.preventDefault();
    if (!websiteUrl.trim()) return;
    setAnalyzing(true);
    setAnalyzeError(null);

    const res = await fetch("/api/profile/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: websiteUrl.trim(), label: "Mon site", isMainWebsite: true }),
    });
    const data = (await res.json()) as { error?: string; businessContext?: string; toneKeywords?: string[] };
    setAnalyzing(false);

    if (!res.ok) {
      setAnalyzeError(data.error || "Impossible d'analyser ce site.");
      return;
    }
    setAnalyzeResult(data);
    router.refresh();
    setStep(2);
  }

  async function handleComplete() {
    setCompleting(true);
    await fetch("/api/onboarding/complete", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-12 animate-fade-in">
      <div className="w-full max-w-lg">

        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                i < step ? "bg-stone-950 text-white" :
                i === step ? "bg-accent text-white" :
                "bg-stone-100 text-stone-400"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              {i < 3 && <div className={`h-0.5 flex-1 transition-all ${i < step ? "bg-stone-950" : "bg-stone-100"}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Connect LinkedIn */}
        {step === 0 && (
          <div className="animate-fade-in">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Étape 1 sur 4</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
              Connectez votre LinkedIn
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              LeadMachine a besoin d'accéder à votre compte LinkedIn pour publier en votre nom.
              Vous garderez le contrôle total — chaque post est soumis à votre validation avant publication.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <a
                href="/api/linkedin/connect"
                className="flex items-center justify-center gap-3 rounded-full bg-[#0A66C2] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0958a8]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                Connecter LinkedIn
              </a>
              <p className="text-center text-xs text-stone-400">
                Permissions demandées : lire votre profil et publier en votre nom
              </p>
            </div>
          </div>
        )}

        {/* Step 1: Analyze website */}
        {step === 1 && (
          <div className="animate-fade-in">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Étape 2 sur 4</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
              {userName ? `Bienvenue, ${userName.split(" ")[0]} 👋` : "Analysons votre activité"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              Donnez l'URL de votre site ou de votre page cabinet. L'IA va analyser votre domaine
              d'expertise, vos clients cibles et votre style — pour que chaque post soit pertinent
              avec votre activité réelle.
            </p>
            <form onSubmit={handleAnalyzeSite} className="mt-8 flex flex-col gap-3">
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://votrecabinet.fr"
                required
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-900 placeholder-stone-400 outline-none focus:ring-2 focus:ring-accent/20"
              />
              {analyzeError && (
                <p className="text-xs text-red-600">{analyzeError}</p>
              )}
              <button
                type="submit"
                disabled={analyzing || !websiteUrl.trim()}
                className="flex items-center justify-center gap-2 rounded-full bg-stone-950 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-40"
              >
                {analyzing ? (
                  <>
                    <svg className="animate-spin-smooth shrink-0" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Analyse en cours…
                  </>
                ) : "Analyser mon site"}
              </button>
              <button type="button" onClick={() => setStep(2)} className="text-center text-xs text-stone-400 underline hover:text-stone-700">
                Je n'ai pas de site — passer cette étape
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Review profile */}
        {step === 2 && (
          <div className="animate-fade-in">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Étape 3 sur 4</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
              Votre profil est prêt
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              L'IA a capturé votre contexte métier. Elle s'en servira pour générer des posts ancrés
              dans votre activité réelle — pas du contenu générique.
            </p>

            {analyzeResult && (
              <div className="mt-6 rounded-3xl border border-black/8 bg-stone-50 p-5 text-sm leading-7 text-stone-700">
                {analyzeResult.toneKeywords && analyzeResult.toneKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {analyzeResult.toneKeywords.map((kw) => (
                      <span key={kw} className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-stone-700">{kw}</span>
                    ))}
                  </div>
                )}
                {analyzeResult.businessContext && (
                  <p className="mt-3 text-xs leading-6 text-stone-600">{analyzeResult.businessContext}</p>
                )}
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-6 text-emerald-900">
              Vous pourrez affiner ce profil à tout moment dans l'onglet <strong>Profil</strong>.
            </div>

            <button
              onClick={() => setStep(3)}
              className="mt-6 w-full rounded-full bg-stone-950 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Continuer
            </button>
          </div>
        )}

        {/* Step 3: Activate & finish */}
        {step === 3 && (
          <div className="animate-fade-in">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Étape 4 sur 4</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
              Vous êtes prêt(e)
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              LeadMachine est configuré. Voici comment il va travailler pour vous :
            </p>

            <div className="mt-6 grid gap-3">
              {[
                { icon: "📡", title: "Veille automatique", desc: "Chaque matin, l'IA surveille l'actualité de votre secteur et sélectionne les sujets pertinents." },
                { icon: "✍️", title: "Post rédigé dans votre voix", desc: "Un brouillon est préparé, ancré dans votre expertise, prêt à être validé." },
                { icon: "📬", title: "Email de validation", desc: "Vous recevez un email avec le post. Un clic pour approuver, un clic pour refuser — c'est tout." },
                { icon: "🚀", title: "Publication automatique", desc: "Une fois approuvé, le post est publié à l'heure que vous choisissez." },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex gap-3 rounded-2xl border border-black/8 bg-white p-4">
                  <span className="shrink-0 text-xl">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-stone-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleComplete}
              disabled={completing}
              className="mt-6 w-full rounded-full bg-accent py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
            >
              {completing ? "Initialisation…" : "Accéder à mon espace de travail"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
