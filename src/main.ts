import { Plugin, WorkspaceLeaf } from "obsidian";
import { ReactView, VIEW_TYPE } from "./view";

export default class ReactPlugin extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE, (leaf) => new ReactView(leaf));

    this.addRibbonIcon("bot-message-square", "Open React View", () => {
      this.activateView();
    });
  }

  async activateView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null =
      workspace.getLeavesOfType(VIEW_TYPE)[0] ?? null;

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({ type: VIEW_TYPE, active: true });
        leaf = rightLeaf;
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
}
