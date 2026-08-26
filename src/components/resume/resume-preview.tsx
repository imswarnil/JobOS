import {
  formatRange,
  type ResumeData,
  type ResumeSection,
} from "@/lib/resume/schema";

/**
 * The document itself.
 *
 * Built for an ATS parser first and a human second, which is the same set of
 * constraints either way:
 *
 *   - One column. Real text. No tables, no text boxes, no icons carrying
 *     meaning — parsers read multi-column layouts in the wrong order or not
 *     at all.
 *   - Standard headings, rendered as headings.
 *   - Contact details as plain text in the body, never in a header element.
 *   - Serif face and generous leading, because this is a document, not a UI.
 *
 * Deliberately monochrome: the accent that carries meaning everywhere else in
 * JobOS would just be noise printed on A4.
 *
 * TODO(Phase 2): render the same tree through React-PDF so the export and
 * this preview cannot drift apart.
 */
export function ResumePreview({ data }: { data: ResumeData }) {
  const { basics, sections } = data;
  const contact = [basics.email, basics.phone, basics.location].filter(Boolean);
  const nonEmpty = sections.filter((s) => s.items.length > 0);

  return (
    <article
      className="mx-auto w-full max-w-[52rem] bg-white px-10 py-12 font-serif text-[#111] shadow-e2 sm:px-14 sm:py-14"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      aria-label="Resume preview"
    >
      <header className="border-b border-[#ccc] pb-4">
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.01em]">
          {basics.name || "Your name"}
        </h1>
        {basics.headline ? (
          <p className="mt-1 text-[1.0625rem] text-[#333]">{basics.headline}</p>
        ) : null}

        {contact.length || basics.links.length ? (
          <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-[#444]">
            {contact.join("  ·  ")}
            {contact.length && basics.links.length ? "  ·  " : ""}
            {basics.links.map((link, i) => (
              <span key={link.id}>
                {i > 0 ? "  ·  " : ""}
                <a href={link.url} className="underline">
                  {link.label}
                </a>
              </span>
            ))}
          </p>
        ) : null}
      </header>

      {basics.summary ? (
        <p className="mt-5 text-[0.9375rem] leading-relaxed text-[#222]">
          {basics.summary}
        </p>
      ) : null}

      {nonEmpty.length === 0 ? (
        <p className="mt-8 text-center text-[0.875rem] text-[#888] italic">
          Add an entry on the left and it appears here.
        </p>
      ) : null}

      {nonEmpty.map((section) => (
        <Section key={section.id} section={section} />
      ))}
    </article>
  );
}

function Section({ section }: { section: ResumeSection }) {
  return (
    <section className="mt-7">
      <h2 className="border-b border-[#ccc] pb-1 text-[0.8125rem] font-bold tracking-[0.12em] text-[#000] uppercase">
        {section.title}
      </h2>

      {section.kind === "skills" ? (
        <dl className="mt-3 space-y-1.5">
          {section.items.map((item) => (
            <div key={item.id} className="flex flex-wrap gap-x-2 text-[0.9375rem]">
              <dt className="font-bold">{item.title}:</dt>
              <dd className="text-[#222]">
                {item.tags.length ? item.tags.join(", ") : item.subtitle}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="mt-3 space-y-5">
          {section.items.map((item) => {
            const range = formatRange(item);
            return (
              <div key={item.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="text-[1rem] font-bold">
                    {item.title}
                    {item.subtitle ? (
                      <span className="font-normal text-[#333]">
                        {" "}
                        — {item.subtitle}
                      </span>
                    ) : null}
                  </h3>
                  {range ? (
                    <span className="text-[0.8125rem] whitespace-nowrap text-[#555]">
                      {range}
                    </span>
                  ) : null}
                </div>

                {item.location || item.url ? (
                  <p className="mt-0.5 text-[0.8125rem] text-[#555]">
                    {item.location}
                    {item.location && item.url ? "  ·  " : ""}
                    {item.url ? (
                      <a href={item.url} className="underline">
                        {item.url.replace(/^https?:\/\//, "")}
                      </a>
                    ) : null}
                  </p>
                ) : null}

                {item.bullets.length ? (
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[0.9375rem] leading-relaxed text-[#222]">
                    {item.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                ) : null}

                {item.tags.length ? (
                  <p className="mt-1.5 text-[0.8125rem] text-[#444]">
                    {item.tags.join(", ")}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
