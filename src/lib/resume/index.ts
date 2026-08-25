/**
 * RESUME EXPORT SEAM — Phase 2
 * ============================
 *
 * The export target is an ATS parser, not a human eye. That constraint drives
 * every decision here and is worth writing down before any code exists:
 *
 *   - Real text in a single column. No tables, no text boxes, no multi-column
 *     layouts — parsers read them in the wrong order or not at all.
 *   - Standard section headings ("Experience", "Education", "Skills").
 *     Clever names get dropped on the floor.
 *   - No icons, no images, nothing important in a header or footer.
 *   - Embedded, selectable fonts. A resume rendered as an image scores zero.
 *
 * TODO(Phase 2): implement with React-PDF (@react-pdf/renderer) so the
 * template is JSX and shares the token vocabulary with the on-screen preview.
 */

export interface GeneratePdfOptions {
  /** The resume payload — `resume_master.data` or a `resume_version.data`. */
  data: unknown;
  /** Filename offered to the browser, without the extension. */
  filename?: string;
  /** Reserved for a second template. Only `ats` will exist in Phase 2. */
  template?: "ats";
}

/** Returns the rendered PDF bytes, ready to stream from a route handler. */
export async function generatePdf(
  _options: GeneratePdfOptions,
): Promise<Uint8Array> {
  throw new Error("Not implemented until Phase 2.");
}
