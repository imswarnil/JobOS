import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "inverse"
  /** Anything a model does. Zest is the AI voice everywhere in JobOS. */
  | "zest";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-fg-on-accent hover:bg-accent-hover active:bg-accent-press shadow-e1",
  secondary:
    "bg-surface text-fg border border-line hover:border-line-strong hover:bg-sunken",
  ghost: "text-fg-muted hover:text-fg hover:bg-sunken",
  danger: "bg-danger-bg text-danger-fg border border-danger-line/40 hover:bg-danger-bg",
  inverse: "bg-inverse text-fg-on-inverse hover:opacity-90",
  zest: "bg-zest text-fg-on-zest hover:bg-zest-hover shadow-e1",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8125rem] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-9 w-9 justify-center",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className,
  variant = "secondary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center rounded-control font-semibold",
        // The spring easing is the whole difference between a button that
        // acknowledges the click and one that merely records it.
        "transition-[color,background-color,border-color,box-shadow,transform] duration-(--animate-duration-1) ease-(--ease-spring)",
        "hover:not-disabled:-translate-y-px active:not-disabled:translate-y-0 active:not-disabled:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-50",
        "whitespace-nowrap",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
