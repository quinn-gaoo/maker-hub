"use client";

import { forwardRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  children?: ReactNode;
  variant?: "button" | "menu";
} & ButtonHTMLAttributes<HTMLButtonElement>;

export const SignOutButton = forwardRef<HTMLButtonElement, SignOutButtonProps>(function SignOutButton(
  { children = "退出登录", variant = "button", className, onClick, ...props },
  ref,
) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || pending) {
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const result = (await response.json().catch(() => null)) as { ok?: boolean } | null;
      if (!response.ok || !result?.ok) {
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  if (variant === "menu") {
    return (
      <button
        ref={ref}
        type="button"
        className={cn("flex w-full items-center gap-2 text-left", className)}
        disabled={pending}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <Button ref={ref} variant="outline" className={className} disabled={pending} onClick={handleClick} {...props}>
      {children}
    </Button>
  );
});
