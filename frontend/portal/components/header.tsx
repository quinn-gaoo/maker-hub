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
  const profileName = session?.user?.name ?? "MakerHub 用户";
  const avatarUrl = session?.user?.image;

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-[#fffaf2]/82 backdrop-blur-xl dark:bg-black/86">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.svg" alt="MakerHub" className="size-9 rounded-[8px] shadow-sm" />
              <span className="font-heading text-base font-black tracking-[-0.03em] md:text-lg">MakerHub</span>
            </Link>
            <nav className="hidden items-center gap-1 rounded-sm bg-background/62 p-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-sm px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground",
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
                  <span className="flex size-5 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={profileName} className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="size-3.5" />
                    )}
                  </span>
                  <span className="max-w-28 truncate font-mono">@{displayName}</span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl border border-[#e8dccd] bg-[#fffdf9] p-0 shadow-[0_18px_45px_rgba(76,47,24,0.12)]">
                  <DropdownMenuLabel className="space-y-1 px-4 py-4">
                    <p className="truncate text-lg font-semibold tracking-[-0.04em] text-foreground">{profileName}</p>
                    <p className="truncate font-mono text-sm text-muted-foreground">@{displayName}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="mx-0 my-0 bg-[#efe4d8]" />
                  <div className="px-2 py-2">
                    <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 text-sm font-medium text-foreground">
                      <Link href={`/u/${username}`}>
                        <UserRound className="mr-2.5 size-4.5 stroke-[2.1]" />
                        我的主页
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 text-sm font-medium text-foreground">
                      <Link href="/me/projects">
                        <FolderKanban className="mr-2.5 size-4.5 stroke-[2.1]" />
                        我的项目
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 text-sm font-medium text-foreground">
                      <Link href="/me/profile">
                        <Settings className="mr-2.5 size-4.5 stroke-[2.1]" />
                        个人信息
                      </Link>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="mx-0 my-0 bg-[#efe4d8]" />
                  <div className="px-2 py-2">
                    <DropdownMenuItem
                      asChild
                      className="rounded-xl px-2.5 py-2 text-sm font-medium text-[#c2410c] focus:bg-[#fff1e8] focus:text-[#c2410c]"
                    >
                      <SignOutButton variant="menu">
                        <LogOut className="mr-2.5 size-4.5 stroke-[2.1]" />
                        退出登录
                      </SignOutButton>
                    </DropdownMenuItem>
                  </div>
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
