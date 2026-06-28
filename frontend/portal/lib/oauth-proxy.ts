import { NextResponse } from "next/server";

const OAUTH_HTTP_TIMEOUT_MS = 20_000;
const AUTH_PROXY_KEY_HEADER = "x-auth-proxy-key";

type SupportedProvider = "google" | "github";

type OAuthProxyLogContext = {
  requestId: string;
  provider: SupportedProvider;
};

type OAuthExchangeRequest = {
  code: string;
  code_verifier: string;
  redirect_uri: string;
  client_id: string;
  client_secret: string;
  request_id: string;
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

export async function parseOAuthExchangeRequest(
  request: Request,
  provider: SupportedProvider,
): Promise<OAuthExchangeRequest> {
  const requestId = crypto.randomUUID();

  console.info("OAuth proxy request received", {
    requestId,
    provider,
    method: request.method,
    url: request.url,
    contentType: request.headers.get("content-type"),
    hasProxyKey: Boolean(request.headers.get(AUTH_PROXY_KEY_HEADER)),
  });

  validateProxyKey(request, { requestId, provider });

  const payload = (await request.json().catch(() => null)) as Partial<OAuthExchangeRequest> | null;
  const code = payload?.code?.trim();
  const codeVerifier = payload?.code_verifier?.trim();
  const redirectUri = payload?.redirect_uri?.trim();
  const clientId = payload?.client_id?.trim();
  const clientSecret = payload?.client_secret?.trim();

  console.info("OAuth proxy payload parsed", {
    requestId,
    provider,
    hasBody: Boolean(payload),
    hasCode: Boolean(code),
    codePrefix: code ? maskPrefix(code) : null,
    hasCodeVerifier: Boolean(codeVerifier),
    hasRedirectUri: Boolean(redirectUri),
    redirectUri: redirectUri ?? null,
    hasClientId: Boolean(clientId),
    clientIdPrefix: clientId ? maskPrefix(clientId) : null,
    hasClientSecret: Boolean(clientSecret),
  });

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
    request_id: requestId,
  };
}

export async function exchangeOAuthCode(
  provider: SupportedProvider,
  payload: OAuthExchangeRequest,
): Promise<OAuthProxyResponse> {
  const startedAt = Date.now();

  console.info("OAuth proxy exchange started", {
    requestId: payload.request_id,
    provider,
    redirectUri: payload.redirect_uri,
  });

  try {
    const result = provider === "google" ? await exchangeGoogleCode(payload) : await exchangeGithubCode(payload);

    console.info("OAuth proxy exchange completed", {
      requestId: payload.request_id,
      provider,
      durationMs: Date.now() - startedAt,
      providerAccountId: result.provider_account_id,
      user: summarizeProxyUser(result.user),
      hasAccessToken: Boolean(result.access_token),
      hasRefreshToken: Boolean(result.refresh_token),
      expiresAt: result.expires_at,
      tokenType: result.token_type,
      scope: result.scope,
    });

    return result;
  } catch (error) {
    console.error("OAuth proxy exchange failed", {
      requestId: payload.request_id,
      provider,
      durationMs: Date.now() - startedAt,
      error: serializeOAuthProxyError(error),
    });
    throw error;
  }
}

export function toOAuthErrorResponse(provider: SupportedProvider, error: unknown) {
  if (error instanceof OAuthProxyError) {
    console.error("OAuth proxy request failed", {
      provider,
      status: error.status,
      message: error.message,
      details: sanitizeLogDetails(error.details ?? null),
    });
    return NextResponse.json(
      {
        error: error.message,
        details: error.details ?? null,
      },
      { status: error.status },
    );
  }

  console.error("Unexpected OAuth proxy error", {
    provider,
    error: serializeFetchError(error),
  });
  return NextResponse.json(
    {
      error: "OAuth proxy request failed",
    },
    { status: 500 },
  );
}

function validateProxyKey(request: Request, context: OAuthProxyLogContext) {
  const expectedKey = process.env.AUTH_PROXY_KEY?.trim();
  if (!expectedKey) {
    console.error("OAuth proxy key is not configured", context);
    throw new OAuthProxyError("Missing server environment variable: AUTH_PROXY_KEY", 500);
  }

  const providedKey = request.headers.get(AUTH_PROXY_KEY_HEADER)?.trim();
  if (!providedKey || providedKey !== expectedKey) {
    console.warn("OAuth proxy key validation failed", {
      ...context,
      hasProvidedKey: Boolean(providedKey),
      providedKeyPrefix: providedKey ? maskPrefix(providedKey) : null,
      expectedKeyPrefix: maskPrefix(expectedKey),
    });
    throw new OAuthProxyError("Unauthorized auth proxy request", 401);
  }

  console.info("OAuth proxy key validated", {
    ...context,
    keyPrefix: maskPrefix(expectedKey),
  });
}

