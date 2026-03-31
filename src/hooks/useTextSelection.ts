import { useState, useEffect, useCallback, type RefObject } from "react";

interface ITextSelection {
  text: string;
  rect: DOMRect;
}

export function useTextSelection(containerRef: RefObject<HTMLDivElement>): ITextSelection | null {
  const [selection, setSelection] = useState<ITextSelection | null>(null);

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();

    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setSelection(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }

    const container = containerRef.current;
    if (!container) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);

    if (!element || !container.contains(element)) {
      setSelection(null);
      return;
    }

    setSelection({ text, rect: range.getBoundingClientRect() });
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [handleSelectionChange]);

  return selection;
}
