import Link from "next/link";
import { ChevronDown, FolderKanban, LogIn, LogOut, Settings, UserRound } from "lucide-react";

import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export async function Header() {
  const session = await auth();
  const navItems = [
    { href: "/", label: "发现作品" },
    { href: "/submit", label: "发布项目" },
    { href: "/feedback", label: "意见反馈" },
  ];
  const username = session?.user?.username;
  const displayName = username ?? session?.user?.name ?? "creator";

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-[#fffaf2]/82 backdrop-blur-xl dark:bg-black/86">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-primary-foreground shadow-sm">
                MH
              </span>
              <span className="font-heading text-base font-black tracking-[-0.03em] md:text-lg">MakerHub</span>
            </Link>
            <nav className="hidden items-center gap-1 rounded-full bg-background/62 p-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {session?.user && username ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "border-border/70 bg-background/80 px-3",
                  )}
                >
                  <UserRound />
                  <span className="max-w-28 truncate font-mono">@{displayName}</span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate font-mono">@{displayName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/u/${username}`}>
                      <UserRound />
                      我的主页
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/me/projects">
                      <FolderKanban />
                      我的项目
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/me/profile">
                      <Settings />
                      编辑个人信息
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <SignOutButton variant="menu">
                      <LogOut />
                      退出登录
                    </SignOutButton>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login" className={cn(buttonVariants(), "bg-foreground text-background hover:bg-foreground/90")}>
                <LogIn />
                登录
              </Link>
            )}
          </div>
        </div>
        <nav className="flex flex-wrap gap-2 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "rounded-full border-border/70 bg-background/80",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
