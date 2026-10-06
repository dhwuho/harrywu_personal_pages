/** Turn a pasted video link (or bare id) into the MDX component that embeds it. */
export function embedFromUrl(kind: 'youtube' | 'bilibili', input: string): string | null {
  const text = input.trim();
  if (kind === 'youtube') {
    const id =
      text.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/)?.[1] ??
      (/^[A-Za-z0-9_-]{11}$/.test(text) ? text : null);
    return id ? `<YouTube id="${id}" />` : null;
  }
  const bvid = text.match(/(BV[0-9A-Za-z]{10})/)?.[1];
  if (!bvid) return null;
  const page = Number(text.match(/[?&]p=(\d+)/)?.[1] ?? 1);
  return page > 1 ? `<Bilibili bvid="${bvid}" page={${page}} />` : `<Bilibili bvid="${bvid}" />`;
}
