// Renders a single <script type="application/ld+json"> tag - the standard
// way to embed structured data for search engines. `data` always comes from
// one of seo.ts's own builders, never hand-authored inline, so a page's
// visible content and its structured data can't silently drift apart.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // JSON-LD requires a raw <script> body - `data` is always our own seo.ts
  // output (never user input), so there is no injection surface here.
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
