// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { SessionResponse, Workspace } from "../lib/types";
import { MULTI_REPO_GROUP_ID, useRepoGroups } from "./useRepoGroups";

const APPEARANCE_KEY = "aoe-repo-appearance-v1";

afterEach(() => {
  window.localStorage.clear();
});

function makeSession(
  id: string,
  projectPath: string,
  workspaceRepos: SessionResponse["workspace_repos"] = [],
): SessionResponse {
  return {
    id,
    title: id,
    project_path: projectPath,
    group_path: projectPath,
    tool: "claude",
    status: "Running",
    yolo_mode: false,
    created_at: new Date().toISOString(),
    last_accessed_at: null,
    idle_entered_at: null,
    last_error: null,
    branch: null,
    main_repo_path: null,
    is_sandboxed: false,
    favorited: false,
    has_managed_worktree: false,
    has_terminal: true,
    profile: "default",
    cleanup_defaults: {
      delete_worktree: false,
      delete_branch: false,
      delete_sandbox: false,
    },
    remote_owner: null,
    notify_on_waiting: null,
    notify_on_idle: null,
    notify_on_error: null,
    claude_fullscreen: false,
    workspace_repos: workspaceRepos,
  };
}

function makeWorkspace(
  id: string,
  projectPath: string,
  workspaceRepos: SessionResponse["workspace_repos"] = [],
): Workspace {
  return {
    id,
    branch: null,
    projectPath,
    displayName: id,
    agents: ["claude"],
    primaryAgent: "claude",
    status: "active",
    sessions: [makeSession(`session-${id}`, projectPath, workspaceRepos)],
  };
}

describe("useRepoGroups appearance state", () => {
  it("applies stored aliases and colors to normal and multi-repo groups", () => {
    window.localStorage.setItem(
      APPEARANCE_KEY,
      JSON.stringify({
        "/tmp/alpha": { alias: "Client Alpha", color: "amber" },
        [MULTI_REPO_GROUP_ID]: { alias: "Workspace Set", color: "teal" },
      }),
    );
    const multiRepos = [
      { name: "api", source_path: "/tmp/api", branch: "main" },
      { name: "web", source_path: "/tmp/web", branch: "main" },
    ];

    const { result } = renderHook(() =>
      useRepoGroups(
        [
          makeWorkspace("alpha", "/tmp/alpha"),
          makeWorkspace("multi", "/tmp/multi", multiRepos),
        ],
        ["alpha", "multi"],
      ),
    );

    expect(result.current.groups).toMatchObject([
      {
        id: "/tmp/alpha",
        displayName: "Client Alpha",
        defaultDisplayName: "alpha",
        alias: "Client Alpha",
        color: "amber",
      },
      {
        id: MULTI_REPO_GROUP_ID,
        displayName: "Workspace Set",
        defaultDisplayName: "Multi-repo",
        alias: "Workspace Set",
        color: "teal",
      },
    ]);
  });

  it("updates, persists, and clears repo appearance", () => {
    const { result } = renderHook(() =>
      useRepoGroups([makeWorkspace("alpha", "/tmp/alpha")]),
    );

    expect(result.current.groups[0].displayName).toBe("alpha");

    act(() => {
      result.current.updateRepoAppearance("/tmp/alpha", {
        alias: "Renamed Alpha",
        color: "sky",
      });
    });

    expect(result.current.groups[0]).toMatchObject({
      displayName: "Renamed Alpha",
      alias: "Renamed Alpha",
      color: "sky",
    });
    expect(JSON.parse(window.localStorage.getItem(APPEARANCE_KEY) ?? "{}")).toEqual(
      {
        "/tmp/alpha": { alias: "Renamed Alpha", color: "sky" },
      },
    );

    act(() => {
      result.current.updateRepoAppearance("/tmp/alpha", {
        alias: null,
        color: null,
      });
    });

    expect(result.current.groups[0]).toMatchObject({
      displayName: "alpha",
      alias: null,
      color: null,
    });
    expect(window.localStorage.getItem(APPEARANCE_KEY)).toBeNull();
  });

  it("keeps appearance when toggling a group collapsed", () => {
    const { result } = renderHook(() =>
      useRepoGroups([makeWorkspace("alpha", "/tmp/alpha")]),
    );

    act(() => {
      result.current.updateRepoAppearance("/tmp/alpha", { alias: "Alpha" });
      result.current.toggleRepoCollapsed("/tmp/alpha");
    });

    expect(result.current.groups[0]).toMatchObject({
      collapsed: true,
      displayName: "Alpha",
    });
  });
});
