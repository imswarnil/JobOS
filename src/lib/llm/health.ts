import "server-only";

import {
  KNOWN_PROVIDERS,
  configuredProviders,
  describeProviders,
  providerOrder,
} from "@/lib/llm/providers";

/**
 * IS ANY OF THIS ACTUALLY PLUGGED IN?
 * ===================================
 *
 * The provider chain is deliberately forgiving — a self-hosted box that is
 * switched off just fails and the next provider answers. That is the right
 * runtime behaviour and a terrible debugging experience: everything keeps
 * working, slightly worse, and nothing says why. You find out weeks later that
 * the local model has never once been called.
 *
 * So the chain gets a window. Each provider is probed on its cheapest
 * *diagnostic* endpoint rather than by asking it to think — the questions
 * worth answering here are "can I reach it", "does it accept my key" and "is
 * the model I named actually installed", and none of those need inference.
 *
 * The Ollama probe is the one that earns its keep: pointing `OLLAMA_MODEL` at
 * something that was never pulled is the single most common way this goes
 * wrong, it produces a 404 that reads like a network error, and listing the
 * tags catches it in one request.
 *
 * Crawl4AI is probed here too. It is not a model provider and does not belong
 * in the chain, but it fails in exactly the same way — a box that is asleep,
 * a key that was rotated — and it is the same question a person is asking
 * when they open this screen: is the stuff on my VPS actually reachable?
 */

/**
 * Short on purpose, and unrelated to `TIMEOUT_MS` in providers.ts.
 *
 * These endpoints list models and report health — they do no inference, so a
 * slow box is still fast here, and a host that cannot answer `/api/tags` in
 * ten seconds is a host worth reporting as down.
 */
const PROBE_TIMEOUT_MS = 10_000;

export interface ProviderProbe {
  name: string;
  label: string;
  selfHosted: boolean;
  /** Configured and in the active order — i.e. it would really be called. */
  active: boolean;
  envKey: string;
  /** Where it sits in the fallback chain, or null when it is not in it. */
  rank: number | null;
  /** null when the provider was skipped because it is not configured. */
  reachable: boolean | null;
  /** Round trip in ms, when we got that far. */
  latencyMs?: number;
  /** What went wrong, phrased for a person rather than a log. */
  detail?: string;
}

