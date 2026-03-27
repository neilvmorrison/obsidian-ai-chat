import { useState, useCallback, useEffect, useRef } from "react";
import { PromptInput } from "@/components/PromptInput";
import { EmptyState } from "@/components/EmptyState";
import { BotIcon } from "@/components/BotIcon";
import { MessageList } from "@/components/MessageList";
import { TabBar } from "@/components/TabBar";
import { useStreamChat, DEFAULT_MODEL, type ChatMessage } from "@/hooks/useStreamChat";
import { generateTitle } from "@/utils/generateTitle";

interface Tab {
  id: string;
  title: string | null;
  messages: ChatMessage[];
  input: string;
  model: string;
}

function createTab(messages: ChatMessage[] = [], model: string = DEFAULT_MODEL): Tab {
  return {
    id: crypto.randomUUID(),
    title: null,
    messages,
    input: "",
    model,
  };
}

export interface AppProps {
  initialMessages?: ChatMessage[];
  initialModel?: string;
}

export function App({ initialMessages, initialModel }: AppProps) {
  const [tabs, setTabs] = useState<Tab[]>(() => [
    createTab(initialMessages ?? [], initialModel ?? DEFAULT_MODEL),
  ]);
  const [activeTabId, setActiveTabId] = useState(() => tabs[0].id);
  const stopRef = useRef<() => void>(() => {});

  const activeTab = tabs.find((t) => t.id === activeTabId)!;

  const setMessages = useCallback(
    (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, messages: typeof updater === "function" ? updater(t.messages) : updater }
            : t
        )
      );
    },
    [activeTabId]
  );

  const setInput = useCallback(
    (value: string) => {
      setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, input: value } : t)));
    },
    [activeTabId]
  );

  const setModel = useCallback(
    (value: string) => {
      setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, model: value } : t)));
    },
    [activeTabId]
  );

  const { handleSubmit, isLoading, stop, changeModel, availableModels } = useStreamChat({
    messages: activeTab.messages,
    setMessages,
    input: activeTab.input,
    setInput,
    model: activeTab.model,
    setModel,
  });

  stopRef.current = stop;

  const addTab = useCallback(() => {
    const tab = createTab();
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, []);

  const switchTab = useCallback(
    (id: string) => {
      if (id === activeTabId) return;
      stopRef.current();
      setActiveTabId(id);
    },
    [activeTabId]
  );

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        if (prev.length <= 1) return prev;
        const idx = prev.findIndex((t) => t.id === id);
        const next = prev.filter((t) => t.id !== id);
        if (id === activeTabId) {
          const newActive = next[Math.min(idx, next.length - 1)];
          setActiveTabId(newActive.id);
        }
        return next;
      });
      if (id === activeTabId) stopRef.current();
    },
    [activeTabId]
  );

  // Auto-title tab after first assistant response
  const prevIsLoading = useRef(isLoading);
  useEffect(() => {
    if (prevIsLoading.current && !isLoading && activeTab.title === null) {
      const hasAssistant = activeTab.messages.some((m) => m.role === "assistant" && m.content);
      if (hasAssistant) {
        const tabId = activeTabId;
        generateTitle(activeTab.messages, activeTab.model).then((title) => {
          setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, title } : t)));
        });
      }
    }
    prevIsLoading.current = isLoading;
  }, [isLoading, activeTab, activeTabId]);


  return (
    <div className="chat:flex chat:h-full chat:flex-col chat:bg-background chat:text-foreground chat:relative">
      <TabBar tabs={tabs} activeTabId={activeTabId} onSwitch={switchTab} onAdd={addTab} onClose={closeTab} />

      {activeTab.messages.length === 0 ? (
        <EmptyState>
          <div className="chat:flex chat:flex-col chat:gap-2 chat:items-center chat:justify-center">
            <BotIcon />
            <h1>Let's Chat!</h1>
          </div>
        </EmptyState>
      ) : (
        <MessageList messages={activeTab.messages} isLoading={isLoading} />
      )}
      <PromptInput
        value={activeTab.input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onStop={stop}
        isLoading={isLoading}
        model={activeTab.model}
        onModelChange={changeModel}
        availableModels={availableModels}
      />
    </div>
  );
}
