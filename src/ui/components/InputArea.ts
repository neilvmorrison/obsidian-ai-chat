import { setIcon } from "obsidian";
import { signal } from "../signals";
import type { ReadonlySignal } from "../signals";
import type { SelectOption } from "./primitives/Select";
import { iconButton } from "./primitives/IconButton";

export interface InputAreaConfig {
  /** Placeholder text shown in the textarea when empty. */
  placeholder?: string;
  /** Called with the trimmed text when the user submits a message. */
  onSend: (value: string) => void;
  /** Reactive flag — when true, the stop button replaces the send button. */
  isStreaming: ReadonlySignal<boolean>;
  /** Called when the user clicks the stop button. */
  onAbort: () => void;
  /** Pre-populated text value on mount. */
  initialValue?: string;
  /** When provided, a model <select> is rendered in the footer. */
  modelOptions?: SelectOption[];
  /** Reactive signal holding the selected model value. */
  selectedModel?: ReadonlySignal<string>;
  /** Called with the newly selected model value. */
  onModelChange?: (value: string) => void;
  /** When provided, an upload button appears in the footer. Called with chosen files. */
  onFilesChosen?: (files: File[]) => void;
}

/**
 * Composes a textarea, send/stop button, and optional model select.
 * Layout: `.oac-input-area__row` holds the textarea and action button (row, aligned to bottom).
 * When `modelOptions` is supplied, `.oac-input-area__footer` holds a model `<select>` at the left.
 * The send button is hidden while streaming; the stop button is shown instead.
 */
export function inputArea(
  container: HTMLElement,
  config: InputAreaConfig,
): void {
  const inputValue = signal(config.initialValue ?? "");

  const root = document.createElement("div");
  root.className = "oac-input-area";

  // ── Row: textarea + action button ────────────────────────
  const row = document.createElement("div");
  row.className = "oac-input-area__row";

  const ta = document.createElement("textarea");
  ta.className = "oac-textarea";
  ta.rows = 1;
  if (config.placeholder !== undefined) ta.placeholder = config.placeholder;
  if (config.initialValue !== undefined) ta.value = config.initialValue;
  ta.addEventListener("input", () => inputValue.set(ta.value));

  const sendBtn = document.createElement("button");
  sendBtn.className = "oac-icon-button";
  sendBtn.setAttribute("aria-label", "Send message");
  setIcon(sendBtn, "send");
  sendBtn.addEventListener("click", () => {
    const val = inputValue.get().trim();
    if (!val) return;
    config.onSend(val);
    inputValue.set("");
    ta.value = "";
  });

  const stopBtn = document.createElement("button");
  stopBtn.className = "oac-icon-button";
  stopBtn.setAttribute("aria-label", "Stop streaming");
  setIcon(stopBtn, "square");
  stopBtn.hidden = true;
  stopBtn.addEventListener("click", config.onAbort);

  config.isStreaming.subscribe((streaming) => {
    sendBtn.hidden = streaming;
    stopBtn.hidden = !streaming;
  });

  row.appendChild(ta);
  row.appendChild(sendBtn);
  row.appendChild(stopBtn);
  root.appendChild(row);

  // ── Footer: upload button + model select (both optional) ─
  if (config.onFilesChosen || (config.modelOptions && config.selectedModel && config.onModelChange)) {
    const footer = document.createElement("div");
    footer.className = "oac-input-area__footer";

    if (config.onFilesChosen) {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.multiple = true;
      fileInput.style.display = "none";
      fileInput.addEventListener("change", () => {
        const files = Array.from(fileInput.files ?? []);
        if (files.length > 0) config.onFilesChosen!(files);
        fileInput.value = "";
      });
      footer.appendChild(fileInput);

      const uploadBtn = iconButton(footer, {
        icon: "",
        label: "Upload files",
        onClick: () => fileInput.click(),
      });
      setIcon(uploadBtn, "upload");
    }

    if (config.modelOptions && config.selectedModel && config.onModelChange) {
      const sel = document.createElement("select");
      sel.className = "oac-select oac-model-select";

      for (const opt of config.modelOptions) {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        sel.appendChild(option);
      }

      sel.addEventListener("change", () => config.onModelChange!(sel.value));
      config.selectedModel.subscribe((val) => {
        sel.value = val;
      });

      footer.appendChild(sel);
    }

    root.appendChild(footer);
  }

  container.appendChild(root);
}
