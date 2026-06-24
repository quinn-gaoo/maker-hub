"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LoginButtonsProps = {
  providers: Array<{ id: string; label: string; enabled: boolean }>;
};

export function LoginButtons({ providers }: LoginButtonsProps) {
  const router = useRouter();
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
                if (typeof window !== "undefined") {
                  window.sessionStorage.setItem("makerhub-oauth-callback-url", "/");
                }
                void fetch(`/api/auth/${provider.id}/start?callbackUrl=/`, {
                  method: "GET",
                })
                  .then((response) => response.json())
                  .then((payload: { authorizationUrl: string }) => {
                    router.push(payload.authorizationUrl);
                  });
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
