---
"@ai-hero/sandcastle": patch
---

Add session capture and resume for Claude Code:

- **Capture:** after each iteration, the agent's session is saved to the host at `~/.claude/projects/<encoded>/sessions/<id>.jsonl` so it can be replayed or inspected locally with Claude Code's usual tooling. Adds `captureSessions` option to `claudeCode()` (default `true`) and `sessionFilePath` to `IterationResult`.
- **Resume:** adds `resumeSession` option to `run()` for continuing a prior Claude Code conversation in a new sandbox run. Incompatible with `maxIterations > 1`.
- Exposes the underlying `SessionStore` interface and `transferSession` helper for users who want to move sessions between the host and a sandbox directly.
