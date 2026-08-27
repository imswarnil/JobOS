import "server-only";

/**
 * MODEL PROVIDERS
 * ===============
 *
 * Three of them behind one shape, called over plain `fetch` rather than
 * through any vendor's SDK. Every endpoint is a single POST returning JSON; an
 * SDK would add megabytes of dependency and a second abstraction to debug
 * through, and none is worth it for one call.
 *
 *   gemini  hosted — generous free tier, good at structured extraction
 *   groq    hosted — different infrastructure, so a Gemini rate limit or
 *           outage does not take the feature down with it
 *   ollama  self-hosted — no quota and no per-request cost, in exchange for
 *           being only as good as the hardware you point it at
 *
 * The order comes from `LLM_PROVIDER_ORDER` rather than a constant, because
 * the right one depends on the deployment: hosted first while you are living
 * on free tiers, self-hosted first once you own the box. Each is tried in
 * turn until one answers.
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

const IMPLEMENTATIONS: Record<
  string,
  { call: (r: CompletionRequest) => Promise<CompletionResult>; ready: () => boolean }
> = {
  gemini: { call: gemini, ready: () => Boolean(process.env.GEMINI_API_KEY) },
  groq: { call: groq, ready: () => Boolean(process.env.GROQ_API_KEY) },
  ollama: { call: ollama, ready: () => Boolean(process.env.OLLAMA_BASE_URL) },
};

/**
 * The order to try providers in, from `LLM_PROVIDER_ORDER`.
 *
 * Configurable because the right order depends on the deployment: hosted
 * first when you are relying on free tiers, self-hosted first when you own
 * the hardware and the quota stops mattering.
 */
export function providerOrder(): string[] {
  const configured = process.env.LLM_PROVIDER_ORDER;
  const order = configured
    ? configured.split(",").map((s) => s.trim()).filter(Boolean)
    : ["gemini", "groq", "ollama"];

  return order.filter((name) => name in IMPLEMENTATIONS);
}

/** Those in the configured order that actually have credentials. */
export function configuredProviders(): string[] {
  return providerOrder().filter((name) => IMPLEMENTATIONS[name].ready());
}

/**
 * Gemini, then Groq. Falls through on any provider error — a rate limit, an
 * outage, a malformed reply — because from the caller's side those are the
 * same event: this one did not answer, try the other.
 *
 * Throws only when every configured provider has failed, and reports what
 * each of them said rather than just the last.
 */
export async function complete(
  req: CompletionRequest,
): Promise<CompletionResult> {
  const available = configuredProviders();

  if (!available.length) {
    throw new ProviderError(
      "none",
      "No model provider is configured. Set GEMINI_API_KEY, GROQ_API_KEY or OLLAMA_BASE_URL.",
    );
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
    throw new ProviderError(
      "none",
      "No model provider is configured. Set GEMINI_API_KEY, GROQ_API_KEY or OLLAMA_BASE_URL.",
    );
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
