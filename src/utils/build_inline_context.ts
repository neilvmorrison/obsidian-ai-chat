const HEADING_RE = /^#{1,6} .+/m;
const HEADING_SPLIT_RE = /^(#{1,6} .+)/m;

const SECTION_BODY_DEFAULT = 150;
const SECTION_BODY_CURRENT = 400;
const PROXIMITY_WINDOW = 400;

interface ISection {
  heading: string;
  body: string;
  start: number;
  end: number;
}

function parse_sections(content: string): ISection[] {
  const lines = content.split("\n");
  const sections: ISection[] = [];
  let current: ISection | null = null;
  let offset = 0;

  for (const line of lines) {
    const lineEnd = offset + line.length + 1;
    if (HEADING_SPLIT_RE.test(line)) {
      if (current) {
        current.end = offset;
        sections.push(current);
      }
      current = { heading: line, body: "", start: offset, end: lineEnd };
    } else if (current) {
      current.body += line + "\n";
    }
    offset = lineEnd;
  }

  if (current) {
    current.end = content.length;
    sections.push(current);
  }

  return sections;
}

function find_current_section(sections: ISection[], cursorOffset: number): number {
  let idx = -1;
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].start <= cursorOffset) {
      idx = i;
    }
  }
  return idx;
}

function build_section_digest(sections: ISection[], currentIdx: number): string {
  return sections
    .map((section, i) => {
      const limit = i === currentIdx ? SECTION_BODY_CURRENT : SECTION_BODY_DEFAULT;
      const body = section.body.trim().slice(0, limit);
      return body.length > 0 ? `${section.heading}\n${body}` : section.heading;
    })
    .join("\n\n");
}

export function build_inline_context(
  noteContent: string,
  cursorOffset: number,
  filename: string
): string {
  const parts: string[] = [];

  if (filename.length > 0) {
    parts.push(`You are writing inline in an Obsidian note titled "${filename}".`);
  }

  if (noteContent.length > 0 && HEADING_RE.test(noteContent)) {
    const sections = parse_sections(noteContent);
    if (sections.length > 0) {
      const currentIdx = find_current_section(sections, cursorOffset);
      parts.push(build_section_digest(sections, currentIdx));
    }
  }

  if (cursorOffset > 0 && noteContent.length > 0) {
    const windowStart = Math.max(0, cursorOffset - PROXIMITY_WINDOW);
    const window = noteContent.slice(windowStart, cursorOffset).trim();
    if (window.length > 0) {
      parts.push(window);
    }
  }

  parts.push("Continue writing inline, matching the tone and style of the existing content.");

  return parts.join("\n\n");
}
