---
"@ai-hero/sandcastle": patch
---

Fix Windows paths breaking Docker/Podman volume mounts. Normalize backslashes to forward slashes in mount host paths and remap Windows-style sandbox paths to valid POSIX paths before they reach providers. Extract duplicated mount utilities (`defaultImageName`, `expandTilde`, `resolveHostPath`, `resolveSandboxPath`, `resolveUserMounts`) from Docker and Podman providers into a shared `mountUtils` module. `defaultImageName` now handles both `/` and `\` path separators. `expandTilde` now handles `~\` (Windows tilde paths).
