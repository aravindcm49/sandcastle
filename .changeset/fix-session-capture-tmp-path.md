---
"@ai-hero/sandcastle": patch
---

Fix session capture. The `SessionStore` was looking for session JSONLs at `~/.claude/projects/<encoded>/sessions/<id>.jsonl`, but Claude Code actually writes them directly at `~/.claude/projects/<encoded>/<id>.jsonl`, so capture always failed with "Could not find the file". Host-side temp files used to stage the copy are now written to the OS temp dir instead of a sandbox-only path.
