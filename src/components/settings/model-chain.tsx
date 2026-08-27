import {
  CheckCircle2,
  CircleSlash,
  Cloud,
  Globe,
  HardDrive,
  XCircle,
} from "lucide-react";

import { probeChain, probeCrawl4ai, type ProviderProbe } from "@/lib/llm/health";
import { LIMIT, isUnmetered } from "@/lib/llm/limit";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * THE MODEL CHAIN, AS IT ACTUALLY IS
 * ==================================
 *
 * Not a list of logos. This is the fallback order, top to bottom, with each
 * provider probed live — because the chain's great virtue (it silently
 * degrades) is also the only thing wrong with it: everything keeps working
 * slightly worse and nothing tells you the local model has never once been
 * called.
 *
 * Rendered as an async server component so the page paints immediately and
 * this streams in behind a Suspense boundary. Probing four hosts is the
 * slowest thing on the settings screen and none of the rest should wait on it.
 */

function Row({ probe, position }: { probe: ProviderProbe; position: number | null }) {
  const state = !probe.active
    ? "off"
    : probe.reachable === true
      ? "up"
      : probe.reachable === false
        ? "down"
        : "unknown";

  const Icon =
    state === "up" ? CheckCircle2 : state === "down" ? XCircle : CircleSlash;

  return (
    <li
      className={cn(
        "relative flex items-start gap-3 rounded-control border px-3 py-2.5",
        "transition-colors duration-150 ease-out",
        state === "up" && "border-success-line/40 bg-success-bg/40",
        state === "down" && "border-danger-line/40 bg-danger-bg/30",
        state === "off" && "border-line-subtle bg-transparent opacity-70",
        state === "unknown" && "border-line-subtle",
      )}
    >
      {/* Position in the chain. The whole point of the panel is the order. */}
      <span
        className={cn(
          "t-num mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-pill text-[0.625rem] font-bold",
          position === null
            ? "bg-sunken text-fg-faint"
            : state === "up"
              ? "bg-success-line text-white"
              : "bg-muted text-fg-muted",
        )}
        aria-hidden
      >
        {position === null ? "—" : position + 1}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] font-semibold text-fg">
          {probe.label}
          <Badge tone={probe.selfHosted ? "special" : "neutral"}>
            {probe.selfHosted ? (
              <>
                <HardDrive className="h-2.5 w-2.5" strokeWidth={2.5} />
                Yours
              </>
            ) : (
              <>
                <Cloud className="h-2.5 w-2.5" strokeWidth={2.5} />
                Hosted
              </>
            )}
          </Badge>
          {probe.latencyMs !== undefined && state !== "off" ? (
            <span className="t-num text-[0.6875rem] font-medium text-fg-faint">
              {probe.latencyMs}ms
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-fg-subtle">
          {probe.detail}
        </p>
      </div>

      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          state === "up" && "text-success-fg",
          state === "down" && "text-danger-fg",
          state === "off" && "text-fg-faint",
        )}
        strokeWidth={2}
        aria-label={
          state === "up" ? "Reachable" : state === "down" ? "Failing" : "Not configured"
        }
      />
    </li>
  );
}

export async function ModelChain() {
  // Both at once. They are independent hosts and the panel should take as
  // long as the slowest, not the sum.
  const [chain, crawl] = await Promise.all([probeChain(), probeCrawl4ai()]);

  const inOrder = chain.filter((p) => p.rank !== null);
  const rest = chain.filter((p) => p.rank === null);
  const firstUp = inOrder.find((p) => p.active && p.reachable);
  const anyUp = Boolean(firstUp);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-control border px-3 py-2.5 text-xs leading-relaxed",
          anyUp
            ? "border-success-line/30 bg-success-bg text-success-fg"
            : "border-warning-line/40 bg-warning-bg text-warning-fg",
        )}
      >
        {anyUp ? (
          <>
            <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span>
              <strong className="font-semibold">{firstUp!.label}</strong> answers
              first.{" "}
              {firstUp!.selfHosted
                ? "Nothing leaves your hardware unless it fails."
                : "This is a hosted key — point OLLAMA_BASE_URL at your VPS to keep your history on hardware you own."}
            </span>
          </>
        ) : (
          <>
            <XCircle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span>
              Nothing in the chain is answering. Every AI feature will report a
              failure rather than guess.
            </span>
          </>
        )}
      </div>

      <ol className="space-y-2">
        {inOrder.map((p) => (
          <Row key={p.name} probe={p} position={p.rank} />
        ))}
      </ol>

      {rest.length ? (
        <>
          <p className="t-slate pt-1">Not in the chain</p>
          <ul className="space-y-2">
            {rest.map((p) => (
              <Row key={p.name} probe={p} position={null} />
            ))}
          </ul>
        </>
      ) : null}

      {/* Not a model provider, so not in the numbered chain — but it fails
          the same ways, and "is the stuff on my VPS reachable" is the one
          question this screen exists to answer. */}
      <div className="border-t border-line-subtle pt-3">
        <p className="t-slate mb-2">Page fetching</p>
        <div
          className={cn(
            "flex items-start gap-3 rounded-control border px-3 py-2.5",
            crawl.reachable
              ? "border-success-line/40 bg-success-bg/40"
              : crawl.configured
                ? "border-danger-line/40 bg-danger-bg/30"
                : "border-line-subtle opacity-70",
          )}
        >
          <Globe
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              crawl.reachable
                ? "text-success-fg"
                : crawl.configured
                  ? "text-danger-fg"
                  : "text-fg-faint",
            )}
            strokeWidth={2}
          />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] font-semibold text-fg">
              Crawl4AI
              <Badge tone={crawl.configured ? "special" : "neutral"}>
                <HardDrive className="h-2.5 w-2.5" strokeWidth={2.5} />
                Yours
              </Badge>
              {crawl.latencyMs !== undefined ? (
                <span className="t-num text-[0.6875rem] font-medium text-fg-faint">
                  {crawl.latencyMs}ms
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-fg-subtle">
              {crawl.detail}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-fg-subtle">
        {isUnmetered() ? (
          <>
            <strong className="font-semibold text-fg-muted">Unmetered.</strong>{" "}
            Every provider in the chain is self-hosted, so there is no shared
            key to protect and no cap on model requests.
          </>
        ) : (
          <>
            <strong className="font-semibold text-fg-muted">
              {LIMIT} requests
            </strong>{" "}
            per 24 hours, because a hosted key is in the chain. The cap lifts on
            its own once every provider is self-hosted.
          </>
        )}
      </p>
    </div>
  );
}

/** What the panel looks like while four hosts are being probed. */
export function ModelChainSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      <div className="fx-skeleton h-11 w-full" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="fx-skeleton h-14 w-full" />
      ))}
    </div>
  );
}
