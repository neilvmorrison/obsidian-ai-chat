import { useRef, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/ModelSelector";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  model: string;
  onModelChange: (model: string) => void;
  availableModels: string[];
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading = false,
  placeholder = "Ask anything...",
  model,
  onModelChange,
  availableModels,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit();
      }
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="chat:border-t chat:border-border chat:bg-background chat:p-3">
      <div
        className={cn(
          "chat:relative chat:flex chat:flex-col chat:gap-1",
          "chat:rounded-lg chat:border chat:border-border chat:bg-muted/50",
          "chat:p-2 chat:pr-12",
        )}
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          rows={1}
          className={cn(
            "chat:min-h-[36px] chat:max-h-[200px] chat:resize-none",
            "chat:border-0 chat:bg-transparent chat:shadow-none",
            "chat:p-1 chat:text-sm",
            "focus-visible:chat:ring-0",
          )}
        />
        <div className="chat:flex chat:items-center">
          <ModelSelector
            model={model}
            onModelChange={onModelChange}
            availableModels={availableModels}
          />
        </div>
        <div className="chat:absolute chat:bottom-2 chat:right-2">
          {isLoading ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={onStop}
              className="chat:rounded-full"
            >
              <Square className="chat:fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={onSubmit}
              disabled={!value.trim()}
              className="chat:rounded-full"
            >
              <ArrowUp className="h-8 w-8" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
