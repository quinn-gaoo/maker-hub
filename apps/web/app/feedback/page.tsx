import { Lightbulb } from "lucide-react";

import { FeedbackForm } from "@/components/feedback-form";
import { Badge } from "@/components/ui/badge";

export default function FeedbackPage() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-10 py-8 md:py-14">
      <div className="space-y-7 text-center">
        <Badge variant="outline" className="rounded-full border-primary/25 bg-background/60 px-5 py-2 font-mono text-sm uppercase tracking-[0.22em]">
          <span className="mr-2 inline-block size-2 rounded-full bg-muted-foreground align-middle" />
          Feedback
        </Badge>
        <h1 className="font-heading text-5xl font-black tracking-[-0.08em] md:text-7xl">意见反馈</h1>
        <p className="mx-auto max-w-3xl text-xl leading-8 text-muted-foreground">
          把问题、功能建议或产品建议告诉我们。每一条反馈都会被认真对待。
        </p>
      </div>

      <div className="rounded-[1.75rem] border border-border/80 bg-card/70 p-6 shadow-sm md:p-12">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-start">
          <div className="grid size-16 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300">
            <Lightbulb className="size-7" />
          </div>
          <div className="space-y-3">
            <h2 className="font-heading text-3xl font-black tracking-[-0.06em]">写下你的想法</h2>
            <p className="text-lg leading-8 text-muted-foreground">
              无论是 Bug 反馈、功能建议、还是使用体验，都可以写下来。我们一起让 MakerHub 变得更好。
            </p>
          </div>
        </div>
        <FeedbackForm />
      </div>

      <p className="text-center text-base text-muted-foreground">
        你也可以通过 <a href="mailto:hello@makerhub.fyi" className="font-medium text-primary underline underline-offset-4">hello@makerhub.fyi</a> 直接联系我们。
      </p>
    </section>
  );
}
