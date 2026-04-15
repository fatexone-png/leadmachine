import type { Draft, LinkedInConnection } from "@/lib/types";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const LINKEDIN_POSTS_URL = "https://api.linkedin.com/rest/posts";
const LINKEDIN_VERSION = process.env.LINKEDIN_API_VERSION || "202603";
const REQUIRED_SCOPES = ["openid", "profile", "email", "w_member_social"];

export function linkedinIsConfigured(): boolean {
  return Boolean(
    process.env.LINKEDIN_CLIENT_ID &&
      process.env.LINKEDIN_CLIENT_SECRET &&
      process.env.LINKEDIN_REDIRECT_URI
  );
}

export function getLinkedInAuthorizationUrl(state: string): string {
  if (!linkedinIsConfigured()) {
    throw new Error("LinkedIn environment variables are missing.");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: (process.env.LINKEDIN_CLIENT_ID as string).trim(),
    redirect_uri: (process.env.LINKEDIN_REDIRECT_URI as string).trim(),
    state,
    scope: REQUIRED_SCOPES.join(" "),
  });

  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForConnection(
  code: string
): Promise<LinkedInConnection> {
  const clientId = (process.env.LINKEDIN_CLIENT_ID || "").trim();
  const clientSecret = (process.env.LINKEDIN_CLIENT_SECRET || "").trim();
  const redirectUri = (process.env.LINKEDIN_REDIRECT_URI || "").trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("LinkedIn environment variables are missing.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenResponse.ok) {
    throw new Error(`LinkedIn token exchange failed with status ${tokenResponse.status}`);
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
    scope?: string;
    id_token?: string;
  };

  const profile = await getMemberProfile(tokenPayload.access_token, tokenPayload.id_token);
  const now = Date.now();

  return {
    connected: true,
    memberId: profile.sub,
    memberUrn: `urn:li:person:${profile.sub}`,
    name: profile.name ?? null,
    email: profile.email ?? null,
    picture: profile.picture ?? null,
    scope: parseScopeList(tokenPayload.scope),
    accessToken: tokenPayload.access_token,
    accessTokenExpiresAt: new Date(now + tokenPayload.expires_in * 1000).toISOString(),
    refreshToken: tokenPayload.refresh_token ?? null,
    refreshTokenExpiresAt: tokenPayload.refresh_token_expires_in
      ? new Date(now + tokenPayload.refresh_token_expires_in * 1000).toISOString()
      : null,
    lastSyncAt: new Date().toISOString(),
  };
}

export async function ensureFreshConnection(
  connection: LinkedInConnection
): Promise<LinkedInConnection> {
  if (!connection.connected || !connection.accessToken || !connection.accessTokenExpiresAt) {
    throw new Error("LinkedIn is not connected.");
  }

  const expiresAt = new Date(connection.accessTokenExpiresAt).getTime();
  const refreshBuffer = 5 * 60 * 1000;

  if (expiresAt > Date.now() + refreshBuffer) {
    return connection;
  }

  if (
    !connection.refreshToken ||
    !connection.refreshTokenExpiresAt ||
    new Date(connection.refreshTokenExpiresAt).getTime() <= Date.now() + refreshBuffer
  ) {
    throw new Error("LinkedIn token expired. Reconnect the account.");
  }

  const clientId = (process.env.LINKEDIN_CLIENT_ID || "").trim();
  const clientSecret = (process.env.LINKEDIN_CLIENT_SECRET || "").trim();

  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn environment variables are missing.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: connection.refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const refreshResponse = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!refreshResponse.ok) {
    throw new Error(`LinkedIn token refresh failed with status ${refreshResponse.status}`);
  }

  const refreshPayload = (await refreshResponse.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
    scope?: string;
  };

  const now = Date.now();

  return {
    ...connection,
    accessToken: refreshPayload.access_token,
    accessTokenExpiresAt: new Date(now + refreshPayload.expires_in * 1000).toISOString(),
    refreshToken: refreshPayload.refresh_token || connection.refreshToken,
    refreshTokenExpiresAt: refreshPayload.refresh_token_expires_in
      ? new Date(now + refreshPayload.refresh_token_expires_in * 1000).toISOString()
      : connection.refreshTokenExpiresAt,
    scope: refreshPayload.scope ? parseScopeList(refreshPayload.scope) : connection.scope,
    lastSyncAt: new Date().toISOString(),
  };
}

export async function publishLinkedInPost(
  connection: LinkedInConnection,
  draft: Draft
): Promise<{ remotePostId: string | null }> {
  if (!connection.accessToken || !connection.memberUrn) {
    throw new Error("LinkedIn account is not connected.");
  }

  const response = await fetch(LINKEDIN_POSTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": LINKEDIN_VERSION,
    },
    body: JSON.stringify({
      author: connection.memberUrn,
      commentary: draft.content,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LinkedIn publish failed with status ${response.status}: ${errorText.slice(0, 300)}`
    );
  }

  return {
    remotePostId: response.headers.get("x-restli-id"),
  };
}

export async function deleteLinkedInPost(
  connection: LinkedInConnection,
  remotePostId: string
): Promise<void> {
  if (!connection.accessToken) {
    throw new Error("LinkedIn account is not connected.");
  }

  const encodedPostId = encodeURIComponent(remotePostId);
  const response = await fetch(`${LINKEDIN_POSTS_URL}/${encodedPostId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-RestLi-Method": "DELETE",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LinkedIn delete failed with status ${response.status}: ${errorText.slice(0, 300)}`
    );
  }
}

async function getMemberProfile(accessToken: string, idToken?: string) {
  const fromToken = idToken ? parseJwtPayload(idToken) : null;

  if (fromToken?.sub) {
    return fromToken;
  }

  const response = await fetch(LINKEDIN_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`LinkedIn userinfo failed with status ${response.status}`);
  }

  return (await response.json()) as {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
  };
}

function parseJwtPayload(token: string) {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(decoded) as {
      sub: string;
      name?: string;
      email?: string;
      picture?: string;
    };
  } catch {
    return null;
  }
}

function parseScopeList(scopeValue?: string | null) {
  return (scopeValue || REQUIRED_SCOPES.join(" "))
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}
