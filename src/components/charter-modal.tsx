"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function CharterModal({ name }: { name: string | null }) {
  const router = useRouter();
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setScrolledToBottom(true);
    }
  }

  async function handleAccept() {
    if (!checked || loading) return;
    setLoading(true);
    await fetch("/api/charter/accept", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm px-4">
      <div className="flex w-full max-w-2xl flex-col rounded-4xl border border-black/8 bg-white shadow-2xl" style={{ maxHeight: "90vh" }}>

        {/* Header */}
        <div className="shrink-0 border-b border-black/8 px-8 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Avant de commencer</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
            Charte d'utilisation de LeadMachine
          </h2>
          {name && (
            <p className="mt-1 text-sm text-stone-500">
              Bonjour {name} — veuillez lire et accepter cette charte avant d'accéder à votre espace.
            </p>
          )}
        </div>

        {/* Scrollable body */}
        <div
          ref={bodyRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-8 py-6 text-sm leading-7 text-stone-700"
        >
          <Section title="1. Responsabilité éditoriale">
            <p>
              LeadMachine est un outil d'assistance à la création de contenu. Toute publication effectuée
              via la plateforme est placée sous la seule et entière responsabilité de l'utilisateur.
              L'intelligence artificielle propose — l'utilisateur décide. Aucun post ne peut être publié
              sans validation explicite de votre part.
            </p>
          </Section>

          <Section title="2. Conformité déontologique">
            <p>
              L'utilisation de LeadMachine ne vous exonère pas du respect des règles déontologiques
              propres à votre profession :
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Avocats</strong> — Règlement Intérieur National (RIN), règles sur la publicité, le démarchage et la communication électronique.</li>
              <li><strong>Experts-comptables</strong> — Code de déontologie de l'Ordre des experts-comptables (OEC), règles sur la communication professionnelle.</li>
              <li><strong>Autres professions réglementées</strong> — Toute règle applicable à votre ordre ou association professionnelle.</li>
            </ul>
            <p className="mt-3">
              Il vous appartient de vérifier que chaque contenu publié est conforme à votre déontologie
              avant d'approuver sa publication.
            </p>
          </Section>

          <Section title="3. Secret professionnel et données confidentielles">
            <p>
              Ne communiquez jamais à LeadMachine des informations protégées par le secret professionnel :
              noms de clients, dossiers en cours, stratégies défense, données financières confidentielles,
              ou toute information susceptible d'identifier un tiers sans son consentement.
            </p>
            <p className="mt-3">
              LeadMachine n'est pas conçu pour traiter des données à caractère personnel au sens du RGPD
              dans le cadre de dossiers clients. Toute information renseignée dans l'application doit être
              d'ordre éditorial et non confidentiel.
            </p>
          </Section>

          <Section title="4. Limites de l'intelligence artificielle">
            <p>
              Les contenus générés par l'IA peuvent contenir des inexactitudes, des raccourcis ou des
              formulations inappropriées. Il vous incombe de relire et vérifier chaque brouillon avant
              validation. LeadMachine ne garantit pas l'exactitude juridique, factuelle ou déontologique
              des contenus produits.
            </p>
          </Section>

          <Section title="5. Engagement de validation systématique">
            <p>
              En activant la publication automatique, vous vous engagez à :
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Répondre aux emails de validation dans les délais impartis.</li>
              <li>N'approuver que des contenus que vous avez lus et dont vous assumez la responsabilité.</li>
              <li>Désactiver la publication automatique en cas d'indisponibilité prolongée.</li>
            </ul>
          </Section>

          <Section title="6. Données et vie privée">
            <p>
              Vos données (profil, posts, sources) sont stockées de façon sécurisée et ne sont pas
              partagées avec des tiers à des fins commerciales. Elles sont utilisées exclusivement pour
              faire fonctionner le service. Vous pouvez demander leur suppression à tout moment.
            </p>
          </Section>

          <Section title="7. Modification de la charte">
            <p>
              Cette charte peut être mise à jour. En cas de modification substantielle, vous en serez
              informé et une nouvelle acceptation vous sera demandée.
            </p>
          </Section>

          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
            <strong>En résumé :</strong> LeadMachine travaille pour vous, mais vous restez le seul
            responsable de ce qui est publié en votre nom. L'IA propose, vous décidez — toujours.
          </div>

          {!scrolledToBottom && (
            <p className="mt-6 text-center text-xs text-stone-400">
              ↓ Faites défiler jusqu'en bas pour continuer
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-black/8 px-8 py-5">
          <label className={`flex items-start gap-3 cursor-pointer ${!scrolledToBottom ? "opacity-40 pointer-events-none" : ""}`}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 accent-stone-900"
            />
            <span className="text-sm leading-6 text-stone-700">
              J'ai lu et j'accepte cette charte. Je comprends que je suis seul(e) responsable de chaque
              publication effectuée via LeadMachine.
            </span>
          </label>
          <button
            onClick={handleAccept}
            disabled={!checked || !scrolledToBottom || loading}
            className="mt-4 w-full rounded-full bg-stone-950 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-30"
          >
            {loading ? "Enregistrement…" : "Accepter et accéder à mon espace"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 text-sm font-semibold text-stone-900">{title}</h3>
      {children}
    </div>
  );
}
