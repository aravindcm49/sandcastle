import { describe, expect, it, vi } from "vitest";
import {
  defaultImageName,
  expandTilde,
  resolveHostPath,
  resolveSandboxPath,
  resolveUserMounts,
  normalizeMounts,
} from "./mountUtils.js";
import { SANDBOX_REPO_DIR } from "./SandboxFactory.js";

vi.mock("node:fs", () => ({
  existsSync: (p: string) =>
    p === "/existing/path" ||
    p === "/home/testuser/data" ||
    p === "C:/Users/project/cache",
}));

vi.mock("node:os", () => ({
  homedir: () => "/home/testuser",
}));

describe("defaultImageName", () => {
  it("derives image name from POSIX repo directory", () => {
    expect(defaultImageName("/home/user/my-repo")).toBe("sandcastle:my-repo");
  });

  it("lowercases and sanitizes the directory name", () => {
    expect(defaultImageName("/home/user/My Repo!")).toBe("sandcastle:my-repo-");
  });

  it("handles trailing slashes", () => {
    expect(defaultImageName("/home/user/repo/")).toBe("sandcastle:repo");
  });

  it("falls back to 'local' for empty path", () => {
    expect(defaultImageName("")).toBe("sandcastle:local");
  });

  it("handles Windows paths with backslashes", () => {
    expect(defaultImageName("C:\\Users\\project")).toBe("sandcastle:project");
  });

  it("handles Windows paths with trailing backslash", () => {
    expect(defaultImageName("C:\\Users\\project\\")).toBe("sandcastle:project");
  });

  it("handles mixed separators", () => {
    expect(defaultImageName("C:\\Users/project")).toBe("sandcastle:project");
  });
});

describe("expandTilde", () => {
  it("expands ~ to home directory", () => {
    expect(expandTilde("~")).toBe("/home/testuser");
  });

  it("expands ~/ prefix", () => {
    expect(expandTilde("~/data")).toBe("/home/testuser/data");
  });

  it("expands ~\\ prefix (Windows tilde path)", () => {
    expect(expandTilde("~\\data")).toBe("/home/testuser/data");
  });

  it("leaves absolute POSIX paths unchanged", () => {
    expect(expandTilde("/usr/local")).toBe("/usr/local");
  });

  it("leaves relative paths unchanged", () => {
    expect(expandTilde("relative/path")).toBe("relative/path");
  });
});

describe("resolveHostPath", () => {
  it("expands tilde and returns absolute path", () => {
    expect(resolveHostPath("~/data")).toBe("/home/testuser/data");
  });

  it("returns absolute paths as-is", () => {
    expect(resolveHostPath("/absolute/path")).toBe("/absolute/path");
  });
});

describe("resolveSandboxPath", () => {
  it("returns absolute paths as-is", () => {
    expect(resolveSandboxPath("/mnt/data")).toBe("/mnt/data");
  });

  it("resolves relative paths against SANDBOX_REPO_DIR", () => {
    expect(resolveSandboxPath("data")).toBe(`${SANDBOX_REPO_DIR}/data`);
  });
});

describe("resolveUserMounts", () => {
  it("resolves and validates user mounts", () => {
    const result = resolveUserMounts([
      { hostPath: "/existing/path", sandboxPath: "/mnt/data" },
    ]);
    expect(result).toEqual([
      { hostPath: "/existing/path", sandboxPath: "/mnt/data" },
    ]);
  });

  it("throws if hostPath does not exist", () => {
    expect(() =>
      resolveUserMounts([
        { hostPath: "/nonexistent/path", sandboxPath: "/mnt/data" },
      ]),
    ).toThrow("Mount hostPath does not exist");
  });

  it("preserves readonly flag", () => {
    const result = resolveUserMounts([
      { hostPath: "/existing/path", sandboxPath: "/mnt/data", readonly: true },
    ]);
    expect(result[0]!.readonly).toBe(true);
  });
});

