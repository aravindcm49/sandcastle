import { run, claudeCode } from "@ai-hero/sandcastle";

// Blank template: customize this to build your own orchestration.
// Run this with: npx tsx .sandcastle/main.mts
// Or add to package.json scripts: "sandcastle": "npx tsx .sandcastle/main.mts"

await run({
  agent: claudeCode("claude-opus-4-6"),
  promptFile: "./.sandcastle/prompt.md",
});
