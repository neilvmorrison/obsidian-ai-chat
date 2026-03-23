import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createElement } from "react";
import { App, type AppProps } from "./components/App";
import { ObsidianAppProvider } from "./contexts/ObsidianAppContext";
import type { ChatMessage } from "./hooks/useStreamChat";

export const VIEW_TYPE = "react-view";

interface ChatViewState {
  initialMessages?: ChatMessage[];
  initialModel?: string;
}

export class ReactView extends ItemView {
  private root: Root | null = null;
  private chatState: ChatViewState = {};

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Chat";
  }

  getIcon(): string {
    return "bot-message-square";
  }

  async setState(state: ChatViewState, result: { history: boolean }): Promise<void> {
    this.chatState = state;
    await super.setState(state, result);
    // Re-render with new state if already open
    if (this.root) {
      this.renderApp();
    }
  }

  private renderApp() {
    const props: AppProps = {
      initialMessages: this.chatState.initialMessages,
      initialModel: this.chatState.initialModel,
    };
    this.root!.render(
      createElement(ObsidianAppProvider, { app: this.app, children: createElement(App, props) })
    );
  }

  async onOpen(): Promise<void> {
    this.root = createRoot(this.contentEl);
    this.renderApp();
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
  }
}
