export type IContentSegment =
  | { type: "text"; content: string }
  | { type: "thinking"; content: string; isStreaming: boolean };

const OPEN_TAG = "<think>";
const CLOSE_TAG = "</think>";

export function parse_thinking_content(raw: string): IContentSegment[] {
  const segments: IContentSegment[] = [];
  let cursor = 0;

  while (cursor < raw.length) {
    const openIdx = raw.indexOf(OPEN_TAG, cursor);

    if (openIdx === -1) {
      const tail = raw.slice(cursor);
      if (tail) segments.push({ type: "text", content: tail });
      break;
    }

    if (openIdx > cursor) {
      segments.push({ type: "text", content: raw.slice(cursor, openIdx) });
    }

    const contentStart = openIdx + OPEN_TAG.length;
    const closeIdx = raw.indexOf(CLOSE_TAG, contentStart);

    if (closeIdx === -1) {
      segments.push({
        type: "thinking",
        content: raw.slice(contentStart),
        isStreaming: true,
      });
      break;
    }

    segments.push({
      type: "thinking",
      content: raw.slice(contentStart, closeIdx),
      isStreaming: false,
    });

    cursor = closeIdx + CLOSE_TAG.length;
  }

  return segments.filter((s) => s.content.trim().length > 0);
}
