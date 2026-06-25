"use client";

import { forwardRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { useTransition } from "react";
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
  const [pending, startTransition] = useTransition();
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      startTransition(() => {
        void fetch("/api/auth/logout", { method: "POST" }).then(() => {
          router.push("/");
          router.refresh();
        });
      });
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
