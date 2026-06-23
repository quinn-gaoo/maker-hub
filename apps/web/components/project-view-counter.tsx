import { Eye } from "lucide-react";

type ProjectViewCounterProps = {
  viewCount: number;
};

export function ProjectViewCounter({ viewCount }: ProjectViewCounterProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">
      <Eye className="size-4" />
      <span className="font-mono">{viewCount} 次浏览</span>
    </div>
  );
}
