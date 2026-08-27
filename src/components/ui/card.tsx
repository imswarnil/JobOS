import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * `edge` draws a gradient hairline along the top.
 *
 * It is the cheapest way to say what a panel is *for* without a coloured
 * header: spark means a model produced what is inside, heat means this is the
 * live/primary thing on the screen. Absent is the default and the common case.
 */
export function Card({
  className,
  edge,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { edge?: "spark" | "heat" }) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface shadow-e1",
        edge && "relative overflow-hidden",
        edge === "spark" && "edge-spark",
        edge === "heat" && "edge-heat",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1 p-5 sm:p-6", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold text-fg", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm leading-relaxed text-fg-muted", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-line-subtle px-5 py-4 sm:px-6",
        className,
      )}
      {...props}
    />
  );
}