/** A fetch that gives up, so one dead host cannot hang the settings page. */
async function probeFetch(
  url: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Turns a thrown fetch error into something worth reading.
 *
 * "fetch failed" is what Node reports for a refused connection, an unknown
 * host and an expired certificate alike, and telling those apart is most of
 * the diagnosis — so the cause chain gets unwrapped rather than swallowed.
 */
function explain(error: unknown): string {
  const err = error as { name?: string; cause?: { code?: string } };
  if (err?.name === "AbortError") {
    return `No answer within ${PROBE_TIMEOUT_MS / 1000}s.`;
  }

  switch (err?.cause?.code) {
    case "ECONNREFUSED":
      return "Nothing is listening on that address.";
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "That hostname does not resolve from here.";
    case "ETIMEDOUT":
      return "Connection timed out — likely a firewall between here and there.";
    case "CERT_HAS_EXPIRED":
      return "The TLS certificate has expired.";
    default:
      return (error as Error)?.message ?? "Unreachable.";
  }
}

/** `/api/tags` lists what is pulled, which is the check that matters. */
async function probeOllama(): Promise<Partial<ProviderProbe>> {
  const url = process.env.OLLAMA_BASE_URL!.replace(/\/+$/, "");
  const key = process.env.OLLAMA_API_KEY;

  const res = await probeFetch(
    `${url}/api/tags`,
    key ? { authorization: `Bearer ${key}` } : {},
  );
  if (!res.ok) return { reachable: false, detail: `Answered ${res.status}.` };

  const body = (await res.json()) as { models?: { name?: string }[] };
  const installed = (body.models ?? []).map((m) => m.name).filter(Boolean) as string[];
  const wanted = process.env.OLLAMA_MODEL ?? "llama3.2:3b";

  // Ollama resolves a bare name to its `:latest` tag, so "qwen3" and
  // "qwen3:latest" are the same model and only one of them is ever listed.
  const has = installed.some(
    (name) => name === wanted || name === `${wanted}:latest` || `${name}:latest` === wanted,
  );

  if (!has) {
    return {
      reachable: false,
      detail: installed.length
        ? `Running, but "${wanted}" is not pulled. Installed: ${installed.join(", ")}.`
        : `Running, but no models are installed. Try: ollama pull ${wanted}`,
    };
  }

  return { reachable: true, detail: `${wanted} ready · ${installed.length} model${installed.length === 1 ? "" : "s"} installed.` };
}

async function probeGemini(): Promise<Partial<ProviderProbe>> {
  const res = await probeFetch(
    "https://generativelanguage.googleapis.com/v1beta/models",
    { "x-goog-api-key": process.env.GEMINI_API_KEY! },
  );
  if (res.status === 400 || res.status === 403) {
    return { reachable: false, detail: "The API key was rejected." };
  }
  if (!res.ok) return { reachable: false, detail: `Answered ${res.status}.` };
  return { reachable: true, detail: "Key accepted." };
}

async function probeGroq(): Promise<Partial<ProviderProbe>> {
  const res = await probeFetch("https://api.groq.com/openai/v1/models", {
    authorization: `Bearer ${process.env.GROQ_API_KEY!}`,
  });
  if (res.status === 401) {
    return { reachable: false, detail: "The API key was rejected." };
  }
  if (!res.ok) return { reachable: false, detail: `Answered ${res.status}.` };
  return { reachable: true, detail: "Key accepted." };
}

/**
 * Crawl4AI, which is not a model provider but fails the same ways.
 *
 * `/health` is unauthenticated on every build, so a 200 here means the
 * container is up — and a 200 with a rejected key on `/crawl` is a different
 * problem worth telling apart. Checking both is two cheap requests and turns
 * "pasting a link does nothing" into a sentence you can act on.
 */
export async function probeCrawl4ai(): Promise<{
  configured: boolean;
  reachable: boolean;
  detail: string;
  latencyMs?: number;
}> {
  const base = process.env.CRAWL4AI_BASE_URL?.trim();
  if (!base) {
    return {
      configured: false,
      reachable: false,
      detail:
        "CRAWL4AI_BASE_URL is not set. Job links are fetched as plain HTML, which most boards return empty.",
    };
  }

  const url = base.replace(/\/+$/, "");
  const started = Date.now();

  try {
    const res = await probeFetch(`${url}/health`);
    const latencyMs = Date.now() - started;

    if (!res.ok) {
      return {
        configured: true,
        reachable: false,
        latencyMs,
        detail: `/health answered ${res.status}.`,
      };
    }

    const body = (await res.json().catch(() => ({}))) as { version?: string };

    // A running container with a rejected key still cannot fetch anything,
    // and that failure is invisible until someone pastes a link.
    if (!process.env.CRAWL4AI_API_KEY) {
      return {
        configured: true,
        reachable: true,
        latencyMs,
        detail: `Up${body.version ? ` (v${body.version})` : ""}, but no API key is set — fine on a private network, not on the open internet.`,
      };
    }

    return {
      configured: true,
      reachable: true,
      latencyMs,
      detail: `Up${body.version ? ` (v${body.version})` : ""} and authenticated.`,
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      latencyMs: Date.now() - started,
      detail: explain(error),
    };
  }
}

const PROBES: Record<string, () => Promise<Partial<ProviderProbe>>> = {
  ollama: probeOllama,
  gemini: probeGemini,
  groq: probeGroq,
};

/**
 * Probes every provider, in parallel, and reports the whole chain.
 *
 * In parallel because these are independent network calls and doing them in
 * sequence would make the slowest one everybody's problem — the window should
 * take as long as the slowest probe, not the sum of them.
 *
 * Unconfigured providers are reported with `reachable: null` rather than
 * omitted. "Gemini is not set up" is a fact worth seeing on this screen; a
 * missing row just looks like the page forgot about it.
 */
export async function probeChain(): Promise<ProviderProbe[]> {
  const order = providerOrder();
  const ready = new Set(configuredProviders());

  const rows = describeProviders();

  return Promise.all(
    rows.map(async (row): Promise<ProviderProbe> => {
      const rank = order.indexOf(row.name);
      const shell: ProviderProbe = {
        ...row,
        rank: rank === -1 ? null : rank,
        reachable: null,
      };

      if (!ready.has(row.name)) {
        return { ...shell, detail: `${row.envKey} is not set.` };
      }

      const started = Date.now();
      try {
        const result = await PROBES[row.name]();
        return { ...shell, latencyMs: Date.now() - started, ...result };
      } catch (error) {
        return {
          ...shell,
          latencyMs: Date.now() - started,
          reachable: false,
          detail: explain(error),
        };
      }
    }),
  );
}

/** Providers JobOS knows about at all — used to render the "not set up" rows. */
export { KNOWN_PROVIDERS };
