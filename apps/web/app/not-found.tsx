export default function NotFoundPage() {
  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/80 px-8 py-14 text-center shadow-[0_18px_60px_rgba(0,0,0,0.05)]">
      <div className="mx-auto max-w-xl space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">404</p>
        <h1 className="font-heading text-3xl font-semibold tracking-[-0.06em] md:text-4xl">页面不存在</h1>
        <p className="text-base leading-7 text-muted-foreground">你访问的内容可能已经被删除，或者链接写错了。</p>
      </div>
    </section>
  );
}
