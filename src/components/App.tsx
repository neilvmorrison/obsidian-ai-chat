import { useState, useCallback, useEffect, useRef } from "react";
import { PromptInput } from "@/components/PromptInput";
import { EmptyState } from "@/components/EmptyState";
import { BotIcon } from "@/components/BotIcon";
import { MessageList } from "@/components/MessageList";
import { NoteContextBanner } from "@/components/NoteContextBanner";
import { TabBar } from "@/components/TabBar";
import { TokenUsageBar } from "@/components/TokenUsageBar";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import { AskAIModal } from "@/components/AskAIModal";
import { useStreamChat, DEFAULT_MODEL, type ChatMessage } from "@/hooks/useStreamChat";
import { useTextSelection } from "@/hooks/useTextSelection";
import { generateTitle } from "@/utils/generateTitle";
import { generate_context_summary } from "@/utils/generate_context_summary";
import { build_chat_context } from "@/utils/build_inline_context";
import type { INoteContext } from "@/view";

interface ITabNoteContext {
  filename: string;
  filePath: string;
}

interface ITab {
  id: string;
  title: string | null;
  messages: ChatMessage[];
  input: string;
  model: string;
  tokenUsage: number;
  autoSubmit?: boolean;
  pendingImage: string | null;
  noteContext?: ITabNoteContext;
}

function createTab(messages: ChatMessage[] = [], model: string = DEFAULT_MODEL): ITab {
  return {
    id: crypto.randomUUID(),
    title: null,
    messages,
    input: "",
    model,
    tokenUsage: 0,
    pendingImage: null,
  };
}

export interface IAppProps {
  initialMessages?: ChatMessage[];
  initialModel?: string;
  initialInput?: string;
  noteContext?: INoteContext;
  tokenLimit?: number;
}

