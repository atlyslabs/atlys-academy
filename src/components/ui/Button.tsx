import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

/**
 * Night-stage buttons: pills in the landing page's language. Primary is the
 * one brand-blue fill on the page; secondary is the hairline pill the sign-in
 * page established; ghost is a quiet text action. Disabled states swap to dim
 * ink rather than opacity, which would wash the label below contrast.
 */
const VARIANT_CLASSES: Record<Variant, string> = {
  primary: cn(
    "border-transparent bg-brand text-white",
    "hover:bg-brand-hover active:translate-y-[1px]",
    "disabled:bg-white/[0.06] disabled:text-ink-dim",
  ),
  secondary: cn(
    "border-hairline-lit bg-transparent text-ink",
    "hover:border-ink-dim hover:bg-white/[0.04] active:translate-y-[1px]",
    "disabled:border-hairline disabled:bg-transparent disabled:text-ink-dim",
  ),
  ghost: cn(
    "border-transparent bg-transparent text-ink-muted",
    "underline-offset-4 hover:text-ink hover:underline",
    "disabled:text-ink-dim disabled:hover:no-underline",
  ),
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-8 px-4 text-[12.5px]",
  md: "h-11 px-6 text-[14px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border",
        "font-sans font-medium tracking-[0.01em]",
        "transition-[transform,background-color,border-color,color] duration-150 ease-out",
        "motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-text",
        "disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}
