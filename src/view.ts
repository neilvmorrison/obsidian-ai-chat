import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createElement } from "react";
import { App, type IAppProps } from "./components/App";
import { ObsidianAppProvider } from "./contexts/ObsidianAppContext";
import type { ChatMessage } from "./hooks/useStreamChat";
import type ReactPlugin from "./main";

export const VIEW_TYPE = "react-view";

export interface INoteContext {
  key: string;
  noteContent: string;
  cursorOffset: number;
  filename: string;
  filePath: string;
}

interface ChatViewState {
  initialMessages?: ChatMessage[];
  initialModel?: string;
  initialInput?: string;
  noteContext?: INoteContext;
}

export class ReactView extends ItemView {
  private root: Root | null = null;
  private chatState: ChatViewState = {};

  constructor(leaf: WorkspaceLeaf, private plugin: ReactPlugin) {
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

  renderApp() {
    const props: IAppProps = {
      initialMessages: this.chatState.initialMessages,
      initialModel: this.chatState.initialModel,
      initialInput: this.chatState.initialInput,
      noteContext: this.chatState.noteContext,
      tokenLimit: this.plugin.settings.tokenLimit,
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
