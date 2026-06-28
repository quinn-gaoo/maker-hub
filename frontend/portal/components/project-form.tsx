"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Bell, Plus, Save, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_PROJECT_IMAGES,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  MAX_TITLE_LENGTH,
  MIN_PROJECT_IMAGES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

type ProjectFormProps = {
  mode: "create" | "edit";
  projectId?: string;
  initialData?: {
    title: string;
    description: string;
    projectUrl: string;
    githubUrl?: string | null;
    tags: string[];
    images: string[];
  };
};

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
};

const UI_DESCRIPTION_LENGTH = 500;

type ProjectMutationResponse = {
  id?: string;
  slug?: string;
  message?: string;
};

type ProjectImageUploadResponse = {
  imageUrl?: string;
  message?: string;
};

type ImageTileProps = {
  imageUrl: string;
  label: string;
  detail?: string;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRemove: () => void;
  disableMoveLeft: boolean;
  disableMoveRight: boolean;
};

const formSchema = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(MAX_TITLE_LENGTH, `标题不能超过 ${MAX_TITLE_LENGTH} 字`),
  description: z
    .string()
    .trim()
    .min(1, "描述不能为空")
    .max(UI_DESCRIPTION_LENGTH, `描述不能超过 ${UI_DESCRIPTION_LENGTH} 字`),
  projectUrl: z.string().trim().url("请输入有效的网址"),
  githubUrl: z
    .string()
    .trim()
    .url("请输入有效的 GitHub 链接")
    .optional()
    .or(z.literal("")),
  tags: z
    .array(z.string().trim().min(1).max(MAX_TAG_LENGTH))
    .min(1, "至少填写 1 个标签")
    .max(MAX_TAGS, `最多 ${MAX_TAGS} 个标签`),
});

