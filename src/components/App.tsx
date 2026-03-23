import { PromptInput } from "@/components/PromptInput";
import { EmptyState } from "@/components/EmptyState";
import { BotIcon } from "@/components/BotIcon";
import { MessageList } from "@/components/MessageList";
import { SaveChatButton } from "@/components/SaveChatButton";
import { useStreamChat, type ChatMessage } from "@/hooks/useStreamChat";

export interface AppProps {
  initialMessages?: ChatMessage[];
  initialModel?: string;
}

export function App({ initialMessages, initialModel }: AppProps) {
  const { messages, input, setInput, handleSubmit, isLoading, stop, model, setModel, availableModels } =
    useStreamChat({ initialMessages, initialModel });

  const hasAssistantMessage = messages.some((m) => m.role === "assistant" && m.content);

  return (
    <div className="chat:flex chat:h-full chat:flex-col chat:bg-background chat:text-foreground chat:relative">
      {hasAssistantMessage && (
        <SaveChatButton messages={messages} model={model} />
      )}
      {messages.length === 0 ? (
        <EmptyState>
          <div className="chat:flex chat:flex-col chat:gap-2 chat:items-center chat:justify-center">
            <BotIcon />
            <h1>Let's Chat!</h1>
          </div>
        </EmptyState>
      ) : (
        <MessageList messages={messages} isLoading={isLoading} />
      )}
      <PromptInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onStop={stop}
        isLoading={isLoading}
        model={model}
        onModelChange={setModel}
        availableModels={availableModels}
      />
    </div>
  );
}
