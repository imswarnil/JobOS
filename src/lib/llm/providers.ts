import "server-only";

/**
 * MODEL PROVIDERS
 * ===============
 *
 * Two of them behind one shape, called over plain `fetch` rather than through
 * either vendor's SDK. Both endpoints are a single POST returning JSON; an SDK
 * would add megabytes of dependency and a second abstraction to debug through,
 * and neither is worth it for one call.
 *
 *   gemini  primary — generous free tier, good at structured extraction
 *   groq    fallback — different infrastructure, so a Gemini rate limit or
 *           outage does not take the feature down with it
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

const GEMINI_MODEL = "gemini-2.0-flash";

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
        maxOutputTokens: req.maxTokens ?? 900,
        responseMimeType: "application/json",
      },
    },
    { "x-goog-api-key": key },
    "gemini",
  )) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new ProviderError("gemini", "Empty response");

  return { text, provider: "gemini" };
}

/* ── Groq ────────────────────────────────────────────────────────────────── */

const GROQ_MODEL = "llama-3.3-70b-versatile";

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
      max_tokens: req.maxTokens ?? 900,
      response_format: { type: "json_object" },
    },
    { authorization: `Bearer ${key}` },
    "groq",
  )) as { choices?: { message?: { content?: string } }[] };

  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new ProviderError("groq", "Empty response");

  return { text, provider: "groq" };
}

/* ── The seam ────────────────────────────────────────────────────────────── */

export function configuredProviders(): string[] {
  return [
    process.env.GEMINI_API_KEY ? "gemini" : null,
    process.env.GROQ_API_KEY ? "groq" : null,
  ].filter(Boolean) as string[];
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
  const chain: [string, (r: CompletionRequest) => Promise<CompletionResult>][] =
    [
      ["gemini", gemini],
      ["groq", groq],
    ];

  const available = chain.filter(([name]) =>
    configuredProviders().includes(name),
  );

  if (!available.length) {
    throw new ProviderError(
      "none",
      "No model provider is configured. Set GEMINI_API_KEY or GROQ_API_KEY.",
    );
  }

  const failures: string[] = [];
  for (const [name, call] of available) {
    try {
      return await call(req);
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
