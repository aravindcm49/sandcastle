---
"@ai-hero/sandcastle": patch
---

Add `signal?: AbortSignal` to `InteractiveOptions` and `WorktreeInteractiveOptions` for cancelling an interactive session. Aborting mid-session kills the agent subprocess; the rejected promise surfaces `signal.reason` verbatim.
