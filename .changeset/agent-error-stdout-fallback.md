---
"@ai-hero/sandcastle": patch
---

Surface agent error details in `AgentError` when stderr is empty. Error events emitted to stdout by Codex and Pi, plus OpenCode's result text, are now parsed and included in the error message instead of being dropped.
