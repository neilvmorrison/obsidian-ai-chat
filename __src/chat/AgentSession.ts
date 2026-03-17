import { requestUrl } from "obsidian";
import type { Vault } from "obsidian";
import type { OllamaChatSettings } from "../settings";

// ─── Ollama Native API Types ──────────────────────────────────────────────────

interface OllamaToolParameter {
  type: string;
  description: string;
}

interface OllamaTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, OllamaToolParameter>;
      required: string[];
    };
  };
}

interface ToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

type AgentMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: ToolCall[] }
  | { role: "tool"; content: string };

interface OllamaChatResponse {
  message: {
    role: "assistant";
    content: string;
    tool_calls?: ToolCall[];
  };
}

/** Callback injected by the caller to approve/deny each tool execution. */
export type ToolConfirmFn = (
  toolName: string,
  params: Record<string, unknown>,
) => Promise<boolean>;

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const TOOLS: OllamaTool[] = [
  {
    type: "function",
    function: {
      name: "create_folder",
      description:
        "Creates a new folder in the Obsidian vault. " +
        "Call this before create_note whenever the parent folder may not exist. " +
        "If the folder already exists the operation is a safe no-op. " +
        "Use forward slashes for nested paths, e.g. 'Projects/2024/Research'.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "Vault-relative folder path with no trailing slash, e.g. 'Projects/Research'.",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description:
        "Creates a new Markdown note in the Obsidian vault. " +
        "The path MUST end in '.md'. " +
        "The parent folder must already exist — call create_folder first if needed. " +
        "Returns an error if the file already exists; choose a different name instead of overwriting.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "Vault-relative file path ending in .md, e.g. 'Projects/Research/overview.md'.",
          },
          content: {
            type: "string",
            description:
              "Full Markdown content for the note. Use proper Markdown headings, lists, etc.",
          },
        },
        required: ["path", "content"],
      },
    },
  },
];

const MAX_TURNS = 6;

// ─── AgentSession ─────────────────────────────────────────────────────────────

export class AgentSession {
  private vault: Vault;
  private settings: OllamaChatSettings;
  private confirmFn: ToolConfirmFn;
  private history: AgentMessage[] = [];

  constructor(
    vault: Vault,
    settings: OllamaChatSettings,
    confirmFn?: ToolConfirmFn,
  ) {
    this.vault = vault;
    this.settings = settings;
    // Default: native browser confirm (replace via constructor arg for Obsidian Modal)
    this.confirmFn =
      confirmFn ??
      ((toolName, params) => {
        const summary = Object.entries(params)
          .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
          .join("\n");
        return Promise.resolve(
          confirm(`AI wants to run:\n\n${toolName}\n\n${summary}\n\nAllow?`),
        );
      });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Run the agentic loop for a user prompt. Returns the final LLM reply. */
  async runAgent(userPrompt: string): Promise<string> {
    const systemPrompt = this.settings.agentSystemPrompt.trim();
    if (systemPrompt && this.history.length === 0) {
      this.history.push({ role: "system", content: systemPrompt });
    }

    this.history.push({ role: "user", content: userPrompt });

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await this.callOllama(this.history);
      const msg = response.message;

      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        this.history.push({ role: "assistant", content: msg.content });
        return msg.content;
      }

      // Record the assistant turn with its tool calls
      this.history.push({
        role: "assistant",
        content: msg.content,
        tool_calls: msg.tool_calls,
      });

      // Execute every tool call in this turn and collect results
      for (const call of msg.tool_calls) {
        const result = await this.dispatchTool(call);
        this.history.push({ role: "tool", content: result });
      }
      // Loop: send results back and let the model continue
    }

    return "Agent reached the maximum number of steps without completing. Try a simpler instruction.";
  }

  /** Clear conversation history for a fresh session. */
  reset(): void {
    this.history = [];
  }

  // ── Ollama HTTP ─────────────────────────────────────────────────────────────

  private chatUrl(): string {
    return this.settings.baseURL.replace(/\/?$/, "") + "/chat";
  }

  private async callOllama(
    messages: AgentMessage[],
  ): Promise<OllamaChatResponse> {
    const model = this.settings.agentModel.trim() || this.settings.model;

    let response;
    try {
      response = await requestUrl({
        url: this.chatUrl(),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, tools: TOOLS, stream: false }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("net::ERR_CONNECTION_REFUSED") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("fetch")
      ) {
        throw new Error("Ollama is not running. Start Ollama and try again.");
      }
      throw err;
    }

    if (response.status === 404) {
      const body = response.json as { error?: string } | undefined;
      if (body?.error?.toLowerCase().includes("model")) {
        throw new Error(
          `Model '${model}' not found. Run: ollama pull ${model}`,
        );
      }
    }

    if (response.status !== 200) {
      throw new Error(`Ollama returned HTTP ${response.status}: ${response.text}`);
    }

    return response.json as OllamaChatResponse;
  }

  // ── Tool Dispatcher ─────────────────────────────────────────────────────────

  private async dispatchTool(call: ToolCall): Promise<string> {
    const { name, arguments: args } = call.function;

    const confirmed = await this.confirmFn(name, args);
    if (!confirmed) {
      return `User denied '${name}'. Do not retry this action.`;
    }

    try {
      switch (name) {
        case "create_folder":
          return await this.toolCreateFolder(args);
        case "create_note":
          return await this.toolCreateNote(args);
        default:
          return `Unknown tool '${name}'.`;
      }
    } catch (err) {
      return `Error in '${name}': ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  private async toolCreateFolder(
    args: Record<string, unknown>,
  ): Promise<string> {
    const path = String(args.path ?? "").trim();
    if (!path) return "Error: 'path' is required.";
    if (this.vault.getAbstractFileByPath(path)) {
      return `Folder '${path}' already exists.`;
    }
    await this.vault.createFolder(path);
    return `Folder '${path}' created.`;
  }

  private async toolCreateNote(
    args: Record<string, unknown>,
  ): Promise<string> {
    const path = String(args.path ?? "").trim();
    const content = String(args.content ?? "");
    if (!path) return "Error: 'path' is required.";
    if (!path.endsWith(".md")) return "Error: path must end in '.md'.";
    if (this.vault.getAbstractFileByPath(path)) {
      return `Error: '${path}' already exists. Use a different filename.`;
    }
    await this.vault.create(path, content);
    return `Note '${path}' created.`;
  }
}