export function App({ initialMessages, initialModel, initialInput, noteContext, tokenLimit = 8192 }: IAppProps) {
  const [tabs, setTabs] = useState<ITab[]>(() => [
    createTab(initialMessages ?? [], initialModel ?? DEFAULT_MODEL),
  ]);
  const [activeTabId, setActiveTabId] = useState(() => tabs[0].id);
  const [askAISelectedText, setAskAISelectedText] = useState<string | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const messageListRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const selection = useTextSelection(messageListRef);

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

  const setTokenUsage = useCallback(
    (value: number) => {
      setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, tokenUsage: value } : t)));
    },
    [activeTabId]
  );

  const setPendingImage = useCallback(
    (value: string | null) => {
      setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, pendingImage: value } : t)));
    },
    [activeTabId]
  );

  const { handleSubmit, isLoading, stop, changeModel, availableModels } = useStreamChat({
    messages: activeTab?.messages ?? [],
    setMessages,
    input: activeTab?.input ?? "",
    setInput,
    model: activeTab?.model ?? DEFAULT_MODEL,
    setModel,
    setTokenUsage,
    pendingImage: activeTab?.pendingImage ?? null,
    setPendingImage,
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
      if (id === activeTabId) stopRef.current();
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (id === activeTabId) {
          if (next.length > 0) {
            const idx = prev.findIndex((t) => t.id === id);
            setActiveTabId(next[Math.min(idx, next.length - 1)].id);
          } else {
            setActiveTabId("");
          }
        }
        return next;
      });
    },
    [activeTabId]
  );

  const prevInitialInput = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!initialInput || initialInput === prevInitialInput.current) return;
    prevInitialInput.current = initialInput;
    if (!activeTab || activeTab.messages.length > 0) {
      const tab = { ...createTab(), input: initialInput };
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
    } else {
      setInput(initialInput);
    }
  }, [initialInput, activeTab?.messages.length, setInput]);

  const prevNoteContextKey = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!noteContext || noteContext.key === prevNoteContextKey.current) return;
    prevNoteContextKey.current = noteContext.key;
    const systemContent = build_chat_context(
      noteContext.noteContent,
      noteContext.cursorOffset,
      noteContext.filename,
    );
    const systemMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "system",
      content: systemContent,
    };
    const tab: ITab = {
      ...createTab([systemMsg], DEFAULT_MODEL),
      noteContext: { filename: noteContext.filename, filePath: noteContext.filePath },
    };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, [noteContext]);

  const prevIsLoading = useRef(isLoading);
  useEffect(() => {
    if (!activeTab) return;
    if (prevIsLoading.current && !isLoading && activeTab.title === null) {
      const hasAssistant = activeTab.messages.some((m) => m.role === "assistant" && m.content);
      if (hasAssistant) {
        const tabId = activeTabId;
        generateTitle(activeTab.messages).then((title) => {
          setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, title } : t)));
        });
      }
    }
    prevIsLoading.current = isLoading;
  }, [isLoading, activeTab, activeTabId]);

  useEffect(() => {
    if (!activeTab?.autoSubmit || isLoading) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, autoSubmit: false } : t))
    );
    handleSubmit();
  }, [activeTab?.autoSubmit, activeTabId, isLoading, handleSubmit]);

  const handleAskAI = useCallback(() => {
    if (!selection) return;
    window.getSelection()?.removeAllRanges();
    setAskAISelectedText(selection.text);
  }, [selection]);

  const handleNewChat = useCallback(async () => {
    if (!selection || !activeTab) return;
    const { text } = selection;
    window.getSelection()?.removeAllRanges();
    const summary = await generate_context_summary(activeTab.messages, activeTab.model, text);
    const systemMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "system",
      content: summary,
    };
    const tab: ITab = {
      ...createTab([systemMsg], activeTab.model),
      input: text,
      autoSubmit: true,
    };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, [selection, activeTab]);

  const handleContinueInNewChat = useCallback(
    (messages: ChatMessage[]) => {
      setAskAISelectedText(null);
      const tab = createTab(messages, activeTab?.model ?? DEFAULT_MODEL);
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
    },
    [activeTab?.model]
  );

  const handleCloseModal = useCallback(() => {
    setAskAISelectedText(null);
  }, []);

  return (
    <div className="chat:flex chat:h-full chat:flex-col chat:bg-background chat:text-foreground chat:relative">
      {tabs.length >= 1 && (
        <TabBar tabs={tabs} activeTabId={activeTabId} onSwitch={switchTab} onAdd={addTab} onClose={closeTab} />
      )}

      {tabs.length === 0 ? (
        <EmptyState>
          <div className="chat:flex chat:flex-col chat:gap-4 chat:items-center chat:justify-center">
            <BotIcon />
            <h1>Let's Chat!</h1>
            <button
              className="chat:px-4 chat:py-2 chat:rounded-md chat:text-sm chat:font-medium chat:bg-[--interactive-accent] chat:text-[--text-on-accent] chat:cursor-pointer chat:border-0 chat:hover:opacity-90"
              onClick={addTab}
            >
              New Chat
            </button>
          </div>
        </EmptyState>
      ) : (
        <>
          {activeTab?.noteContext && (
            <NoteContextBanner
              filename={activeTab.noteContext.filename}
              filePath={activeTab.noteContext.filePath}
            />
          )}
          {(activeTab?.messages.filter((m) => m.role !== "system").length ?? 0) === 0 ? (
            <EmptyState>
              <div className="chat:flex chat:flex-col chat:gap-2 chat:items-center chat:justify-center">
                <BotIcon />
                <h1>Let's Chat!</h1>
              </div>
            </EmptyState>
          ) : (
            <MessageList ref={messageListRef} messages={activeTab!.messages} isLoading={isLoading} />
          )}
          {(activeTab?.messages.filter((m) => m.role !== "system").length ?? 0) > 0 && (
            <TokenUsageBar tokenUsage={activeTab!.tokenUsage} tokenLimit={tokenLimit} />
          )}
          <PromptInput
            value={activeTab?.input ?? ""}
            onChange={setInput}
            onSubmit={handleSubmit}
            onStop={stop}
            isLoading={isLoading}
            model={activeTab?.model ?? DEFAULT_MODEL}
            onModelChange={changeModel}
            availableModels={availableModels}
            selectedImage={activeTab?.pendingImage ?? null}
            onImageSelect={setPendingImage}
          />

          {selection && !askAISelectedText && (
            <SelectionToolbar
              rect={selection.rect}
              onAskAI={handleAskAI}
              onNewChat={handleNewChat}
            />
          )}

          {askAISelectedText && (
            <AskAIModal
              selectedText={askAISelectedText}
              contextMessages={activeTab?.messages ?? []}
              model={activeTab?.model ?? DEFAULT_MODEL}
              onClose={handleCloseModal}
              onContinueInNewChat={handleContinueInNewChat}
            />
          )}
        </>
      )}
    </div>
  );
}
