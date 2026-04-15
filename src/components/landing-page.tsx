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
        <span className="text-sm font-semibold tracking-[-0.02em] text-stone-900">
          LeadMachine
        </span>
        <Link
          href="/upgrade"
          className="text-sm text-stone-500 hover:text-stone-800 transition"
        >
          Tarifs
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-5xl px-5 pb-16 pt-10 sm:px-8 sm:pt-20">
        <h1 className="max-w-3xl text-[2.8rem] font-semibold leading-[1.04] tracking-[-0.05em] text-stone-950 sm:text-6xl">
          Publiez sur LinkedIn.<br />
          <span className="text-accent">Sans passer votre temps à écrire.</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">
          LeadMachine surveille l'actualité de votre secteur, rédige des contenus dans votre voix,
          et publie sur LinkedIn quand vous validez. Vous gardez le contrôle. L'IA fait le reste.
        </p>

        {/* Message d'erreur */}
        {error && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error === "linkedin-state"
              ? "Le handshake OAuth LinkedIn a échoué. Réessayez."
              : `Erreur LinkedIn : ${error}`}
          </div>
        )}

        <div className="mt-8">
          {linkedInConfigured ? (
            <a
              href="/api/linkedin/connect"
              className="inline-flex items-center gap-3 rounded-full bg-[#0A66C2] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#004182]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              Se connecter avec LinkedIn
            </a>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
              Configuration LinkedIn manquante — contactez l'administrateur.
            </div>
          )}
        </div>

        <p className="mt-4 text-sm text-stone-500">
          5 posts offerts — aucune carte bancaire requise.
        </p>
      </section>

      {/* ── Comment ça marche ── */}
      <section id="comment-ca-marche" className="mx-auto max-w-5xl px-5 pb-16 sm:px-8">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            Comment ça marche
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-stone-950 sm:text-4xl">
            Trois étapes. Vous n'en gérez vraiment qu'une.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Step
            number="1"
            title="Vous connectez LinkedIn"
            body="Un clic, une autorisation. LeadMachine accède à votre profil pour publier en votre nom quand vous validez."
            accent={false}
          />
          <Step
            number="2"
            title="L'IA rédige dans votre voix"
            body="Chaque jour, LeadMachine analyse l'actualité de votre secteur et rédige des posts prêts à valider."
            accent={true}
          />
          <Step
            number="3"
            title="Vous validez en 30 secondes"
            body="Lisez, ajustez si besoin, approuvez. Le post part au bon moment. Votre présence LinkedIn est régulière, sans effort."
            accent={false}
          />
        </div>
      </section>

      {/* ── Pourquoi LinkedIn ── */}
      <section className="mx-auto max-w-5xl px-5 pb-16 sm:px-8">
        <div className="rounded-[2rem] border border-black/8 bg-stone-950 px-6 py-10 text-stone-50 sm:px-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                Pourquoi LinkedIn
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                Vos clients cherchent un expert.<br />
                Pas une brochure.
              </h2>
              <p className="mt-5 text-base leading-8 text-stone-300">
                Les dirigeants qui choisissent un cabinet, un consultant, un expert — ils le font
                après l'avoir lu. Une présence LinkedIn régulière crée de la confiance avant
                même le premier rendez-vous.
              </p>
            </div>
            <div className="grid gap-3">
              <Proof text="Plus de visibilité auprès de vos cibles professionnelles" />
              <Proof text="Des prises de parole qui démontrent votre expertise" />
              <Proof text="Des contacts entrants qui connaissent déjà votre positionnement" />
              <Proof text="Une présence continue, même les semaines chargées" />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        <div className="rounded-[2rem] border border-accent/25 bg-accent-soft px-6 py-10 text-center sm:px-10">
          <h2 className="text-3xl font-semibold tracking-[-0.05em] text-stone-950 sm:text-4xl">
            Commencez gratuitement.
          </h2>
          <p className="mt-4 text-base leading-8 text-stone-700">
            5 posts offerts. Pas de carte bancaire. Juste LinkedIn.
          </p>
          <div className="mt-6 flex justify-center">
            {linkedInConfigured && (
              <a
                href="/api/linkedin/connect"
                className="inline-flex items-center gap-3 rounded-full bg-[#0A66C2] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#004182]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                Se connecter avec LinkedIn
              </a>
            )}
          </div>
        </div>
      </section>
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
    <div
      className={`rounded-[1.75rem] border p-6 ${
        accent
          ? "border-accent/30 bg-accent-soft"
          : "border-black/8 bg-white/80"
      }`}
    >
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
          accent ? "bg-accent text-white" : "bg-stone-100 text-stone-600"
        }`}
      >
        {number}
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-stone-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
    </div>
  );
}

function Proof({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[1.2rem] border border-white/8 bg-white/6 px-4 py-3">
      <svg className="mt-0.5 shrink-0 text-accent" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      <span className="text-sm leading-6 text-stone-200">{text}</span>
    </div>
  );
}
