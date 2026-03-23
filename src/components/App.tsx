import { useState } from "react";
import { PromptInput } from "@/components/PromptInput";
import { EmptyState } from "@/components/EmptyState";
import { BotIcon } from "@/components/BotIcon";

export function App() {
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (!input.trim()) return;
    // TODO: send message to AI
    setInput("");
  };

  return (
    <div className="chat:flex chat:h-full chat:flex-col chat:bg-background chat:text-foreground">
      <EmptyState>
        <BotIcon />
      </EmptyState>
      <PromptInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
