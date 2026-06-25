"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAuthorizationUrl, buildOAuthRedirectUri, createPkcePair, createRandomState, getOAuthClientId } from "@/lib/oauth";

type LoginButtonsProps = {
  providers: Array<{ id: string; label: string; enabled: boolean }>;
};

export function LoginButtons({ providers }: LoginButtonsProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>第三方登录</CardTitle>
        <CardDescription>继续使用你已有的开发者账号快速登录。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((provider) => (
          <Button
            key={provider.id}
            variant="outline"
            className="w-full justify-center"
            disabled={!provider.enabled || pending}
            onClick={() => {
              if (!provider.enabled) {
                return;
              }
              startTransition(() => {
                const clientId = getOAuthClientId(provider.id);
                if (!clientId) {
                  return;
                }
                void (async () => {
                  const providerId = provider.id as "google" | "github";
                  const origin = window.location.origin;
                  const redirectUri = buildOAuthRedirectUri(providerId, origin);
                  const state = createRandomState();
                  const { verifier, challenge } = await createPkcePair();
                  window.sessionStorage.setItem(
                    "makerhub-oauth-state",
                    JSON.stringify({
                      provider: providerId,
                      state,
                      verifier,
                      redirectUri,
                      callbackUrl: "/",
                    }),
                  );
                  window.sessionStorage.setItem("makerhub-oauth-callback-url", "/");
                  const authorizationUrl = buildAuthorizationUrl({
                    provider: providerId,
                    clientId,
                    redirectUri,
                    state,
                    codeChallenge: challenge,
                  });
                  window.location.assign(authorizationUrl);
                })();
              });
            }}
          >
            {provider.enabled ? `使用 ${provider.label} 登录` : `${provider.label} 暂未配置`}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
