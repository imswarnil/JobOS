import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * `ComponentPropsWithRef` rather than `InputHTMLAttributes`, so callers can
 * hand this a ref. React 19 passes `ref` as an ordinary prop — no forwardRef
 * needed — but the attribute type has to admit it exists.
 */
export function Input({
  className,
  ...props
}: React.ComponentPropsWithRef<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-control border border-line bg-surface px-3",
        "text-sm text-fg placeholder:text-fg-faint",
        "transition-colors duration-200 ease-out",
        "hover:border-line-strong",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium text-fg", className)}
      {...props}
    />
  );
}

/** Label + control + optional hint, spaced consistently. */
export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint ? <span className="text-xs text-fg-subtle">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
