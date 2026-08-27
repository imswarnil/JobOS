import "server-only";

/**
 * MODEL PROVIDERS
 * ===============
 *
 * Four of them behind one shape, called over plain `fetch` rather than through
 * any vendor's SDK. Every endpoint is a single POST returning JSON; an SDK
 * would add megabytes of dependency and a second abstraction to debug through,
 * and none is worth it for one call.
 *
 *   anythingllm  self-hosted — a workspace, so the model carries whatever
 *                documents and system prompt you gave it. Speaks the
 *                OpenAI shape, which is why it needs no special casing.
 *   ollama       self-hosted — raw model, no workspace. The fallback for
 *                when AnythingLLM is down but the box is not.
 *   gemini       hosted — generous free tier, good at structured extraction
 *   groq         hosted — different infrastructure again, so one provider's
 *                rate limit or outage does not take the feature down
 *
 * **The order is local-first**: `anythingllm, ollama, gemini, groq`. The two
 * self-hosted providers cost nothing per call and send nothing off the box, so
 * they get first refusal; the hosted keys exist to catch the case where the
 * local box is asleep, unreachable from Vercel, or simply not good enough at
 * the task. Override with `LLM_PROVIDER_ORDER`.
 *
 * A self-hosted provider that is *configured but unreachable* is not a fatal
 * error — it fails, and the chain moves on. That is the whole point of having
 * a chain, and it is what makes `ANYTHINGLLM_BASE_URL=http://localhost:3001`
 * a safe thing to also have set in production.
 *
 * Every call asks for JSON and validates the result at the call site. Models
 * wrap JSON in prose and fences no matter how firmly you ask them not to, so
 * `extractJson` below assumes they will.
 */

export interface CompletionRequest {
  /** The instruction. Kept separate so providers can use their native slot. */
  system: string;
  user: string;
  /** Upper bound on the reply. Both providers honour this. */
  maxTokens?: number;
  /** Low by default: these are extraction tasks, not creative writing. */
  temperature?: number;
}

export interface CompletionResult {
  text: string;
  provider: string;
}

export class ProviderError extends Error {
  constructor(
    public provider: string,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

const TIMEOUT_MS = 25_000;

/** A fetch that gives up, so a hung provider cannot hold a request open. */
async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  provider: string,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      throw new ProviderError(
        provider,
        `${res.status} ${res.statusText}: ${detail}`,
        res.status,
      );
    }
    return await res.json();
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new ProviderError(provider, `Timed out after ${TIMEOUT_MS}ms`);
    }
    throw new ProviderError(provider, String(error));
  } finally {
    clearTimeout(timer);
  }
}

/* ── Gemini ──────────────────────────────────────────────────────────────── */

/**
 * Model names are pinned but overridable, because providers retire them.
 *
 * Both defaults here replaced names that had already been withdrawn —
 * `gemini-2.0-flash` and `llama-3.3-70b-versatile` both 404'd — so treat this
 * as a when, not an if. The env override means the fix is a config change
 * rather than a deploy.
 *
 * To see what is currently available:
 *   curl -H "x-goog-api-key: $GEMINI_API_KEY" \
 *     https://generativelanguage.googleapis.com/v1beta/models
 *   curl -H "Authorization: Bearer $GROQ_API_KEY" \
 *     https://api.groq.com/openai/v1/models
 */
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

async function gemini(req: CompletionRequest): Promise<CompletionResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ProviderError("gemini", "GEMINI_API_KEY is not set");

  const data = (await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      // Gemini has a first-class system slot; using it keeps the instruction
      // out of the turn history and makes it much harder to talk past.
      systemInstruction: { parts: [{ text: req.system }] },
      contents: [{ role: "user", parts: [{ text: req.user }] }],
      generationConfig: {
        temperature: req.temperature ?? 0.4,
        maxOutputTokens: req.maxTokens ?? 4000,
        responseMimeType: "application/json",
        /**
         * Gemini 3.x charges *thinking* tokens against maxOutputTokens, which
         * is a trap: with a 1400 budget a real prompt spent 1342 tokens
         * thinking and 54 answering, and the JSON came back truncated. Capping
         * the thinking leaves the budget for the answer.
         */
        thinkingConfig: { thinkingBudget: 512 },
      },
    },
    { "x-goog-api-key": key },
    "gemini",
  )) as {
    candidates?: {
      finishReason?: string;
      content?: { parts?: { text?: string }[] };
    }[];
  };

  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;

  // Say what actually happened. A truncated reply is not an empty one, and
  // the difference is the whole diagnosis.
  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new ProviderError("gemini", "Ran out of output tokens mid-answer");
  }
  if (!text) {
    throw new ProviderError(
      "gemini",
      `Empty response (finish: ${candidate?.finishReason ?? "unknown"})`,
    );
  }

  return { text, provider: "gemini" };
}

