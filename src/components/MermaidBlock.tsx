import { useEffect, useRef, useState } from "react";

let mermaidModule: typeof import("mermaid") | null = null;
let mermaidInitialized = false;
let idCounter = 0;

export function MermaidBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        if (!mermaidModule) {
          mermaidModule = await import("mermaid");
        }
        if (!mermaidInitialized) {
          mermaidModule.default.initialize({
            startOnLoad: false,
            theme: "neutral",
            securityLevel: "loose",
          });
          mermaidInitialized = true;
        }

        const id = `mermaid-${idCounter++}`;
        const { svg: rendered } = await mermaidModule.default.render(id, code);
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <pre className="oac-message__code-block">
        <code>{code}</code>
      </pre>
    );
  }

  if (!svg) {
    return <div className="oac-mermaid-loading">Rendering diagram...</div>;
  }

  return (
    <div
      ref={containerRef}
      className="oac-mermaid"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
