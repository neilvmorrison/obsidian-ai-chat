#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const RULES_PATH = path.join(__dirname, "../skills/skill-rules.json");

function main() {
  let input = "";
  process.stdin.on("data", (chunk) => (input += chunk));
  process.stdin.on("end", () => {
    try {
      const { prompt = "" } = JSON.parse(input);
      const lowerPrompt = prompt.toLowerCase();

      if (!fs.existsSync(RULES_PATH)) return;
      const rules = JSON.parse(fs.readFileSync(RULES_PATH, "utf8"));

      const PRIORITY = { high: 0, medium: 1, low: 2 };
      const matches = [];

      for (const [name, rule] of Object.entries(rules)) {
        const { keywords = [], intentPatterns = [] } =
          rule.promptTriggers || {};

        const keywordMatch = keywords.some((kw) =>
          lowerPrompt.includes(kw.toLowerCase())
        );
        const intentMatch = intentPatterns.some((pattern) =>
          new RegExp(pattern, "i").test(lowerPrompt)
        );

        if (keywordMatch || intentMatch) {
          matches.push({ name, priority: rule.priority || "low" });
        }
      }

      if (matches.length === 0) return;

      matches.sort(
        (a, b) => (PRIORITY[a.priority] ?? 2) - (PRIORITY[b.priority] ?? 2)
      );
      const top = matches.slice(0, 3);

      const lines = top.map((m) => `> - \`${m.name}\``).join("\n");
      process.stdout.write(
        `> **Skills available for this task** (use \`Skill\` tool to load if needed):\n${lines}\n`
      );
    } catch {
      // Silently ignore parse errors
    }
  });
}

main();