/* ── Groq ────────────────────────────────────────────────────────────────── */

const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

/* ── AnythingLLM ─────────────────────────────────────────────────────────── */

/**
 * The workspace to talk to. AnythingLLM's OpenAI-compatible layer overloads
 * `model` to mean "workspace slug", which is a slightly odd API and a very
 * convenient one: the workspace already carries its own model, system prompt,
 * temperature and attached documents, so switching what JobOS talks to is a
 * change in AnythingLLM rather than a deploy here.
 */
const ANYTHINGLLM_WORKSPACE = process.env.ANYTHINGLLM_WORKSPACE ?? "jobos";

/**
 * Normalises whatever form of base URL was configured.
 *
 * AnythingLLM's own docs show the base as `http://localhost:3001/api/v1`,
 * its UI shows `http://localhost:3001`, and both are things a person will
 * reasonably paste. Accepting either — rather than 404ing on
 * `/api/v1/api/v1/openai/...` — costs three lines and saves the twenty
 * minutes it takes to work out which half is duplicated.
 */
function anythingLlmBase(raw: string): string {
  return raw.trim().replace(/\/+$/, "").replace(/\/api\/v1$/, "");
}

/**
 * A self-hosted workspace, over AnythingLLM's OpenAI-shaped chat endpoint.
 *
 * This is the default provider, first in the chain, and the reason is not
 * quality — it is that inference you host has no per-request cost, no quota,
 * and no third party reading the contents. What goes through this seam is a
 * person's whole work history and every job they are considering, which is
 * about as personal as a corpus gets. Keeping it on hardware you own is worth
 * a meaningful amount of model quality.
 *
 * `response_format` is deliberately not sent. AnythingLLM passes the request
 * down to whatever engine backs the workspace, and the ones that do not
 * understand the field reject the whole request rather than ignoring it —
 * which turns "JSON might come back fenced" into "nothing comes back at all".
 * `extractJson` already assumes fences, so asking politely in the prompt and
 * cleaning up afterwards is strictly more robust here.
 */
async function anythingllm(req: CompletionRequest): Promise<CompletionResult> {
  const configured = process.env.ANYTHINGLLM_BASE_URL;
  if (!configured) {
    throw new ProviderError("anythingllm", "ANYTHINGLLM_BASE_URL is not set");
  }

  const headers: Record<string, string> = {};
  // AnythingLLM requires a key on every /api/v1 route unless it is running
  // with auth disabled entirely, which is not a thing to rely on.
  if (process.env.ANYTHINGLLM_API_KEY) {
    headers.authorization = `Bearer ${process.env.ANYTHINGLLM_API_KEY}`;
  }

  const data = (await postJson(
    `${anythingLlmBase(configured)}/api/v1/openai/chat/completions`,
    {
      model: ANYTHINGLLM_WORKSPACE,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      stream: false,
      temperature: req.temperature ?? 0.4,
      max_tokens: req.maxTokens ?? 4000,
    },
    headers,
    "anythingllm",
  )) as {
    choices?: { finish_reason?: string; message?: { content?: string } }[];
    error?: string | { message?: string };
  };

  // A 200 carrying an `error` is AnythingLLM's way of reporting a bad
  // workspace slug, so this is the check that turns "empty response" into
  // "there is no workspace called jobos".
  if (data.error) {
    const detail =
      typeof data.error === "string" ? data.error : data.error.message;
    throw new ProviderError("anythingllm", detail ?? "Unknown workspace error");
  }

  const choice = data.choices?.[0];
  const text = choice?.message?.content;

  if (choice?.finish_reason === "length") {
    throw new ProviderError("anythingllm", "Ran out of output tokens mid-answer");
  }
  if (!text) {
    throw new ProviderError(
      "anythingllm",
      `Empty response from workspace "${ANYTHINGLLM_WORKSPACE}"`,
    );
  }

  return { text, provider: "anythingllm" };
}

/* ── Ollama ──────────────────────────────────────────────────────────────── */

const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b";

/**
 * A self-hosted model, over Ollama's OpenAI-shaped chat endpoint.
 *
 * The reason to want this is not quality — a 3B model will lose to Gemini on
 * structured extraction every time — it is that inference you host yourself
 * has no per-request cost and no quota, which changes what the rate limit is
 * even for. Put it first in LLM_PROVIDER_ORDER on a box that can run
 * something large, and the hosted providers become the fallback rather than
 * the default.
 *
 * `OLLAMA_BASE_URL` must be reachable *from wherever JobOS runs*. On Vercel
 * that means publicly reachable and authenticated — a localhost URL will
 * work in development and silently fail in production.
 */
