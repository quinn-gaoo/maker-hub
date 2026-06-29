"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { clientAuthFetch } from "@/lib/client-auth-fetch";
import { cn } from "@/lib/utils";
import type { UserProfile, UserProfileUpdatePayload } from "@/types";

type ProfileFormProps = {
  profile: UserProfile;
};

type ProfileUpdateResponse = {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  message?: string;
};

type AvatarUploadResponse = {
  avatarUrl?: string;
  avatar_url?: string;
  message?: string;
  detail?: { message?: string };
  fieldErrors?: Record<string, string>;
  field_errors?: Record<string, string>;
};

const MAX_BIO_LENGTH = 200;
const IMAGE_CONTENT_TYPES_BY_EXTENSION: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function getImageContentType(file: File) {
  if (file.type) {
    return file.type;
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? IMAGE_CONTENT_TYPES_BY_EXTENSION[extension] : undefined;
}

function buildUploadFormData(file: File) {
  const formData = new FormData();
  formData.append("file", file, file.name);
  return formData;
}

function getAvatarUploadError(result: AvatarUploadResponse | null, fallback: string) {
  const fieldErrors = result?.fieldErrors ?? result?.field_errors;
  return result?.message ?? result?.detail?.message ?? fieldErrors?.image ?? fieldErrors?.content_type ?? fieldErrors?.file ?? fallback;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [name, setName] = useState(profile.name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [error, setError] = useState("");
  const cancelHref = profile.username ? `/u/${profile.username}` : "/";

  async function handleAvatarChange(file: File | null) {
    if (!file || uploadingAvatar) {
      return;
    }

    setError("");
    setUploadingAvatar(true);

    try {
      const contentType = getImageContentType(file);
      if (!contentType) {
        setError("无法识别图片格式，请选择 JPG、PNG、WebP、GIF 或 AVIF。");
        return;
      }

      const response = await clientAuthFetch("/uploads/users/me/avatar", {
        method: "POST",
        body: buildUploadFormData(file),
      });

      const result = (await response.json().catch(() => null)) as AvatarUploadResponse | null;
      const nextAvatarUrl = result?.avatarUrl ?? result?.avatar_url;
      if (!response.ok || !nextAvatarUrl) {
        setError(getAvatarUploadError(result, "头像上传失败。"));
        return;
      }

      setAvatarUrl(nextAvatarUrl);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSubmit() {
    if (pending || uploadingAvatar) {
      return;
    }

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

    setPending(true);
    try {
      const response = await clientAuthFetch("/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as ProfileUpdateResponse | null;
      if (!response.ok || !result?.username) {
        setError(result?.message ?? "个人信息更新失败。");
        return;
      }

      router.push(`/u/${result.username}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-9 rounded-sm border border-border/80 bg-card/70 p-6 ">
      <label className="grid gap-3 ">
        <span>昵称 <span className="text-primary">*</span></span>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例如：Quinn"
          maxLength={80}
          className="h-11 rounded-lg bg-background/70 px-6 text-xl"
        />
      </label>

      <label className="grid gap-3 ">
        <span>用户名 <span className="text-primary">*</span></span>
        <Input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="quinn"
          maxLength={32}
          className="h-11 rounded-lg bg-background/70 px-6 font-mono text-xl"
        />
        <span className="text-base font-medium text-muted-foreground">
          只支持小写字母、数字、下划线、短横线。这将成为你的主页地址： <span className="font-mono">makerhub.app/u/{username || "username"}</span>
        </span>
      </label>

      <label className="grid gap-3 ">
        <span>头像</span>
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
          <div className="space-y-3">
            <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-3 rounded-lg border border-border bg-background/70 px-6 text-base font-medium transition-colors hover:bg-accent">
              <Upload className="size-4" />
              {uploadingAvatar ? "上传中..." : avatarUrl ? "上传新头像" : "上传头像"}
              <Input
                className="hidden"
                type="file"
                accept="image/*"
                disabled={uploadingAvatar}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void handleAvatarChange(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <p className="text-base font-medium text-muted-foreground">支持 JPG、PNG、WebP、GIF、AVIF。上传后会直接替换当前头像。</p>
          </div>
        </div>
      </label>

      <label className="grid gap-3 ">
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
        <Link href={cancelHref} className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-md bg-background/70 text-xl font-medium")}>
          取消
        </Link>
        <Button disabled={pending || uploadingAvatar} onClick={handleSubmit} className="h-11 rounded-md text-xl font-bold">
          <Save />
          保存个人信息
        </Button>
      </div>
    </div>
  );
}
