// Minimal runtime stub. Tests override this via vi.mock('obsidian', factory).

/** Creates a plain HTMLElement augmented with Obsidian's helper methods. */
function makeObsidianEl(tagName = 'div'): HTMLElement {
  const el = document.createElement(tagName);
  (el as any).empty = function () {
    while (this.firstChild) this.removeChild(this.firstChild);
  };
  (el as any).addClass = function (cls: string) {
    this.classList.add(cls);
  };
  (el as any).removeClass = function (cls: string) {
    this.classList.remove(cls);
  };
  (el as any).hasClass = function (cls: string) {
    return this.classList.contains(cls);
  };
  (el as any).setText = function (text: string) {
    this.textContent = text;
  };
  return el;
}

export class WorkspaceLeaf {
  setViewState(_state: unknown): Promise<void> { return Promise.resolve(); }
  detach(): void {}
}

export class ItemView {
  containerEl: HTMLElement;
  contentEl: HTMLElement;
  leaf: WorkspaceLeaf;
  app: App;

  constructor(leaf: WorkspaceLeaf) {
    this.leaf = leaf;
    this.app = new App();
    this.containerEl = makeObsidianEl();
    this.containerEl.appendChild(makeObsidianEl()); // children[0] — header slot
    this.contentEl = makeObsidianEl();
    this.containerEl.appendChild(this.contentEl);   // children[1] — content slot
  }

  getViewType(): string { return ''; }
  getDisplayText(): string { return ''; }
  getIcon(): string { return ''; }
  async onOpen(): Promise<void> {}
  async onClose(): Promise<void> {}
}

export class Plugin {
  app: App = new App();
  registerView(_type: string, _creator: unknown): void {}
  addRibbonIcon(_icon: string, _title: string, _cb: () => void): HTMLElement { return makeObsidianEl(); }
  addSettingTab(_tab: unknown): void {}
  addCommand(_cmd: unknown): void {}
  registerEditorSuggest(_suggest: unknown): void {}
  loadData(): Promise<unknown> { return Promise.resolve(null); }
  saveData(_data: unknown): Promise<void> { return Promise.resolve(); }
}
export class PluginSettingTab {
  containerEl = { empty: () => {} };
  constructor(_app: unknown, _plugin: unknown) {}
}
export class Setting {
  constructor(_el: unknown) {}
  setName(_n: string) { return this; }
  setDesc(_d: string) { return this; }
  setHeading() { return this; }
  addText(_cb: unknown) { return this; }
  addToggle(_cb: unknown) { return this; }
  addDropdown(_cb: unknown) { return this; }
  addButton(_cb: unknown) { return this; }
}
export class Modal {
  contentEl = { empty: () => {}, createEl: () => ({}) };
  constructor(_app: unknown) {}
  open() {}
  close() {}
}
export class EditorSuggest<T = unknown> {
  context: { editor: any; file: any; start: any; end: any; query: string } | null = null;
  constructor(_app: App) {}
  onTrigger(_cursor: any, _editor: any, _file: any): any { return null; }
  getSuggestions(_ctx: any): T[] { return []; }
  renderSuggestion(_value: T, _el: HTMLElement): void {}
  async selectSuggestion(_value: T, _evt: any): Promise<void> {}
}

export function setIcon(el: HTMLElement, iconId: string): void {
  el.setAttribute('data-icon', iconId);
}

export class Notice {
  constructor(_message: string, _timeout?: number) {}
}

export class TFile {
  path: string;
  name: string;
  constructor(path = '', name = '') {
    this.path = path;
    this.name = name;
  }
}

export class App {
  workspace = {
    getLeavesOfType: (_type: string): WorkspaceLeaf[] => [],
    getRightLeaf: (_newLeaf: boolean): WorkspaceLeaf | null => new WorkspaceLeaf(),
    revealLeaf: (_leaf: WorkspaceLeaf): void => {},
    detachLeavesOfType: (_type: string): void => {},
  };
}