async function ollama(req: CompletionRequest): Promise<CompletionResult> {
  const base = process.env.OLLAMA_BASE_URL;
  if (!base) throw new ProviderError("ollama", "OLLAMA_BASE_URL is not set");

  const headers: Record<string, string> = {};
  // Optional bearer, for an instance behind a reverse proxy.
  if (process.env.OLLAMA_API_KEY) {
    headers.authorization = `Bearer ${process.env.OLLAMA_API_KEY}`;
  }

  const data = (await postJson(
    `${base.replace(/\/$/, "")}/api/chat`,
    {
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      stream: false,
      // Ollama's own JSON mode. Weaker than the hosted providers' schema
      // enforcement, which is why extractJson is forgiving.
      format: "json",
      options: {
        temperature: req.temperature ?? 0.4,
        num_predict: req.maxTokens ?? 4000,
      },
    },
    headers,
    "ollama",
  )) as { message?: { content?: string }; done_reason?: string };

  const text = data.message?.content;
  if (data.done_reason === "length") {
    throw new ProviderError("ollama", "Ran out of output tokens mid-answer");
  }
  if (!text) throw new ProviderError("ollama", "Empty response");

  return { text, provider: "ollama" };
}

async function groq(req: CompletionRequest): Promise<CompletionResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new ProviderError("groq", "GROQ_API_KEY is not set");

  const data = (await postJson(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      temperature: req.temperature ?? 0.4,
      max_tokens: req.maxTokens ?? 4000,
      response_format: { type: "json_object" },
    },
    { authorization: `Bearer ${key}` },
    "groq",
  )) as {
    choices?: { finish_reason?: string; message?: { content?: string } }[];
  };

  const choice = data.choices?.[0];
  const text = choice?.message?.content;

  if (choice?.finish_reason === "length") {
    throw new ProviderError("groq", "Ran out of output tokens mid-answer");
  }
  if (!text) throw new ProviderError("groq", "Empty response");

  return { text, provider: "groq" };
}

/* ── The seam ────────────────────────────────────────────────────────────── */

interface Implementation {
  call: (r: CompletionRequest) => Promise<CompletionResult>;
  ready: () => boolean;
  /** Runs on your hardware: no quota, no per-call cost, no data leaving. */
  selfHosted: boolean;
  /** What to show a person choosing an order in settings. */
  label: string;
  /** The env var whose presence turns this provider on. */
  envKey: string;
}

const IMPLEMENTATIONS: Record<string, Implementation> = {
  anythingllm: {
    call: anythingllm,
    ready: () => Boolean(process.env.ANYTHINGLLM_BASE_URL),
    selfHosted: true,
    label: "AnythingLLM",
    envKey: "ANYTHINGLLM_BASE_URL",
  },
  ollama: {
    call: ollama,
    ready: () => Boolean(process.env.OLLAMA_BASE_URL),
    selfHosted: true,
    label: "Ollama",
    envKey: "OLLAMA_BASE_URL",
  },
  gemini: {
    call: gemini,
    ready: () => Boolean(process.env.GEMINI_API_KEY),
    selfHosted: false,
    label: "Gemini",
    envKey: "GEMINI_API_KEY",
  },
  groq: {
    call: groq,
    ready: () => Boolean(process.env.GROQ_API_KEY),
    selfHosted: false,
    label: "Groq",
    envKey: "GROQ_API_KEY",
  },
};

/**
 * Local first, hosted last — and that ordering is the policy, not a default
 * someone forgot to think about.
 *
 * The corpus that goes through this seam is a person's entire work history
 * plus every role they are quietly considering. Self-hosted inference keeps
 * that on hardware they own, costs nothing per call, and has no quota to
 * exhaust. The hosted keys are the safety net for when the box is asleep or
 * unreachable — not the default path.
 */
const DEFAULT_ORDER = ["anythingllm", "ollama", "gemini", "groq"];

/** Every provider JobOS knows how to speak to, in the default order. */
export const KNOWN_PROVIDERS = DEFAULT_ORDER;

/**
 * The order to try providers in, from `LLM_PROVIDER_ORDER`.
 *
 * Unknown names are dropped rather than throwing: a typo in an env var should
 * cost you that one provider, not the whole feature.
 */
