#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const RULES_PATH = path.join(__dirname, "../skills/skill-rules.json");

function globToRegex(pattern) {
  const escaped = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "\x00")
    .replace(/\*/g, "[^/]*")
    .replace(/\x00/g, ".*");
  return new RegExp(escaped);
}

function main() {
  let input = "";
  process.stdin.on("data", (chunk) => (input += chunk));
  process.stdin.on("end", () => {
    try {
      const { tool_input = {} } = JSON.parse(input);
      const filePath = tool_input.file_path || "";

      if (!fs.existsSync(RULES_PATH)) return;
      const rules = JSON.parse(fs.readFileSync(RULES_PATH, "utf8"));

      const repoRoot = path.join(__dirname, "../../");
      const relPath = path.relative(repoRoot, filePath);

      const PRIORITY = { high: 0, medium: 1, low: 2 };
      const matches = [];

      for (const [name, rule] of Object.entries(rules)) {
        const filePaths = rule.filePaths || [];
        const matched = filePaths.some((pattern) =>
          globToRegex(pattern).test(relPath)
        );
        if (matched) {
          matches.push({ name, priority: rule.priority || "low" });
        }
      }

      if (matches.length === 0) return;

      matches.sort(
        (a, b) => (PRIORITY[a.priority] ?? 2) - (PRIORITY[b.priority] ?? 2)
      );
      const top = matches.slice(0, 2);

      const lines = top.map((m) => `> - \`${m.name}\``).join("\n");
      process.stdout.write(
        `> **Skills available for this file** (use \`Skill\` tool to load if needed):\n${lines}\n`
      );
    } catch {
      // Silently ignore parse errors
    }
  });
}

main();
