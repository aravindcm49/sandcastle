---
"@ai-hero/sandcastle": patch
---

**Breaking:** Replace `RunResult.iterationsRun` with `RunResult.iterations: IterationResult[]`. Each `IterationResult` carries an optional `sessionId` extracted from Claude Code's stream-json init line. Consumers needing the iteration count should read `iterations.length`. Non-Claude agent providers produce `sessionId: undefined`. The same change applies to `OrchestrateResult`, `SandboxRunResult`, and `WorktreeRunResult`.
