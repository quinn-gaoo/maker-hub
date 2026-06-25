import type { Metadata } from "next";
import Link from "next/link";

import "@/app/globals.css";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "MakerHub | AI 创作者作品宣传站",
  description: "展示独立 AI 创作者项目、宣传图、链接与评论的中文社区。",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/logo.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem("makerhub-theme");const prefers=window.matchMedia("(prefers-color-scheme: dark)").matches;if(t==="dark"||(!t&&prefers)){document.documentElement.classList.add("dark");}}catch(e){}`,
          }}
        />
      </head>
      <body className={cn("min-h-screen")}>
        <Header />
        <main>
          <div className="flex w-full flex-col gap-10">{children}</div>
        </main>
        <footer className="border-t border-border/80 bg-[#f1e5d8]/80 px-4 py-10 dark:bg-[#130d08]/92 md:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div className="space-y-4">
              <Link href="/" className="inline-flex items-center gap-3">
                <img src="/logo.svg" alt="MakerHub" className="size-9 rounded-[8px] shadow-sm" />
                <span className="text-base font-bold">MakerHub</span>
              </Link>
              <p className="max-w-xs text-sm leading-6 text-muted-foreground">
                一个让 AI Creator 安静地展示作品的小社区。不被算法淹没，不被广告打扰。
              </p>
            </div>
            <div className="grid gap-8 text-sm sm:grid-cols-2 md:min-w-[360px] md:justify-end">
              <div className="space-y-3">
                <p className="font-semibold">浏览</p>
                <Link href="/" className="block text-muted-foreground hover:text-foreground">发现作品</Link>
                <Link href="/submit" className="block text-muted-foreground hover:text-foreground">发布项目</Link>
                <Link href="/feedback" className="block text-muted-foreground hover:text-foreground">意见反馈</Link>
              </div>
              <div className="space-y-3">
                <p className="font-semibold">账户</p>
                <Link href="/login" className="block text-muted-foreground hover:text-foreground">登录</Link>
                <Link href="/me/projects" className="block text-muted-foreground hover:text-foreground">我的项目</Link>
                <Link href="/me/profile" className="block text-muted-foreground hover:text-foreground">个人信息</Link>
              </div>
            </div>
          </div>
          <div className="mx-auto mt-10 flex w-full max-w-7xl flex-wrap justify-between gap-4 border-t border-border/80 pt-6 text-xs text-muted-foreground">
            <span>© 2026 MakerHub</span>
            <span>Built with curiosity in 2026.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