async function exchangeGoogleCode(payload: OAuthExchangeRequest): Promise<OAuthProxyResponse> {
  const context: OAuthProxyLogContext = {
    requestId: payload.request_id,
    provider: "google",
  };
  const tokenPayload = await fetchJson<GoogleTokenResponse>(
    context,
    "token",
    "https://oauth2.googleapis.com/token",
    {
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
    },
  );

  console.info("Google OAuth token payload received", {
    requestId: payload.request_id,
    provider: "google",
    hasAccessToken: Boolean(tokenPayload.access_token),
    hasRefreshToken: Boolean(tokenPayload.refresh_token),
    expiresIn: tokenPayload.expires_in ?? null,
    tokenType: tokenPayload.token_type ?? null,
    scope: tokenPayload.scope ?? null,
    hasIdToken: Boolean(tokenPayload.id_token),
  });

  if (!tokenPayload.access_token) {
    throw new OAuthProxyError(
      "Google token response is missing required fields",
      502,
      sanitizeLogDetails(tokenPayload),
    );
  }

  const profile = await fetchJson<GoogleUserInfoResponse>(
    context,
    "userinfo",
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
      },
    },
  );

  console.info("Google OAuth userinfo payload received", {
    requestId: payload.request_id,
    provider: "google",
    hasSub: Boolean(profile.sub),
    hasEmail: Boolean(profile.email),
    emailVerified: profile.email_verified ?? null,
    hasName: Boolean(profile.name),
    hasPicture: Boolean(profile.picture),
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
  const context: OAuthProxyLogContext = {
    requestId: payload.request_id,
    provider: "github",
  };
  const tokenPayload = await fetchJson<GithubTokenResponse>(
    context,
    "token",
    "https://github.com/login/oauth/access_token",
    {
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
    },
  );

  console.info("GitHub OAuth token payload received", {
    requestId: payload.request_id,
    provider: "github",
    hasAccessToken: Boolean(tokenPayload.access_token),
    hasRefreshToken: Boolean(tokenPayload.refresh_token),
    tokenType: tokenPayload.token_type ?? null,
    scope: tokenPayload.scope ?? null,
  });

  if (!tokenPayload.access_token) {
    throw new OAuthProxyError(
      "GitHub token response is missing access_token",
      502,
      sanitizeLogDetails(tokenPayload),
    );
  }

  const authHeaders = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${tokenPayload.access_token}`,
    "User-Agent": "MakerHub OAuth Proxy",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const profile = await fetchJson<GithubUserResponse>(context, "user", "https://api.github.com/user", {
    headers: authHeaders,
  });
  const emails = await fetchJson<GithubEmailResponse[]>(
    context,
    "emails",
    "https://api.github.com/user/emails",
    {
      headers: authHeaders,
    },
  );

  console.info("GitHub OAuth user payloads received", {
    requestId: payload.request_id,
    provider: "github",
    hasId: typeof profile.id !== "undefined",
    login: profile.login ?? null,
    hasProfileEmail: Boolean(profile.email),
    emailCount: emails.length,
    hasPrimaryEmail: emails.some((item) => item.primary),
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

async function fetchJson<T>(
  context: OAuthProxyLogContext,
  action: string,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OAUTH_HTTP_TIMEOUT_MS);
  const startedAt = Date.now();

  console.info("Upstream OAuth request started", {
    ...context,
    action,
    url,
    method: init?.method ?? "GET",
    timeoutMs: OAUTH_HTTP_TIMEOUT_MS,
  });

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
    const rawText = await response.text();
    const json = rawText ? (safeJsonParse(rawText) as T | { error?: string; error_description?: string }) : null;

    console.info("Upstream OAuth response received", {
      ...context,
      action,
      url,
      status: response.status,
      ok: response.ok,
      durationMs: Date.now() - startedAt,
      contentType: response.headers.get("content-type"),
      bodyPreview: summarizeResponseBody(json ?? rawText),
    });

    if (!response.ok) {
      console.error("Upstream OAuth request returned an error", {
        ...context,
        action,
        url,
        status: response.status,
        durationMs: Date.now() - startedAt,
        details: sanitizeLogDetails(json ?? rawText),
      });
      throw new OAuthProxyError(
        `Upstream OAuth request failed: ${response.status}`,
        502,
        sanitizeLogDetails(json ?? rawText),
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
      console.error("Upstream OAuth request timed out", {
        ...context,
        action,
        url,
        durationMs: Date.now() - startedAt,
      });
      throw new OAuthProxyError("Upstream OAuth request timed out", 504);
    }

    const serializedError = serializeFetchError(error);
    console.error("Failed to reach upstream OAuth provider", {
      ...context,
      action,
      url,
      durationMs: Date.now() - startedAt,
      error: serializedError,
    });
    throw new OAuthProxyError("Failed to reach upstream OAuth provider", 502, serializedError);
  } finally {
    clearTimeout(timeout);
  }
}

function serializeOAuthProxyError(error: unknown) {
  if (error instanceof OAuthProxyError) {
    return {
      name: error.name,
      message: error.message,
      status: error.status,
      details: sanitizeLogDetails(error.details ?? null),
    };
  }
  return serializeFetchError(error);
}

function serializeFetchError(error: unknown) {
  if (!(error instanceof Error)) {
    return error;
  }

  const cause = "cause" in error ? error.cause : undefined;
  return {
    name: error.name,
    message: error.message,
    cause: cause instanceof Error ? { name: cause.name, message: cause.message } : cause,
  };
}

function sanitizeLogDetails(details: unknown): unknown {
  if (!details || typeof details !== "object") {
    return details;
  }

  if (Array.isArray(details)) {
    return details.map((item) => sanitizeLogDetails(item));
  }

  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => {
      if (isSensitiveLogKey(key)) {
        return [key, typeof value === "string" ? maskPrefix(value) : "[redacted]"];
      }
      return [key, sanitizeLogDetails(value)];
    }),
  );
}

function isSensitiveLogKey(key: string) {
  return /token|secret|code|authorization/i.test(key);
}

function maskPrefix(value: string) {
  return `${value.slice(0, 8)}...len=${value.length}`;
}

function summarizeProxyUser(user: OAuthProxyUser) {
  return {
    id: user.id,
    hasEmail: Boolean(user.email),
    hasName: Boolean(user.name),
    hasImage: Boolean(user.image),
    emailVerified: user.email_verified,
  };
}

function summarizeResponseBody(body: unknown) {
  const sanitized = sanitizeLogDetails(body);
  if (typeof sanitized === "string") {
    return sanitized.slice(0, 300);
  }
  return sanitized;
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
