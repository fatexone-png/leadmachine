import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { Dashboard } from "@/components/dashboard";
import { buildDashboardNotices, getPublicAppData } from "@/lib/app-view";
import { linkedinIsConfigured } from "@/lib/linkedin";
import { getSession } from "@/lib/session";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspace | LeadMachine",
  description:
    "Le cockpit LeadMachine pour qualifier des signaux, valider des commentaires et piloter la publication.",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkspacePage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const data = getPublicAppData(await readStore(session.memberId));
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const notices = buildDashboardNotices(resolvedSearchParams);

  return (
    <Dashboard
      data={data}
      notices={notices}
      environment={{
        claudeConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
        linkedInConfigured: linkedinIsConfigured(),
        cronConfigured: Boolean(process.env.CRON_SECRET),
        appUrl: process.env.APP_URL || "http://localhost:3000",
      }}
    />
  );
}