describe("normalizeMounts", () => {
  describe("on non-Windows platform", () => {
    it("returns mounts unchanged", () => {
      const mounts = [{ hostPath: "/repo/.git", sandboxPath: "/repo/.git" }];
      const result = normalizeMounts(
        mounts,
        "/repo",
        SANDBOX_REPO_DIR,
        "linux",
      );
      expect(result).toEqual(mounts);
    });

    it("preserves sandboxPath === hostPath for git mounts on POSIX", () => {
      const mounts = [
        {
          hostPath: "/home/user/project/.git",
          sandboxPath: "/home/user/project/.git",
        },
      ];
      const result = normalizeMounts(
        mounts,
        "/home/user/project",
        SANDBOX_REPO_DIR,
        "darwin",
      );
      expect(result[0]!.sandboxPath).toBe("/home/user/project/.git");
    });
  });

  describe("on Windows platform", () => {
    it("normalizes backslashes to forward slashes in hostPath", () => {
      const mounts = [
        {
          hostPath: "C:\\Users\\project\\.git",
          sandboxPath: "C:\\Users\\project\\.git",
        },
      ];
      const result = normalizeMounts(
        mounts,
        "C:\\Users\\project",
        SANDBOX_REPO_DIR,
        "win32",
      );
      expect(result[0]!.hostPath).toBe("C:/Users/project/.git");
    });

    it("remaps sandboxPath to POSIX path relative to sandboxRepoDir when under worktree path", () => {
      const mounts = [
        {
          hostPath: "C:\\Users\\project\\.git",
          sandboxPath: "C:\\Users\\project\\.git",
        },
      ];
      const result = normalizeMounts(
        mounts,
        "C:\\Users\\project",
        SANDBOX_REPO_DIR,
        "win32",
      );
      expect(result[0]!.sandboxPath).toBe(`${SANDBOX_REPO_DIR}/.git`);
    });

    it("normalizes the worktree mount itself", () => {
      const mounts = [
        { hostPath: "C:\\Users\\project", sandboxPath: SANDBOX_REPO_DIR },
        {
          hostPath: "C:\\Users\\project\\.git",
          sandboxPath: "C:\\Users\\project\\.git",
        },
      ];
      const result = normalizeMounts(
        mounts,
        "C:\\Users\\project",
        SANDBOX_REPO_DIR,
        "win32",
      );
      expect(result[0]!.hostPath).toBe("C:/Users/project");
      expect(result[0]!.sandboxPath).toBe(SANDBOX_REPO_DIR);
      expect(result[1]!.hostPath).toBe("C:/Users/project/.git");
      expect(result[1]!.sandboxPath).toBe(`${SANDBOX_REPO_DIR}/.git`);
    });

    it("handles worktree git mounts from parent repo", () => {
      // In worktree mode, the parent .git directory is also mounted
      const parentGitDir = "C:\\Users\\repo\\.git";
      const mounts = [
        {
          hostPath: "C:\\Users\\worktrees\\my-wt",
          sandboxPath: SANDBOX_REPO_DIR,
        },
        {
          hostPath: "C:\\Users\\worktrees\\my-wt\\.git",
          sandboxPath: "C:\\Users\\worktrees\\my-wt\\.git",
        },
        { hostPath: parentGitDir, sandboxPath: parentGitDir },
      ];
      const result = normalizeMounts(
        mounts,
        "C:\\Users\\worktrees\\my-wt",
        SANDBOX_REPO_DIR,
        "win32",
      );
      // worktree mount: hostPath normalized, sandboxPath already POSIX
      expect(result[0]!.hostPath).toBe("C:/Users/worktrees/my-wt");
      expect(result[0]!.sandboxPath).toBe(SANDBOX_REPO_DIR);
      // .git file mount: under worktree, so sandboxPath remapped
      expect(result[1]!.hostPath).toBe("C:/Users/worktrees/my-wt/.git");
      expect(result[1]!.sandboxPath).toBe(`${SANDBOX_REPO_DIR}/.git`);
      // parent .git dir: NOT under worktree, sandboxPath gets backslashes normalized
      expect(result[2]!.hostPath).toBe("C:/Users/repo/.git");
      expect(result[2]!.sandboxPath).toBe("C:/Users/repo/.git");
    });

    it("preserves readonly flag through normalization", () => {
      const mounts = [
        {
          hostPath: "C:\\Users\\data",
          sandboxPath: "/mnt/data",
          readonly: true as const,
        },
      ];
      const result = normalizeMounts(
        mounts,
        "C:\\Users\\project",
        SANDBOX_REPO_DIR,
        "win32",
      );
      expect(result[0]!.readonly).toBe(true);
    });

    it("normalizes backslashes in user mount hostPaths", () => {
      const mounts = [
        { hostPath: "C:\\Users\\project\\cache", sandboxPath: "/mnt/cache" },
      ];
      const result = normalizeMounts(
        mounts,
        "C:\\Users\\project",
        SANDBOX_REPO_DIR,
        "win32",
      );
      expect(result[0]!.hostPath).toBe("C:/Users/project/cache");
      // sandboxPath is already a valid POSIX path, unchanged
      expect(result[0]!.sandboxPath).toBe("/mnt/cache");
    });
  });
});
