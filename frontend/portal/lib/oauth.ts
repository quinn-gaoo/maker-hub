const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";

export function getOAuthClientId(provider: string) {
  if (provider === "google") {
    return process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID ?? "";
  }
  if (provider === "github") {
    return process.env.NEXT_PUBLIC_AUTH_GITHUB_ID ?? "";
  }
  return "";
}

export function isOAuthProviderEnabled(provider: string) {
  return Boolean(getOAuthClientId(provider));
}

export function buildOAuthRedirectUri(provider: string, origin: string) {
  return `${origin.replace(/\/$/, "")}/login/oauth/${provider}`;
}

export function createRandomState() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function createPkcePair() {
  const verifier = createRandomState() + createRandomState();
  const challenge = await createCodeChallenge(verifier);
  return { verifier, challenge };
}

export async function createCodeChallenge(verifier: string) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(data: Uint8Array) {
  let binary = "";
  data.forEach((item) => {
    binary += String.fromCharCode(item);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function buildAuthorizationUrl(params: {
  provider: "google" | "github";
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}) {
  const search = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
  });

  if (params.provider === "google") {
    search.set("scope", "openid email profile");
    search.set("access_type", "offline");
    search.set("prompt", "consent");
    return `${GOOGLE_AUTH_URL}?${search.toString()}`;
  }

  search.set("scope", "read:user user:email");
  return `${GITHUB_AUTH_URL}?${search.toString()}`;
}
