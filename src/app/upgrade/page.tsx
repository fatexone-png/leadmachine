"use client";

import Link from "next/link";
import { useState } from "react";

export default function UpgradePage() {
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
    <div className="min-h-screen bg-background text-foreground">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="text-sm font-bold tracking-[-0.02em] text-stone-900">PostPilote</Link>
        <Link href="/workspace" className="text-sm text-stone-500 transition hover:text-stone-800">Mon workspace</Link>
      </nav>

      <section className="mx-auto max-w-2xl px-5 pb-10 pt-12 text-center sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Tarifs</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-stone-950 sm:text-5xl">
          Simple. Deux offres.
        </h1>
        <p className="mt-5 text-lg leading-8 text-stone-600">
          Testez gratuitement. Passez à Pro quand vous êtes convaincu.
        </p>
      </section>

      <section className="mx-auto max-w-2xl px-5 pb-20 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-2">

          {/* Starter */}
          <div className="flex flex-col rounded-4xl border border-black/8 bg-white/80 p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Starter</p>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-4xl font-semibold tracking-[-0.05em] text-stone-950">Gratuit</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-500">Pour découvrir sans engagement.</p>
            <ul className="mt-6 flex-1 space-y-3">
              {[
                "5 posts LinkedIn publiés",
                "Génération IA dans votre voix",
                "Analyse de votre site web",
                "Tableau de bord complet",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-stone-600">
                  <Check />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-7 w-full rounded-full bg-stone-100 px-5 py-2.5 text-center text-sm font-semibold text-stone-400">
              Votre offre actuelle
            </div>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-4xl border border-accent/30 bg-accent-soft p-7">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-white">
              Recommandé
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Pro</p>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-4xl font-semibold tracking-[-0.05em] text-stone-950">39€</span>
              <span className="mb-1 text-sm text-stone-500">/mois</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-600">Pour publier en continu, sans effort.</p>
            <ul className="mt-6 flex-1 space-y-3">
              {[
                "Posts LinkedIn illimités",
                "Publication automatique programmée",
                "Sources d'inspiration multiples",
                "Détection de sujets quotidiens",
                "IA pleine puissance",
                "Support prioritaire",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-stone-700">
                  <Check accent />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="mt-7 w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
            >
              {loading ? "Redirection…" : "Passer à Pro — 39€/mois"}
            </button>
            <p className="mt-3 text-center text-xs text-stone-500">Sans engagement · Résiliation en 1 clic</p>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-stone-500">
          Une question ?{" "}
          <a href="mailto:brice.faradji@gmail.com" className="underline hover:text-stone-800">
            Contactez-nous
          </a>
        </p>
      </section>
    </div>
  );
}

function Check({ accent = false }: { accent?: boolean }) {
  return (
    <svg className={`mt-0.5 shrink-0 ${accent ? "text-accent" : "text-stone-400"}`} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
