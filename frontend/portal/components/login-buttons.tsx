"use client";

import { useTransition } from "react";
import { RiGithubLine, RiGoogleLine } from "react-icons/ri";

import { Button } from "@/components/ui/button";
import { buildAuthorizationUrl, buildOAuthRedirectUri, createPkcePair, createRandomState, getOAuthClientId } from "@/lib/oauth";
import { cn } from "@/lib/utils";

type LoginButtonsProps = {
  providers: Array<{ id: string; label: string; enabled: boolean }>;
  className?: string;
};

const providerIcons = {
  google: RiGoogleLine,
  github: RiGithubLine,
} as const;

export function LoginButtons({ providers, className }: LoginButtonsProps) {
  const [pending, startTransition] = useTransition();

  return (
    <div className={cn("rounded-[14px] border border-[#eadfce] bg-white/58 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]", className)}>
      <p className="text-center text-[13px] font-medium tracking-[0.04em] text-[#8f846f]">第三方账号登录</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {providers.map((provider) => {
          const Icon = providerIcons[provider.id as keyof typeof providerIcons];

          return (
            <Button
              key={provider.id}
              variant="outline"
              className="h-13 w-full justify-center gap-3 rounded-[14px] border-[#e6dccb] bg-[#fffdfa] text-[14px] font-medium text-foreground shadow-none hover:bg-[#f8f2e8]"
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
              {Icon ? <Icon className="size-6 shrink-0" aria-hidden="true" /> : null}
              <span>{provider.enabled ? provider.label : `${provider.label} 暂未配置`}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
