import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { LandingPage } from "@/components/landing-page";
import { linkedinIsConfigured } from "@/lib/linkedin";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PostPilote | Publiez sur LinkedIn sans passer votre temps à écrire",
  description:
    "PostPilote capte des signaux, propose des commentaires et pousse les bons sujets vers la publication LinkedIn.",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: PageProps) {
  const session = await getSession();

  // Utilisateur déjà connecté → redirection vers le workspace
  if (session) {
    redirect("/workspace");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const error = typeof resolvedParams.error === "string" ? resolvedParams.error : null;

  return (
    <LandingPage
      linkedInConfigured={linkedinIsConfigured()}
      error={error}
    />
  );
}
