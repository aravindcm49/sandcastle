/**
 * Shared mount utilities for Docker and Podman sandbox providers.
 *
 * Handles host/sandbox path resolution, tilde expansion, user mount
 * validation, image naming, and Windows path normalization.
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";
import type { MountConfig } from "./MountConfig.js";
import { SANDBOX_REPO_DIR } from "./SandboxFactory.js";

/**
 * Derive the default image name from the repo directory.
 * Returns `sandcastle:<dir-name>` where dir-name is the last path segment,
 * lowercased and sanitized for image tag rules.
 *
 * Handles both POSIX (`/`) and Windows (`\`) path separators.
 */
export const defaultImageName = (repoDir: string): string => {
  const dirName =
    repoDir
      .replace(/[\\/]+$/, "")
      .split(/[\\/]/)
      .pop() ?? "local";
  const sanitized = dirName.toLowerCase().replace(/[^a-z0-9_.-]/g, "-");
  return `sandcastle:${sanitized || "local"}`;
};

/**
 * Expand tilde (`~`) to the user's home directory.
 * Handles both `~/path` (POSIX) and `~\path` (Windows).
 */
export const expandTilde = (p: string): string => {
  if (p === "~") return homedir();
  if (p.startsWith("~/") || p.startsWith("~\\"))
    return homedir() + "/" + p.slice(2);
  return p;
};

/**
 * Resolve a host path: expand tilde, then resolve relative paths from `process.cwd()`.
 */
export const resolveHostPath = (hostPath: string): string => {
  const expanded = expandTilde(hostPath);
  return isAbsolute(expanded) ? expanded : resolve(process.cwd(), expanded);
};

/**
 * Resolve a sandbox path: relative paths are resolved from `SANDBOX_REPO_DIR`.
 */
export const resolveSandboxPath = (sandboxPath: string): string =>
  isAbsolute(sandboxPath)
    ? sandboxPath
    : resolve(SANDBOX_REPO_DIR, sandboxPath);

/**
 * Resolve and validate user-provided mount configurations.
 * Throws if a hostPath does not exist on the filesystem.
 */
export const resolveUserMounts = (
  mounts: readonly MountConfig[],
): Array<{ hostPath: string; sandboxPath: string; readonly?: boolean }> =>
  mounts.map((m) => {
    const resolvedHostPath = resolveHostPath(m.hostPath);

    if (!existsSync(resolvedHostPath)) {
      throw new Error(
        `Mount hostPath does not exist: ${m.hostPath}` +
          (m.hostPath !== resolvedHostPath
            ? ` (resolved to ${resolvedHostPath})`
            : ""),
      );
    }

    return {
      hostPath: resolvedHostPath,
      sandboxPath: resolveSandboxPath(m.sandboxPath),
      ...(m.readonly ? { readonly: true } : {}),
    };
  });

/**
 * Normalize mount entries for cross-platform compatibility.
 *
 * On Windows (`platform === "win32"`):
 * - Replaces backslashes with forward slashes in all `hostPath` values
 * - Remaps `sandboxPath` values that look like Windows paths to valid POSIX
 *   paths relative to `sandboxRepoDir` when the host path is under the
 *   worktree host path
 *
 * On non-Windows platforms, returns mounts unchanged (preserving
 * `sandboxPath === hostPath` for git mounts so that `gitdir:` references
 * resolve correctly inside the container).
 *
 * This is a pure function — no filesystem access, accepts a `platform`
 * parameter so it can be unit-tested with fake Windows paths.
 */
export const normalizeMounts = <
  M extends { hostPath: string; sandboxPath: string },
>(
  mounts: M[],
  worktreeHostPath: string,
  sandboxRepoDir: string,
  platform: string = process.platform,
): M[] => {
  if (platform !== "win32") return mounts;

  const normalizedWorktree = worktreeHostPath.replace(/\\/g, "/");

  return mounts.map((m) => {
    const hostPath = m.hostPath.replace(/\\/g, "/");
    let sandboxPath = m.sandboxPath;

    // If sandboxPath is already a valid POSIX absolute path (e.g., user-specified
    // sandbox paths like /mnt/data or /home/agent/workspace), leave it as-is.
    // Otherwise, normalize it — Windows-style sandboxPaths (from resolveGitMounts
    // setting sandboxPath === hostPath) need remapping.
    if (sandboxPath.match(/^[A-Za-z]:[/\\]/) || sandboxPath.includes("\\")) {
      // This is a Windows-style path — remap it
      const normalizedSandboxPath = sandboxPath.replace(/\\/g, "/");

      if (normalizedSandboxPath.startsWith(normalizedWorktree + "/")) {
        // Under the worktree: derive sandbox path relative to sandboxRepoDir
        const relativeSuffix = normalizedSandboxPath.slice(
          normalizedWorktree.length,
        );
        sandboxPath = sandboxRepoDir + relativeSuffix;
      } else if (normalizedSandboxPath === normalizedWorktree) {
        sandboxPath = sandboxRepoDir;
      } else {
        // Not under the worktree — just normalize slashes
        sandboxPath = normalizedSandboxPath;
      }
    }

    return { ...m, hostPath, sandboxPath };
  });
};
