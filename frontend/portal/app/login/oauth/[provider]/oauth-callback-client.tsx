"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type OAuthCallbackClientProps = {
  provider: string;
};

type CompleteResponse = {
  message?: string;
  callbackUrl?: string;
  authenticated?: boolean;
  code?: string;
};

type OAuthStateRecord = {
  provider: "google" | "github";
  state: string;
  verifier: string;
  redirectUri: string;
  callbackUrl: string;
};

function resolveDestination(provider: string, callbackUrl: string | undefined, fallbackUrl: string | null) {
  const callbackPath = `/login/oauth/${provider}`;
  const fallback = fallbackUrl || "/";

  if (!callbackUrl) {
    return fallback;
  }

  try {
    const parsed = new URL(callbackUrl, window.location.origin);
    if (parsed.pathname === callbackPath) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
  } catch {
    if (callbackUrl.startsWith(callbackPath)) {
      return fallback;
    }
    return callbackUrl;
  }
}

export function OAuthCallbackClient({ provider }: OAuthCallbackClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("正在同步授权信息...");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const storedRaw = typeof window !== "undefined" ? window.sessionStorage.getItem("makerhub-oauth-state") : null;

    if (error) {
      setMessage(`第三方登录失败：${error}`);
      return;
    }

    if (!code || !state) {
      setMessage("缺少必要的授权参数，无法完成登录。");
      return;
    }

    let stored: OAuthStateRecord | null = null;
    if (storedRaw) {
      try {
        stored = JSON.parse(storedRaw) as OAuthStateRecord;
      } catch {
        stored = null;
      }
    }

    if (!stored || stored.provider !== provider) {
      setMessage("登录状态已失效，请重新发起第三方登录。");
      return;
    }

    if (stored.state !== state) {
      setMessage("授权状态校验失败，请重新发起第三方登录。");
      return;
    }

    let cancelled = false;
    const fallbackUrl =
      typeof window !== "undefined" ? window.sessionStorage.getItem("makerhub-oauth-callback-url") : null;

    void fetch(`/api/auth/${provider}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        code_verifier: stored.verifier,
        callback_url: stored.callbackUrl,
        redirect_uri: stored.redirectUri,
      }),
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as CompleteResponse | null;
        if (!response.ok) {
          throw new Error(payload?.message ?? `第三方登录失败（${response.status}）。`);
        }
        return payload;
      })
      .then((payload) => {
        if (cancelled) {
          return;
        }
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem("makerhub-oauth-callback-url");
          window.sessionStorage.removeItem("makerhub-oauth-state");
        }
        router.replace(resolveDestination(provider, payload?.callbackUrl, fallbackUrl));
        router.refresh();
      })
      .catch((submissionError) => {
        if (!cancelled) {
          setMessage(submissionError instanceof Error ? submissionError.message : "第三方登录失败。");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [provider, router, searchParams]);

  return <p className="text-sm text-muted-foreground">{message}</p>;
}
