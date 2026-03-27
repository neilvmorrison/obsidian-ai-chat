import { SaveChatButton } from "@/components/SaveChatButton";
import type { ChatMessage } from "@/hooks/useStreamChat";

interface Tab {
  id: string;
  title: string | null;
  messages: ChatMessage[];
  model: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onClose: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSwitch, onAdd, onClose }: TabBarProps) {
  return (
    <div className="oac-tab-bar">
      <div className="oac-tab-bar__scroll">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          const hasAssistantMessage = isActive && tab.messages.some((m) => m.role === "assistant" && m.content);
          return (
            <button
              key={tab.id}
              className={`oac-tab-bar__tab${isActive ? " oac-tab-bar__tab--active" : ""}`}
              onClick={() => onSwitch(tab.id)}
            >
              {tab.title ?? `Chat ${index + 1}`}
              {hasAssistantMessage && (
                <span className="oac-tab-bar__save" onClick={(e) => e.stopPropagation()}>
                  <SaveChatButton messages={tab.messages} model={tab.model} />
                </span>
              )}
              {tabs.length > 1 && (
                <span
                  className="oac-tab-bar__close"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab.id);
                  }}
                  aria-label="Close tab"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button className="oac-icon-button" onClick={onAdd} aria-label="New chat">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}
