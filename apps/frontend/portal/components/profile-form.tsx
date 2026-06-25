"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { UserProfile, UserProfileUpdatePayload } from "@/types";

type ProfileFormProps = {
  profile: UserProfile;
};

const MAX_BIO_LENGTH = 200;

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(profile.name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [error, setError] = useState("");
  const cancelHref = profile.username ? `/u/${profile.username}` : "/";

  function handleSubmit() {
    setError("");

    const payload: UserProfileUpdatePayload = {
      name: name.trim(),
      username: username.trim().toLowerCase(),
      avatarUrl: avatarUrl.trim() || null,
      bio: bio.trim(),
    };

    if (!payload.name) {
      setError("昵称不能为空。");
      return;
    }

    if (!payload.username) {
      setError("用户名不能为空。");
      return;
    }

    if (!/^[a-z0-9_-]{2,32}$/.test(payload.username)) {
      setError("用户名只能使用 2-32 位小写字母、数字、下划线或短横线。");
      return;
    }

    if (payload.bio.length > MAX_BIO_LENGTH) {
      setError(`个人简介最多 ${MAX_BIO_LENGTH} 字。`);
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/bff/me/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as (UserProfile & { message?: string }) | null;
      if (!response.ok || !result?.username) {
        setError(result?.message ?? "个人信息更新失败。");
        return;
      }

      router.push(`/u/${result.username}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-9 rounded-[1.75rem] border border-border/80 bg-card/70 p-6 shadow-sm md:p-12">
      <label className="grid gap-3 text-lg font-bold">
        <span>昵称 <span className="text-primary">*</span></span>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例如：Quinn"
          maxLength={80}
          className="h-16 rounded-lg bg-background/70 px-6 text-xl"
        />
      </label>

      <label className="grid gap-3 text-lg font-bold">
        <span>用户名 <span className="text-primary">*</span></span>
        <Input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="quinn"
          maxLength={32}
          className="h-16 rounded-lg bg-background/70 px-6 font-mono text-xl"
        />
        <span className="text-base font-medium text-muted-foreground">
          只支持小写字母、数字、下划线、短横线。这将成为你的主页地址： <span className="font-mono">makerhub.app/u/{username || "username"}</span>
        </span>
      </label>

      <label className="grid gap-3 text-lg font-bold">
        <span>头像链接</span>
        <div className="grid gap-4 md:grid-cols-[96px_1fr] md:items-center">
          <div className="size-20 overflow-hidden rounded-full bg-accent">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name || username || "avatar"} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-xl font-black text-foreground">
                {(name || username || "U").slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <Input
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://example.com/avatar.png"
            className="h-16 rounded-lg bg-background/70 px-6 text-xl"
          />
        </div>
      </label>

      <label className="grid gap-3 text-lg font-bold">
        <span>个人简介</span>
        <Textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="简单介绍一下自己..."
          maxLength={MAX_BIO_LENGTH}
          className="min-h-44 resize-none rounded-lg bg-background/70 px-6 py-5 text-xl leading-8"
        />
        <span className="text-right font-mono text-base font-medium text-muted-foreground">{bio.length}/{MAX_BIO_LENGTH}</span>
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-4 border-t border-border/70 pt-8 md:grid-cols-[120px_1fr]">
        <Link href={cancelHref} className={cn(buttonVariants({ variant: "outline" }), "h-16 rounded-md bg-background/70 text-xl font-medium")}>
          取消
        </Link>
        <Button disabled={pending} onClick={handleSubmit} className="h-16 rounded-md text-xl font-bold">
          <Save />
          保存个人信息
        </Button>
      </div>
    </div>
  );
}
