import type { AppData } from "@/lib/types";

type SearchParams = Record<string, string | string[] | undefined>;

export function getPublicAppData(data: AppData): AppData {
  return {
    ...data,
    linkedin: {
      ...data.linkedin,
      accessToken: null,
      accessTokenExpiresAt: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
    },
  };
}

export function buildDashboardNotices(searchParams: SearchParams) {
  const notices: string[] = [];
  const linkedInStatus = valueOf(searchParams.linkedin);
  const error = valueOf(searchParams.error);

  if (linkedInStatus === "connected") {
    notices.push("LinkedIn connecte. Tu peux maintenant valider, programmer et publier tes posts.");
  }

  if (error === "linkedin-config") {
    notices.push(
      "Configuration LinkedIn incomplete. Renseigne les variables LINKEDIN_* dans .env.local."
    );
  } else if (error === "linkedin-state") {
    notices.push("Le handshake OAuth LinkedIn a echoue. Relance la connexion.");
  } else if (error) {
    notices.push(`Retour LinkedIn: ${error}`);
  }

  return notices;
}

function valueOf(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
