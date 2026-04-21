---
"@ai-hero/sandcastle": patch
---

Add `copyFileIn` and `copyFileOut` methods to `BindMountSandboxHandle` for moving individual files between the host and the sandbox. Docker uses `docker cp`, Podman uses `podman cp`, and the new `testBindMount()` provider uses a plain filesystem copy.
