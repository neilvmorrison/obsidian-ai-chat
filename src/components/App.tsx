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
        <div className="chat:flex chat:flex-col chat:gap-2 chat:items-center chat:justify-center">
          <BotIcon />
          <h1>Let's Chat!</h1>
        </div>
      </EmptyState>
      <PromptInput value={input} onChange={setInput} onSubmit={handleSubmit} />
    </div>
  );
}