function ImageTile({
  imageUrl,
  label,
  detail,
  onMoveLeft,
  onMoveRight,
  onRemove,
  disableMoveLeft,
  disableMoveRight,
}: ImageTileProps) {
  return (
    <div className="flex items-center gap-5 rounded-xl border border-border/80 bg-background/55 p-5">
      <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
        <img src={imageUrl} alt={label} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm  text-foreground">{detail ?? imageUrl}</p>
        <Badge variant="outline" className="mt-2 rounded-full">
          {label}
        </Badge>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="icon" onClick={onMoveLeft} disabled={disableMoveLeft} className="rounded-md bg-background/70">
          <ArrowUp className="size-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onMoveRight} disabled={disableMoveRight} className="rounded-md bg-background/70">
          <ArrowDown className="size-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onRemove} className="rounded-md bg-background/70">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function ProjectForm({ mode, projectId, initialData }: ProjectFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [projectUrl, setProjectUrl] = useState(initialData?.projectUrl ?? "");
  const [githubUrl, setGithubUrl] = useState(initialData?.githubUrl ?? "");
  const [tagInput, setTagInput] = useState(initialData?.tags.join(", ") ?? "");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [existingImages, setExistingImages] = useState(initialData?.images ?? []);
  const [error, setError] = useState("");

  const parsedTags = useMemo(
    () =>
      tagInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [tagInput],
  );

  async function uploadFile(file: File) {
    return file;
  }

  useEffect(() => {
    return () => {
      pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, [pendingImages]);

  function handleFileChange(nextFiles: FileList | null) {
    if (!nextFiles) {
      return;
    }

    const nextArray = Array.from(nextFiles);
    const total = existingImages.length + pendingImages.length + nextArray.length;
    if (total > MAX_PROJECT_IMAGES) {
      setError(`最多上传 ${MAX_PROJECT_IMAGES} 张图片。`);
      return;
    }

    setError("");
    setPendingImages((current) => [
      ...current,
      ...nextArray.map((file) => ({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }

  function handleAddImageUrl() {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) {
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      setError("请输入有效的图片链接。");
      return;
    }

    const total = existingImages.length + pendingImages.length;
    if (total >= MAX_PROJECT_IMAGES) {
      setError(`最多上传 ${MAX_PROJECT_IMAGES} 张图片。`);
      return;
    }

    setError("");
    setExistingImages((current) => [...current, trimmed]);
    setImageUrlInput("");
  }

  function removeExistingImage(imageUrl: string) {
    setExistingImages((current) => current.filter((item) => item !== imageUrl));
  }

  function removePendingImage(imageId: string) {
    setPendingImages((current) => {
      const target = current.find((item) => item.id === imageId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((item) => item.id !== imageId);
    });
  }

  function moveExistingImage(index: number, direction: -1 | 1) {
    setExistingImages((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function movePendingImage(index: number, direction: -1 | 1) {
    setPendingImages((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  async function uploadPendingProjectImages(targetProjectId: string) {
    const uploadedImageUrls: string[] = [];

    for (const image of pendingImages) {
      const readyFile = await uploadFile(image.file);
      const uploadResponse = await fetch(`/api/bff/uploads/projects/${targetProjectId}/images`, {
        method: "POST",
        headers: {
          "Content-Type": readyFile.type,
          "X-File-Name": encodeURIComponent(readyFile.name),
        },
        body: readyFile,
        credentials: "include",
      });

      const uploadPayload = (await uploadResponse.json().catch(() => null)) as ProjectImageUploadResponse | null;
      if (!uploadResponse.ok || !uploadPayload?.imageUrl) {
        throw new Error(uploadPayload?.message ?? "图片上传失败");
      }
      uploadedImageUrls.push(uploadPayload.imageUrl);
    }

    return uploadedImageUrls;
  }

  async function handleSubmit() {
    if (submitting) {
      return;
    }

    setError("");

    const totalImages = existingImages.length + pendingImages.length;
    if (totalImages < MIN_PROJECT_IMAGES || totalImages > MAX_PROJECT_IMAGES) {
      setError(`图片数量需在 ${MIN_PROJECT_IMAGES}-${MAX_PROJECT_IMAGES} 张之间。`);
      return;
    }

    const parsed = formSchema.safeParse({
      title,
      description,
      projectUrl,
      githubUrl,
      tags: Array.from(new Set(parsedTags)),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "表单填写不完整。");
      return;
    }

    setSubmitting(true);
    const loadingToastId = toast.loading(mode === "create" ? "正在发布项目..." : "正在保存项目...");

    try {
      const basePayload = {
        ...parsed.data,
        githubUrl: parsed.data.githubUrl || null,
      };

      if (mode === "edit") {
        if (!projectId) {
          throw new Error("缺少项目 ID，无法保存。");
        }

        const uploadedImageUrls = await uploadPendingProjectImages(projectId);
        const payload = JSON.stringify({
          ...basePayload,
          images: [...existingImages, ...uploadedImageUrls],
        });

        const response = await fetch(`/api/bff/projects/${projectId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: payload,
          credentials: "include",
        });

        const result = (await response.json().catch(() => null)) as ProjectMutationResponse | null;
        if (!response.ok || !result?.id) {
          throw new Error(result?.message ?? "项目保存失败");
        }

        setPendingImages([]);
        router.refresh();
        toast.success("项目保存成功。", { id: loadingToastId });
        return;
      }

      const createPayload = JSON.stringify({
        ...basePayload,
        images: existingImages,
      });

      const response = await fetch("/api/bff/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: createPayload,
        credentials: "include",
      });

      const result = (await response.json().catch(() => null)) as ProjectMutationResponse | null;
      if (!response.ok || !result?.slug || !result?.id) {
        throw new Error(result?.message ?? "项目保存失败");
      }

      const uploadedImageUrls = await uploadPendingProjectImages(result.id);
      if (uploadedImageUrls.length > 0) {
        const patchResponse = await fetch(`/api/bff/projects/${result.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...basePayload,
            images: [...existingImages, ...uploadedImageUrls],
          }),
          credentials: "include",
        });

        const patched = (await patchResponse.json().catch(() => null)) as ProjectMutationResponse | null;
        if (!patchResponse.ok || !patched?.id) {
          throw new Error(patched?.message ?? "项目保存失败");
        }
      }

      toast.success("项目发布成功。", { id: loadingToastId });
      router.push(`/projects/${result.id}`);
      router.refresh();
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "项目保存失败";
      setError(message);
      toast.error(message, { id: loadingToastId });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-9 rounded-md border border-border/80 bg-card/70 p-8">
      <label className="grid gap-3 ">
        <span className="text-sm font-semibold text-foreground">项目标题 <span className="text-primary">*</span></span>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="给你的作品起一个吸引人的名字"
          maxLength={MAX_TITLE_LENGTH}
          className="h-11 rounded-sm bg-background/70 px-6 text-sm"
        />
      </label>

      <div className="grid gap-8 md:grid-cols-2">
        <label className="grid gap-3">
          <span className="text-sm font-semibold text-foreground">项目网址 <span className="text-primary">*</span></span>
          <Input
            value={projectUrl}
            onChange={(event) => setProjectUrl(event.target.value)}
            placeholder="https://your-project.com"
            className="h-11 rounded-sm bg-background/70 px-6 text-sm"
          />
        </label>
        <label className="grid gap-3 ">
          <span className="text-sm font-semibold text-foreground">GitHub 链接</span>
          <Input
            value={githubUrl}
            onChange={(event) => setGithubUrl(event.target.value)}
            placeholder="https://github.com/you/repo"
            className="h-11 rounded-sm bg-background/70 px-6 text-sm"
          />
        </label>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-foreground">项目标签 <span className="text-primary">*</span></span>
          <span className="font-mono text-sm  text-muted-foreground">已填 {Array.from(new Set(parsedTags)).length} 个（上限 {MAX_TAGS} 个）</span>
        </div>
        <Input
          value={tagInput}
          onChange={(event) => setTagInput(event.target.value)}
          placeholder="输入自定义标签，用英文逗号分隔，例如：Agent, 视频生成, 工作流"
          className="h-11 rounded-sm bg-background/70 px-6 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(parsedTags)).slice(0, MAX_TAGS).map((tag) => (
            <Badge key={tag} variant="outline" className="rounded-full px-3 py-1 font-mono">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <label className="grid gap-3 ">
        <span className="text-sm font-semibold text-foreground">项目描述 <span className="text-primary">*</span></span>
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="介绍一下你的作品：它做了什么、怎么用、有哪些亮点..."
          maxLength={UI_DESCRIPTION_LENGTH}
          className="min-h-56 resize-none rounded-lg bg-background/70 px-6 py-5 text-xl leading-8"
        />
        <span className="text-right font-mono text-sm  font-medium text-muted-foreground">{description.length}/{UI_DESCRIPTION_LENGTH}</span>
      </label>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">宣传图片</h3>
          <p className="font-mono text-sm text-muted-foreground">当前 {existingImages.length + pendingImages.length} 张（建议 1-3 张）</p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <Input
            value={imageUrlInput}
            onChange={(event) => setImageUrlInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAddImageUrl();
              }
            }}
            placeholder="粘贴图片链接 & 回车添加"
            className="h-16 flex-1 rounded-lg bg-background/70 px-6 text-xl"
          />
          <Button type="button" variant="secondary" onClick={handleAddImageUrl} >
            <Plus />
            添加
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <label className="inline-flex h-16 cursor-pointer items-center justify-center gap-3 rounded-lg border border-border bg-background/70 px-8 text-lg font-semibold transition-colors hover:bg-accent">
            <Upload className="size-5" />
            本地上传
            <Input
              className="hidden"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => handleFileChange(event.target.files)}
            />
          </label>
          <span className="text-sm  text-muted-foreground">支持 JPG、PNG、WebP</span>
        </div>
      </div>

      {existingImages.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading text-sm font-medium">已保存图片</h3>
            <span className="text-xs text-muted-foreground">调整顺序后会影响封面图</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {existingImages.map((imageUrl, index) => (
              <ImageTile
                key={imageUrl}
                imageUrl={imageUrl}
                label={index === 0 ? "当前封面" : `第 ${index + 1} 张`}
                onMoveLeft={() => moveExistingImage(index, -1)}
                onMoveRight={() => moveExistingImage(index, 1)}
                onRemove={() => removeExistingImage(imageUrl)}
                disableMoveLeft={index === 0}
                disableMoveRight={index === existingImages.length - 1}
              />
            ))}
          </div>
        </div>
      ) : null}

      {pendingImages.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading text-sm font-medium">待上传图片</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingImages.map((image, index) => (
              <ImageTile
                key={image.id}
                imageUrl={image.previewUrl}
                label={existingImages.length + index === 0 ? "将作为封面" : "待上传"}
                detail={image.file.name}
                onMoveLeft={() => movePendingImage(index, -1)}
                onMoveRight={() => movePendingImage(index, 1)}
                onRemove={() => removePendingImage(image.id)}
                disableMoveLeft={index === 0}
                disableMoveRight={index === pendingImages.length - 1}
              />
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-4 border-t border-border/70 pt-8 md:grid-cols-[120px_1fr]">
        {mode === "edit" ? (
          <Link href="/me/projects" className={cn(buttonVariants({ variant: "outline" }), "h-16 rounded-md bg-background/70 text-xl font-medium")}>
            取消
          </Link>
        ) : null}
        <Button disabled={submitting} onClick={handleSubmit} className="h-16 rounded-md text-xl ">
          {mode === "create" ? <Bell /> : <Save />}
          {submitting ? (mode === "create" ? "发布中..." : "保存中...") : mode === "create" ? "发布项目" : "保存修改"}
        </Button>
      </div>
    </div>
  );
}
