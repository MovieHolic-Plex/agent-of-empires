// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { RepoGroup, SessionResponse, Workspace } from "../../lib/types";
import { WorkspaceSidebar } from "../WorkspaceSidebar";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function makeSession(id: string, title: string): SessionResponse {
  return {
    id,
    title,
    project_path: "/tmp/aoe",
    group_path: "/tmp/aoe",
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
    workspace_repos: [],
  };
}

function makeWorkspace(id: string, title: string): Workspace {
  return {
    id,
    branch: null,
    projectPath: "/tmp/aoe",
    displayName: title,
    agents: ["claude"],
    primaryAgent: "claude",
    status: "active",
    sessions: [makeSession(`session-${id}`, title)],
  };
}

function makeGroup(workspaces: Workspace[]): RepoGroup {
  return {
    id: "/tmp/aoe",
    repoPath: "/tmp/aoe",
    displayName: "aoe",
    remoteOwner: null,
    workspaces,
    status: "active",
    collapsed: false,
  };
}

function renderSidebar(activeId: string | null) {
  const groups = [
    makeGroup([
      makeWorkspace("ws-a", "Alpha"),
      makeWorkspace("ws-b", "Beta"),
      makeWorkspace("ws-c", "Gamma"),
    ]),
  ];
  return render(
    <WorkspaceSidebar
      groups={groups}
      onReorderWorkspaces={vi.fn()}
      activeId={activeId}
      open={true}
      onToggle={vi.fn()}
      onSelect={vi.fn()}
      onToggleRepo={vi.fn()}
      onNew={vi.fn()}
      onCreateSession={vi.fn()}
      onSettings={vi.fn()}
      onProjects={vi.fn()}
    />,
  );
}

function expectActiveLink(name: RegExp) {
  expect(screen.getByRole("link", { name }).className).toContain(
    "border-brand-600",
  );
}

function expectInactiveLink(name: RegExp) {
  expect(screen.getByRole("link", { name }).className).not.toContain(
    "border-brand-600",
  );
}

describe("WorkspaceSidebar", () => {
  it("optimistically highlights a clicked row before parent navigation catches up", () => {
    renderSidebar("ws-a");

    expectActiveLink(/Alpha/);
    expectInactiveLink(/Beta/);

    fireEvent.click(screen.getByRole("link", { name: /Beta/ }));

    expectInactiveLink(/Alpha/);
    expectActiveLink(/Beta/);
  });

  it("clears the optimistic highlight when activeId changes externally", () => {
    const { rerender } = renderSidebar("ws-a");

    fireEvent.click(screen.getByRole("link", { name: /Beta/ }));
    expectActiveLink(/Beta/);

    const groups = [
      makeGroup([
        makeWorkspace("ws-a", "Alpha"),
        makeWorkspace("ws-b", "Beta"),
        makeWorkspace("ws-c", "Gamma"),
      ]),
    ];
    rerender(
      <WorkspaceSidebar
        groups={groups}
        onReorderWorkspaces={vi.fn()}
        activeId="ws-c"
        open={true}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        onToggleRepo={vi.fn()}
        onNew={vi.fn()}
        onCreateSession={vi.fn()}
        onSettings={vi.fn()}
        onProjects={vi.fn()}
      />,
    );

    expectInactiveLink(/Beta/);
    expectActiveLink(/Gamma/);
  });
});
