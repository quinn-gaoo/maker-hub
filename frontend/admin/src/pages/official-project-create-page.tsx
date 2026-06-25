import { useState } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Textarea } from "@makerhub/ui";
import { Sparkles } from "lucide-react";

import { createOfficialProject } from "@/lib/api";
import type { ProjectDetail } from "@/types";

const EMPTY_FORM = {
  title: "",
  description: "",
  projectUrl: "",
  githubUrl: "",
  tags: "",
  images: "",
  isOfficial: true,
};

export function OfficialProjectCreatePage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<ProjectDetail | null>(null);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-900/80 bg-[linear-gradient(135deg,#0f172a_0%,#111827_45%,#1f2937_100%)] p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.28)] md:p-10">
        <Badge variant="outline" className="rounded-full border-white/15 bg-white/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.24em] text-white">
          <Sparkles className="size-3.5" />
          Official Collection
        </Badge>
        <h1 className="mt-6 font-heading text-4xl font-black tracking-[-0.08em] md:text-5xl">创建官方收录项目</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-white/72">
          这里创建的平台官方收录项目默认归属 MakerHub 官方账号，不需要再选择归属用户。门户网站会展示“官网收录”标记。
        </p>
      </section>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>填写项目内容</CardTitle>
          <CardDescription>提交后项目会以“官网收录”身份出现在门户网站中。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="grid gap-2 text-sm font-medium">
            <span>项目标题</span>
            <Input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="例如：MakerHub Curated Showcase"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            <span>项目描述</span>
            <Textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="简要说明为什么这个项目值得被官方收录。"
              className="min-h-36"
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              <span>项目地址</span>
              <Input
                value={form.projectUrl}
                onChange={(event) => setForm((current) => ({ ...current, projectUrl: event.target.value }))}
                placeholder="https://example.com"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span>GitHub 地址</span>
              <Input
                value={form.githubUrl}
                onChange={(event) => setForm((current) => ({ ...current, githubUrl: event.target.value }))}
                placeholder="https://github.com/example/repo"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            <span>标签</span>
            <Input
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              placeholder="用逗号分隔，例如：AI, 创作者工具, Showcase"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            <span>图片 URL</span>
            <Textarea
              value={form.images}
              onChange={(event) => setForm((current) => ({ ...current, images: event.target.value }))}
              placeholder={"每行一个图片 URL，至少一张，最多三张。\nhttps://example.com/cover.png"}
              className="min-h-28"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={form.isOfficial}
              onChange={(event) => setForm((current) => ({ ...current, isOfficial: event.target.checked }))}
              className="size-4"
            />
            <span>将该项目标记为官方收录</span>
          </label>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            size="lg"
            disabled={pending}
            onClick={async () => {
              setError("");
              setCreated(null);

              const tags = form.tags
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
              const images = form.images
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean);

              if (!form.title.trim() || !form.description.trim() || !form.projectUrl.trim()) {
                setError("请完整填写标题、描述和项目地址。");
                return;
              }

              if (tags.length === 0) {
                setError("请至少填写一个标签。");
                return;
              }

              if (images.length === 0) {
                setError("请至少提供一张项目图片。");
                return;
              }

              setPending(true);
              try {
                const project = await createOfficialProject({
                  title: form.title.trim(),
                  description: form.description.trim(),
                  projectUrl: form.projectUrl.trim(),
                  githubUrl: form.githubUrl.trim() || null,
                  tags,
                  images,
                  isOfficial: form.isOfficial,
                });
                setCreated(project);
                setForm(EMPTY_FORM);
              } catch (submissionError) {
                setError(submissionError instanceof Error ? submissionError.message : "创建项目失败。");
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "创建中..." : "创建官方收录项目"}
          </Button>
        </CardContent>
      </Card>

      {created ? (
        <Card className="rounded-[1.75rem] border-emerald-200 bg-emerald-50/80">
          <CardHeader>
            <CardTitle>创建成功</CardTitle>
            <CardDescription>项目已创建并会在门户网站展示官方收录标记。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-semibold">标题：</span>{created.title}</p>
            <p><span className="font-semibold">项目 ID：</span>{created.id}</p>
            <p><span className="font-semibold">归属：</span>MakerHub 官方</p>
            <p><span className="font-semibold">门户地址：</span>/projects/{created.id}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
