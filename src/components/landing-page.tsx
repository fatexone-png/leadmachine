import Link from "next/link";

interface LandingPageProps {
  linkedInConfigured: boolean;
  error?: string | null;
}

export function LandingPage({ linkedInConfigured, error }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ── */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <span className="text-sm font-bold tracking-[-0.02em] text-stone-900">PostPilote</span>
        <Link href="/upgrade" className="text-sm text-stone-500 transition hover:text-stone-800">
          Tarifs
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-5xl px-5 pb-14 pt-10 sm:px-8 sm:pt-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-4 py-1.5 text-xs font-semibold text-stone-700">
          IA · LinkedIn · Cabinets professionnels
        </div>
        <h1 className="mt-5 max-w-3xl text-[2.6rem] font-semibold leading-[1.04] tracking-[-0.05em] text-stone-950 sm:text-6xl">
          Votre cabinet publie sur LinkedIn.<br />
          <span className="text-accent">Sans y passer du temps.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
          PostPilote analyse votre site web, capte votre plume, puis rédige et publie des posts LinkedIn
          dans votre voix — chaque semaine, en automatique. Vous validez en 30 secondes.
        </p>

        {error && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error === "linkedin-state"
              ? "Le handshake OAuth a échoué. Réessayez."
              : `Erreur : ${error}`}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-4">
          {linkedInConfigured ? (
            <a
              href="/api/linkedin/connect"
              className="inline-flex items-center gap-3 rounded-full bg-[#0A66C2] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#004182]"
            >
              <LinkedInIcon />
              Démarrer avec LinkedIn
            </a>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
              Configuration manquante — contactez l'administrateur.
            </div>
          )}
          <span className="text-sm text-stone-500">5 posts offerts · aucune carte bancaire</span>
        </div>
      </section>

      {/* ── Pour qui ── */}
      <section className="mx-auto max-w-5xl px-5 pb-14 sm:px-8">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
          Conçu pour les cabinets et experts
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Audience
            icon="⚖️"
            title="Avocats & juristes"
            body="Publiez des analyses juridiques accessibles. Attirez des clients avant même le premier contact."
          />
          <Audience
            icon="📊"
            title="Experts-comptables"
            body="Partagez votre expertise fiscale et sociale. Devenez la référence sur votre bassin d'activité."
          />
          <Audience
            icon="🎯"
            title="Consultants & coachs"
            body="Montrez votre méthode, vos résultats, vos convictions. Votre LinkedIn travaille pour vous."
          />
        </div>
      </section>

      {/* ── Comment ça marche ── */}
      <section className="mx-auto max-w-5xl px-5 pb-14 sm:px-8">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            Comment ça marche
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-stone-950 sm:text-4xl">
            Quatre étapes. Vous n'en gérez vraiment qu'une.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Step
            number="1"
            title="Connectez LinkedIn"
            body="Un clic, une autorisation OAuth sécurisée. Vos posts publient en votre nom uniquement quand vous validez."
            accent={false}
          />
          <Step
            number="2"
            title="L'IA scrute votre site"
            body="PostPilote visite votre site, analyse votre plume, votre positionnement et vos messages clés."
            accent={true}
          />
          <Step
            number="3"
            title="Des posts dans votre voix"
            body="Chaque semaine, l'IA génère des posts LinkedIn cohérents avec votre style éditorial et votre expertise."
            accent={false}
          />
          <Step
            number="4"
            title="Vous validez en 30s"
            body="Lisez, ajustez si besoin, approuvez. Le post part au bon moment. Votre présence LinkedIn est régulière."
            accent={false}
          />
        </div>
      </section>

      {/* ── Proof dark block ── */}
      <section className="mx-auto max-w-5xl px-5 pb-14 sm:px-8">
        <div className="rounded-4xl border border-black/8 bg-stone-950 px-6 py-10 text-stone-50 sm:px-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                Pourquoi LinkedIn en 2026
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Vos clients choisissent l'expert<br />qu'ils ont déjà lu.
              </h2>
              <p className="mt-5 text-base leading-8 text-stone-300">
                Avant de signer un mandat ou de choisir un prestataire, les dirigeants cherchent
                une preuve d'expertise. Une présence LinkedIn régulière crée cette preuve —
                avant même le premier rendez-vous.
              </p>
            </div>
            <div className="grid gap-3">
              <Proof text="Visibilité ciblée auprès de vos prospects professionnels" />
              <Proof text="Des posts qui démontrent votre expertise, pas votre brochure" />
              <Proof text="Des contacts entrants qui connaissent déjà votre positionnement" />
              <Proof text="Une présence continue, même les semaines les plus chargées" />
              <Proof text="Chaque utilisateur publie sous son propre compte LinkedIn" />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        <div className="rounded-4xl border border-accent/25 bg-accent-soft px-6 py-12 text-center sm:px-10">
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-stone-950 sm:text-4xl">
            Commencez gratuitement.
          </h2>
          <p className="mt-4 text-base leading-8 text-stone-700">
            5 posts offerts. Pas de carte bancaire. Connectez LinkedIn et l'IA fait le reste.
          </p>
          <div className="mt-6 flex justify-center">
            {linkedInConfigured && (
              <a
                href="/api/linkedin/connect"
                className="inline-flex items-center gap-3 rounded-full bg-[#0A66C2] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#004182]"
              >
                <LinkedInIcon size={18} />
                Démarrer avec LinkedIn
              </a>
            )}
          </div>
          <p className="mt-4 text-sm text-stone-500">
            Chaque professionnel dispose de son propre espace isolé et sécurisé.
          </p>
        </div>
      </section>
    </div>
  );
}

function LinkedInIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function Audience({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-[1.75rem] border border-black/8 bg-white/80 p-6">
      <span className="text-2xl">{icon}</span>
      <h3 className="mt-3 text-base font-semibold tracking-[-0.02em] text-stone-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
    </div>
  );
}

function Step({
  number,
  title,
  body,
  accent,
}: {
  number: string;
  title: string;
  body: string;
  accent: boolean;
}) {
  return (
    <div className={`rounded-[1.75rem] border p-6 ${accent ? "border-accent/30 bg-accent-soft" : "border-black/8 bg-white/80"}`}>
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${accent ? "bg-accent text-white" : "bg-stone-100 text-stone-600"}`}>
        {number}
      </span>
      <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] text-stone-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
    </div>
  );
}

function Proof({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[1.2rem] border border-white/8 bg-white/6 px-4 py-3">
      <svg className="mt-0.5 shrink-0 text-accent" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <span className="text-sm leading-6 text-stone-200">{text}</span>
    </div>
  );
}
