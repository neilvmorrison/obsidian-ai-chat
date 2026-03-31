import { memo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Sparkles } from "lucide-react";

interface ISelectionToolbarProps {
  rect: DOMRect;
  onAskAI: () => void;
  onNewChat: () => void;
}

const TOOLBAR_HEIGHT = 40;
const TOOLBAR_OFFSET = 8;

export const SelectionToolbar = memo(function SelectionToolbar({
  rect,
  onAskAI,
  onNewChat,
}: ISelectionToolbarProps) {
  const top = rect.top - TOOLBAR_HEIGHT - TOOLBAR_OFFSET;
  const left = rect.left + rect.width / 2;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return createPortal(
    <div
      className="oac-selection-toolbar"
      style={{ top, left }}
      onMouseDown={handleMouseDown}
    >
      <Button size="sm" variant="default" onClick={onAskAI}>
        <Sparkles />
        Ask AI
      </Button>
      <Button size="sm" variant="outline" onClick={onNewChat}>
        <MessageSquarePlus />
        New Chat
      </Button>
    </div>,
    document.body
  );
});
