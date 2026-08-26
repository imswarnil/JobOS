import {
  formatRange,
  type ResumeData,
  type ResumeLayoutConfig,
  type ResumeSection,
} from "@/lib/resume/schema";
import { cn } from "@/lib/utils";

/**
 * The document itself.
 *
 * Built for an ATS parser first and a human second, which turns out to be the
 * same set of constraints either way:
 *
 *   - One column. Real text. No tables, no text boxes, no icons carrying
 *     meaning — parsers read multi-column layouts in the wrong order or not
 *     at all. **This is why none of the three layouts is two-column**: the
 *     choice is density and emphasis, never structure.
 *   - Standard headings, rendered as headings.
 *   - Contact details as plain text in the body, never in a header element.
 *   - Deliberately monochrome: the accent that carries meaning everywhere
 *     else in JobOS would just be noise printed on A4.
 *
 * TODO(Phase 2): render this same tree through React-PDF so the export and
 * the preview cannot drift apart.
 */

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Figtree', ui-sans-serif, system-ui, sans-serif";

interface Skin {
  font: string;
  headerAlign: string;
  nameSize: string;
  sectionGap: string;
  itemGap: string;
  leading: string;
  body: string;
}

const SKINS: Record<ResumeLayoutConfig["style"], Skin> = {
  classic: {
    font: SERIF,
    headerAlign: "text-left",
    nameSize: "text-[1.75rem]",
    sectionGap: "mt-7",
    itemGap: "space-y-5",
    leading: "leading-relaxed",
    body: "text-[0.9375rem]",
  },
  modern: {
    font: SANS,
    headerAlign: "text-left",
    nameSize: "text-[1.625rem]",
    sectionGap: "mt-6",
    itemGap: "space-y-4",
    leading: "leading-relaxed",
    body: "text-[0.875rem]",
  },
  compact: {
    font: SANS,
    headerAlign: "text-left",
    nameSize: "text-[1.375rem]",
    sectionGap: "mt-4",
    itemGap: "space-y-3",
    leading: "leading-snug",
    body: "text-[0.8125rem]",
  },
};

export function ResumePreview({ data }: { data: ResumeData }) {
  const { basics, sections, layout } = data;
  const skin = SKINS[layout.style] ?? SKINS.classic;
  const nonEmpty = sections.filter((s) => s.items.length > 0);

  // Only the details the author chose, in the order they chose them.
  const contact = layout.header
    .filter((f) => f !== "links")
    .map((f) => basics[f])
    .filter(Boolean);
  const showLinks = layout.header.includes("links") && basics.links.length > 0;

  return (
    <article
      className={cn(
        // print-doc strips the on-screen framing when printing; the document
        // itself is unchanged, which is what keeps the PDF and the preview
        // from ever drifting apart.
        "print-doc mx-auto w-full max-w-[52rem] bg-white text-[#111] shadow-e2",
        layout.style === "compact"
          ? "px-9 py-9 sm:px-12 sm:py-10"
          : "px-10 py-12 sm:px-14 sm:py-14",
      )}
      style={{ fontFamily: skin.font }}
      aria-label="Resume preview"
    >
      <header className={cn("border-b border-[#ccc] pb-4", skin.headerAlign)}>
        <h1
          className={cn(
            skin.nameSize,
            "leading-tight font-bold tracking-[-0.01em]",
          )}
        >
          {basics.name || "Your name"}
        </h1>
        {basics.headline ? (
          <p className="mt-1 text-[1.0625rem] text-[#333]">{basics.headline}</p>
        ) : null}

        {contact.length || showLinks ? (
          <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-[#444]">
            {contact.join("  ·  ")}
            {contact.length && showLinks ? "  ·  " : ""}
            {showLinks
              ? basics.links.map((link, i) => (
                  <span key={link.id}>
                    {i > 0 ? "  ·  " : ""}
                    <a href={link.url} className="underline">
                      {link.label}
                    </a>
                  </span>
                ))
              : null}
          </p>
        ) : null}
      </header>

      {layout.showSummary && basics.summary ? (
        <p className={cn("mt-5 text-[#222]", skin.body, skin.leading)}>
          {basics.summary}
        </p>
      ) : null}

      {nonEmpty.length === 0 ? (
        <p className="mt-8 text-center text-[0.875rem] text-[#888] italic">
          Add an entry on the left and it appears here.
        </p>
      ) : null}

      {nonEmpty.map((section) => (
        <Section key={section.id} section={section} skin={skin} />
      ))}
    </article>
  );
}

function Section({ section, skin }: { section: ResumeSection; skin: Skin }) {
  return (
    <section className={cn("print-section", skin.sectionGap)}>
      <h2 className="border-b border-[#ccc] pb-1 text-[0.8125rem] font-bold tracking-[0.12em] text-[#000] uppercase">
        {section.title}
      </h2>

      {section.kind === "skills" ? (
        <dl className="mt-3 space-y-1.5">
          {section.items.map((item) => (
            <div
              key={item.id}
              className={cn("print-item flex flex-wrap gap-x-2", skin.body)}
            >
              <dt className="font-bold">{item.title}:</dt>
              <dd className="text-[#222]">
                {item.tags.length ? item.tags.join(", ") : item.subtitle}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className={cn("mt-3", skin.itemGap)}>
          {section.items.map((item) => {
            const range = formatRange(item);
            return (
              // print-item keeps a role and its bullets on one page — a
              // heading stranded at the foot of page one is the classic
              // resume printing bug.
              <div key={item.id} className="print-item">
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
                  <ul
                    className={cn(
                      "mt-1.5 list-disc space-y-1 pl-5 text-[#222]",
                      skin.body,
                      skin.leading,
                    )}
                  >
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
