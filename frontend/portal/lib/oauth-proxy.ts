import { NextResponse } from "next/server";

const OAUTH_HTTP_TIMEOUT_MS = 20_000;
const AUTH_PROXY_KEY_HEADER = "x-auth-proxy-key";

type SupportedProvider = "google" | "github";

type OAuthExchangeRequest = {
  code: string;
  code_verifier: string;
  redirect_uri: string;
  client_id: string;
  client_secret: string;
};

type OAuthProxyUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  email_verified: boolean | null;
};

export type OAuthProxyResponse = {
  provider: SupportedProvider;
  provider_account_id: string;
  type: "oauth";
  access_token: string;
  refresh_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
  user: OAuthProxyUser;
};

export class OAuthProxyError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "OAuthProxyError";
    this.status = status;
    this.details = details;
  }
}

export async function parseOAuthExchangeRequest(request: Request): Promise<OAuthExchangeRequest> {
  validateProxyKey(request);

  const payload = (await request.json().catch(() => null)) as Partial<OAuthExchangeRequest> | null;
  const code = payload?.code?.trim();
  const codeVerifier = payload?.code_verifier?.trim();
  const redirectUri = payload?.redirect_uri?.trim();
  const clientId = payload?.client_id?.trim();
  const clientSecret = payload?.client_secret?.trim();

  if (!code) {
    throw new OAuthProxyError("Missing required field: code");
  }
  if (!codeVerifier) {
    throw new OAuthProxyError("Missing required field: code_verifier");
  }
  if (!redirectUri) {
    throw new OAuthProxyError("Missing required field: redirect_uri");
  }
  if (!clientId) {
    throw new OAuthProxyError("Missing required field: client_id");
  }
  if (!clientSecret) {
    throw new OAuthProxyError("Missing required field: client_secret");
  }

  return {
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  };
}

export async function exchangeOAuthCode(
  provider: SupportedProvider,
  payload: OAuthExchangeRequest,
): Promise<OAuthProxyResponse> {
  if (provider === "google") {
    return exchangeGoogleCode(payload);
  }
  return exchangeGithubCode(payload);
}

export function toOAuthErrorResponse(error: unknown) {
  if (error instanceof OAuthProxyError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details ?? null,
      },
      { status: error.status },
    );
  }

  console.error("Unexpected OAuth proxy error", error);
  return NextResponse.json(
    {
      error: "OAuth proxy request failed",
    },
    { status: 500 },
  );
}

function validateProxyKey(request: Request) {
  const expectedKey = process.env.AUTH_PROXY_KEY?.trim();
  if (!expectedKey) {
    throw new OAuthProxyError("Missing server environment variable: AUTH_PROXY_KEY", 500);
  }

  const providedKey = request.headers.get(AUTH_PROXY_KEY_HEADER)?.trim();
  if (!providedKey || providedKey !== expectedKey) {
    throw new OAuthProxyError("Unauthorized auth proxy request", 401);
  }
}

async function exchangeGoogleCode(payload: OAuthExchangeRequest): Promise<OAuthProxyResponse> {
  const tokenPayload = await fetchJson<GoogleTokenResponse>("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: payload.client_id,
      client_secret: payload.client_secret,
      code: payload.code,
      code_verifier: payload.code_verifier,
      grant_type: "authorization_code",
      redirect_uri: payload.redirect_uri,
    }),
  });

  if (!tokenPayload.access_token) {
    throw new OAuthProxyError("Google token response is missing required fields", 502, tokenPayload);
  }

  const profile = await fetchJson<GoogleUserInfoResponse>("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
  });

  if (!profile.sub) {
    throw new OAuthProxyError("Google userinfo response is missing required fields", 502, profile);
  }

  return {
    provider: "google",
    provider_account_id: String(profile.sub),
    type: "oauth",
    access_token: tokenPayload.access_token,
    refresh_token: tokenPayload.refresh_token ?? null,
    expires_at: tokenPayload.expires_in ?? null,
    token_type: tokenPayload.token_type ?? null,
    scope: tokenPayload.scope ?? null,
    id_token: tokenPayload.id_token ?? null,
    session_state: null,
    user: {
      id: `google:${profile.sub}`,
      email: profile.email ?? null,
      name: profile.name ?? null,
      image: profile.picture ?? null,
      email_verified: profile.email_verified ?? null,
    },
  };
}

async function exchangeGithubCode(payload: OAuthExchangeRequest): Promise<OAuthProxyResponse> {
  const tokenPayload = await fetchJson<GithubTokenResponse>("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: payload.client_id,
      client_secret: payload.client_secret,
      code: payload.code,
      code_verifier: payload.code_verifier,
      redirect_uri: payload.redirect_uri,
    }),
  });

  if (!tokenPayload.access_token) {
    throw new OAuthProxyError("GitHub token response is missing access_token", 502, tokenPayload);
  }

  const authHeaders = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${tokenPayload.access_token}`,
    "User-Agent": "MakerHub OAuth Proxy",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const profile = await fetchJson<GithubUserResponse>("https://api.github.com/user", {
    headers: authHeaders,
  });
  const emails = await fetchJson<GithubEmailResponse[]>("https://api.github.com/user/emails", {
    headers: authHeaders,
  });

  if (typeof profile.id === "undefined") {
    throw new OAuthProxyError("GitHub user response is missing required fields", 502, profile);
  }

  const primaryEmail =
    emails.find((item) => item.primary)?.email ?? emails[0]?.email ?? profile.email ?? null;

  return {
    provider: "github",
    provider_account_id: String(profile.id),
    type: "oauth",
    access_token: tokenPayload.access_token,
    refresh_token: tokenPayload.refresh_token ?? null,
    expires_at: null,
    token_type: tokenPayload.token_type ?? null,
    scope: tokenPayload.scope ?? null,
    id_token: null,
    session_state: null,
    user: {
      id: `github:${profile.id}`,
      email: primaryEmail,
      name: profile.name ?? profile.login ?? null,
      image: profile.avatar_url ?? null,
      email_verified: null,
    },
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OAUTH_HTTP_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
    const rawText = await response.text();
    const json = rawText ? (safeJsonParse(rawText) as T | { error?: string; error_description?: string }) : null;

    if (!response.ok) {
      throw new OAuthProxyError(
        `Upstream OAuth request failed: ${response.status}`,
        502,
        json ?? rawText,
      );
    }

    if (json === null) {
      throw new OAuthProxyError("Upstream OAuth response is empty", 502);
    }

    return json as T;
  } catch (error) {
    if (error instanceof OAuthProxyError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new OAuthProxyError("Upstream OAuth request timed out", 504);
    }
    throw new OAuthProxyError("Failed to reach upstream OAuth provider", 502, error instanceof Error ? error.message : error);
  } finally {
    clearTimeout(timeout);
  }
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type GoogleUserInfoResponse = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

type GithubTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type GithubUserResponse = {
  id?: number;
  login?: string;
  name?: string;
  email?: string | null;
  avatar_url?: string;
};

type GithubEmailResponse = {
  email: string;
  primary?: boolean;
  verified?: boolean;
};