export function providerOrder(): string[] {
  const configured = process.env.LLM_PROVIDER_ORDER;
  const order = configured
    ? configured.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_ORDER;

  return order.filter((name) => name in IMPLEMENTATIONS);
}

/** Those in the configured order that actually have credentials. */
export function configuredProviders(): string[] {
  return providerOrder().filter((name) => IMPLEMENTATIONS[name].ready());
}

/** True when `name` runs on hardware you own. Unknown names are not. */
export function isSelfHosted(name: string): boolean {
  return IMPLEMENTATIONS[name]?.selfHosted ?? false;
}

/**
 * True when every configured provider is self-hosted.
 *
 * This is what `limit.ts` reads to decide whether metering makes sense: a cap
 * exists to protect a shared paid key, and if no such key is in the chain
 * there is nothing left for the cap to protect.
 */
export function allSelfHosted(): boolean {
  const available = configuredProviders();
  return available.length > 0 && available.every(isSelfHosted);
}

export interface ProviderStatus {
  name: string;
  label: string;
  selfHosted: boolean;
  /** Configured *and* in the active order — i.e. it will actually be called. */
  active: boolean;
  envKey: string;
}

/**
 * What the chain looks like right now, for the settings screen.
 *
 * Reported in call order, because "which one answers first" is the only
 * question a person actually has when they open that panel.
 */
export function describeProviders(): ProviderStatus[] {
  const order = providerOrder();
  const ranked = [
    ...order,
    ...KNOWN_PROVIDERS.filter((n) => !order.includes(n)),
  ];

  return ranked.map((name) => ({
    name,
    label: IMPLEMENTATIONS[name].label,
    selfHosted: IMPLEMENTATIONS[name].selfHosted,
    active: order.includes(name) && IMPLEMENTATIONS[name].ready(),
    envKey: IMPLEMENTATIONS[name].envKey,
  }));
}

/** The message shown when nothing at all is configured. */
const NOTHING_CONFIGURED =
  "No model provider is configured. Set ANYTHINGLLM_BASE_URL for a local workspace, OLLAMA_BASE_URL for a raw local model, or GEMINI_API_KEY / GROQ_API_KEY for a hosted fallback.";

/**
 * Walks the chain in order. Falls through on any provider error — a rate
 * limit, an outage, a refused connection, a malformed reply — because from
 * the caller's side those are all the same event: this one did not answer,
 * try the next.
 *
 * A local box that is switched off therefore costs one failed connection and
 * a few milliseconds, which is what makes it safe to leave a localhost URL
 * configured in an environment that cannot reach it.
 *
 * Throws only when every configured provider has failed, and reports what
 * each of them said rather than just the last.
 */
export async function complete(
  req: CompletionRequest,
): Promise<CompletionResult> {
  const available = configuredProviders();

  if (!available.length) {
    throw new ProviderError("none", NOTHING_CONFIGURED);
  }

  const failures: string[] = [];
  for (const name of available) {
    try {
      return await IMPLEMENTATIONS[name].call(req);
    } catch (error) {
      failures.push(`${name}: ${(error as Error).message}`);
    }
  }

  throw new ProviderError("all", failures.join(" · "));
}

/**
 * Pulls the first JSON object or array out of a reply.
 *
 * Both providers are asked for JSON and both mostly comply, but "mostly" is
 * doing real work in that sentence — a stray ```json fence or a sentence of
 * preamble is common enough that parsing the raw string is a guaranteed
 * intermittent failure.
 */
export function extractJson<T>(text: string): T {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error("The model did not return usable JSON.");
  }
}


/**
 * The same fallback chain, but with parsing and validation folded in.
 *
 * This exists because of a real failure: Gemini returned a *truncated* JSON
 * object, `complete()` treated that as success, and the caller reported "both
 * providers failed" — which was both wrong and unhelpful, since Groq had
 * never been asked.
 *
 * A provider that answers with something unusable has failed, in exactly the
 * way a 500 is a failure. Judging that inside the chain is what lets the
 * fallback do its job, and what lets the error name the real cause.
 */
export async function completeJson<T>(
  req: CompletionRequest,
  validate: (value: unknown) => T,
): Promise<{ value: T; provider: string }> {
  const available = configuredProviders();

  if (!available.length) {
    throw new ProviderError("none", NOTHING_CONFIGURED);
  }

  const failures: string[] = [];

  for (const name of available) {
    try {
      const result = await IMPLEMENTATIONS[name].call(req);
      const value = validate(extractJson<unknown>(result.text));
      return { value, provider: result.provider };
    } catch (error) {
      failures.push(`${name}: ${(error as Error).message}`);
    }
  }

  throw new ProviderError("all", failures.join(" · "));
}
