import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nos offres | LeadMachine",
  description: "Choisissez l'offre LeadMachine adaptée à votre cabinet.",
};

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="text-sm font-semibold tracking-[-0.02em] text-stone-900">
          LeadMachine
        </Link>
        <Link
          href="/workspace"
          className="text-sm text-stone-500 hover:text-stone-800 transition"
        >
          Mon workspace
        </Link>
      </nav>

      {/* Header */}
      <section className="mx-auto max-w-3xl px-5 pb-12 pt-12 text-center sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
          Tarifs
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-stone-950 sm:text-5xl">
          Choisissez votre offre
        </h1>
        <p className="mt-5 text-lg leading-8 text-stone-600">
          Testez gratuitement avec 5 posts. Passez à l'offre qui correspond à votre cabinet quand vous êtes prêt.
        </p>
      </section>

      {/* Grille des offres */}
      <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        <div className="grid gap-6 sm:grid-cols-3">

          {/* Starter */}
          <PricingCard
            name="Starter"
            price="Gratuit"
            period=""
            description="Pour découvrir LeadMachine sans engagement."
            features={[
              "5 posts LinkedIn inclus",
              "Génération IA dans votre voix",
              "Tableau de bord complet",
              "Connexion LinkedIn",
            ]}
            cta="Votre offre actuelle"
            ctaDisabled
            accent={false}
          />

          {/* Pro */}
          <PricingCard
            name="Pro"
            price="À définir"
            period="/mois"
            description="Pour un associé ou un expert qui publie en continu."
            features={[
              "Posts illimités",
              "Génération IA avancée",
              "Détection de signaux quotidiens",
              "Publication automatique programmée",
              "1 profil LinkedIn",
            ]}
            cta="Bientôt disponible"
            ctaDisabled
            accent={true}
            badge="Recommandé"
          />

          {/* Cabinet */}
          <PricingCard
            name="Cabinet"
            price="À définir"
            period="/mois"
            description="Pour les cabinets avec plusieurs associés actifs sur LinkedIn."
            features={[
              "Tout l'offre Pro",
              "Jusqu'à 5 profils LinkedIn",
              "Tableau de bord partagé",
              "Support prioritaire",
            ]}
            cta="Bientôt disponible"
            ctaDisabled
            accent={false}
          />

        </div>

        <p className="mt-10 text-center text-sm text-stone-500">
          Les tarifs seront annoncés à la fin de la période de test.{" "}
          <a href="mailto:brice.faradji@gmail.com" className="underline hover:text-stone-800">
            Contactez-nous
          </a>{" "}
          pour être notifié en avant-première.
        </p>
      </section>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  ctaDisabled,
  accent,
  badge,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  ctaDisabled: boolean;
  accent: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-4xl border p-7 ${
        accent
          ? "border-accent/30 bg-accent-soft"
          : "border-black/8 bg-white/80"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
          {badge}
        </span>
      )}

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{name}</p>

      <div className="mt-3 flex items-end gap-1">
        <span className="text-3xl font-semibold tracking-[-0.05em] text-stone-950">{price}</span>
        {period && <span className="mb-0.5 text-sm text-stone-500">{period}</span>}
      </div>

      <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>

      <ul className="mt-5 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-stone-700">
            <svg className="mt-0.5 shrink-0 text-accent" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <button
        disabled={ctaDisabled}
        className={`mt-7 w-full rounded-full px-5 py-2.5 text-sm font-semibold transition ${
          accent && !ctaDisabled
            ? "bg-accent text-white hover:bg-accent-strong"
            : "bg-stone-100 text-stone-500 cursor-not-allowed"
        }`}
      >
        {cta}
      </button>
    </div>
  );
}
