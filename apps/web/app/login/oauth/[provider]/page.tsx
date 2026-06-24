import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { OAuthCallbackClient } from "./oauth-callback-client";

type PageProps = {
  params: Promise<{ provider: string }>;
};

export default async function OAuthCallbackPage({ params }: PageProps) {
  const { provider } = await params;

  return (
    <section className="mx-auto max-w-xl py-10">
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>正在完成登录</CardTitle>
          <CardDescription>我们正在同步 {provider} 授权结果，请稍候。</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">正在处理中...</p>}>
            <OAuthCallbackClient provider={provider} />
          </Suspense>
        </CardContent>
      </Card>
    </section>
  );
}
