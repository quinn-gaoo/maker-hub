import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { apiGet } from "@/lib/backend";
import { ProfileForm } from "@/components/profile-form";
import { Badge } from "@/components/ui/badge";
import type { UserProfile } from "@/types";

export default async function EditProfilePage() {
  const session = await auth();
  if (!session?.user?.username) {
    redirect("/login");
  }

  const profile = await apiGet<UserProfile>(`/users/${session.user.username}`);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
      <section className="mx-auto w-full max-w-5xl space-y-10 py-6 md:py-10">
        <div className="rounded-[1.75rem] border border-border/80 bg-card/70 p-8 shadow-sm md:p-14">
          <Badge variant="outline" className="rounded-full border-primary/30 bg-background/60 px-5 py-2 font-mono text-sm uppercase tracking-[0.22em] text-primary">
            <span className="mr-2 inline-block size-2 rounded-full bg-primary align-middle" />
            Profile
          </Badge>
          <div className="mt-7 space-y-4">
            <h1 className="font-heading text-4xl font-black tracking-[-0.08em] md:text-6xl">编辑个人信息</h1>
            <p className="max-w-3xl text-xl leading-8 text-muted-foreground">
              更新昵称、主页地址、头像和简介。这些信息会显示在你的公开主页上。
            </p>
          </div>
        </div>
        <ProfileForm profile={profile} />
      </section>
    </div>
  );
}
