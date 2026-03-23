import { useState } from "react";
import { Save, Check, Loader2 } from "lucide-react";
import { useObsidianApp } from "@/contexts/ObsidianAppContext";
import { generateTitle } from "@/utils/generateTitle";
import { saveChat } from "@/utils/saveChat";
import type { ChatMessage } from "@/hooks/useStreamChat";
import { Button } from "@/components/ui/button";

interface SaveChatButtonProps {
  messages: ChatMessage[];
  model: string;
}

export function SaveChatButton({ messages, model }: SaveChatButtonProps) {
  const app = useObsidianApp();
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  async function handleSave() {
    if (state !== "idle") return;
    setState("saving");
    try {
      const title = await generateTitle(messages, model);
      await saveChat(app, messages, model, title);
      setState("saved");
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("Failed to save chat:", err);
      setState("idle");
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="chat:absolute chat:top-2 chat:right-2 chat:z-10 chat:h-8 chat:w-8"
      onClick={handleSave}
      disabled={state === "saving"}
      title="Save chat"
    >
      {state === "saving" && <Loader2 className="chat:h-4 chat:w-4 chat:animate-spin" />}
      {state === "saved" && <Check className="chat:h-4 chat:w-4" />}
      {state === "idle" && <Save className="chat:h-4 chat:w-4" />}
    </Button>
  );
}
