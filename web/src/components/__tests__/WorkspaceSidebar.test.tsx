// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { RepoGroup, SessionResponse, Workspace } from "../../lib/types";
import type { RepoAppearanceUpdate } from "../../lib/repoAppearance";
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

function makeGroup(
  workspaces: Workspace[],
  overrides: Partial<RepoGroup> = {},
): RepoGroup {
  return {
    id: "/tmp/aoe",
    repoPath: "/tmp/aoe",
    displayName: "aoe",
    defaultDisplayName: "aoe",
    alias: null,
    color: null,
    remoteOwner: null,
    workspaces,
    status: "active",
    collapsed: false,
    ...overrides,
  };
}

function baseGroups(overrides: Partial<RepoGroup> = {}) {
  return [
    makeGroup(
      [
        makeWorkspace("ws-a", "Alpha"),
        makeWorkspace("ws-b", "Beta"),
        makeWorkspace("ws-c", "Gamma"),
      ],
      overrides,
    ),
  ];
}

function renderSidebar({
  activeId = "ws-a",
  groups = baseGroups(),
  onUpdateRepoAppearance = vi.fn(),
}: {
  activeId?: string | null;
  groups?: RepoGroup[];
  onUpdateRepoAppearance?: (
    repoId: string,
    update: RepoAppearanceUpdate,
  ) => void;
} = {}) {
  return {
    onUpdateRepoAppearance,
    ...render(
      <WorkspaceSidebar
        groups={groups}
        onReorderWorkspaces={vi.fn()}
        activeId={activeId}
        open={true}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        onToggleRepo={vi.fn()}
        onUpdateRepoAppearance={onUpdateRepoAppearance}
        onNew={vi.fn()}
        onCreateSession={vi.fn()}
        onSettings={vi.fn()}
        onProjects={vi.fn()}
      />,
    ),
  };
}

function groupHeader() {
  return screen.getByTestId("sidebar-group-header");
}

function openGroupMenuByKeyboard() {
  fireEvent.keyDown(groupHeader(), { key: "Enter" });
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
    renderSidebar();

    expectActiveLink(/Alpha/);
    expectInactiveLink(/Beta/);

    fireEvent.click(screen.getByRole("link", { name: /Beta/ }));

    expectInactiveLink(/Alpha/);
    expectActiveLink(/Beta/);
  });

  it("clears the optimistic highlight when activeId changes externally", () => {
    const { rerender } = renderSidebar();

    fireEvent.click(screen.getByRole("link", { name: /Beta/ }));
    expectActiveLink(/Beta/);

    rerender(
      <WorkspaceSidebar
        groups={baseGroups()}
        onReorderWorkspaces={vi.fn()}
        activeId="ws-c"
        open={true}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        onToggleRepo={vi.fn()}
        onUpdateRepoAppearance={vi.fn()}
        onNew={vi.fn()}
        onCreateSession={vi.fn()}
        onSettings={vi.fn()}
        onProjects={vi.fn()}
      />,
    );

    expectInactiveLink(/Beta/);
    expectActiveLink(/Gamma/);
  });

  it("opens the group appearance menu from keyboard and ignores bubbled child keys", () => {
    renderSidebar();

    fireEvent.keyDown(
      screen.getByRole("button", { name: /new session in aoe/i }),
      { key: "Enter", bubbles: true },
    );
    expect(screen.queryByTestId("sidebar-group-context-menu")).toBeNull();

    openGroupMenuByKeyboard();
    expect(screen.getByTestId("sidebar-group-context-menu")).toBeDefined();
  });

  it("renames and clears a group alias through the context menu", () => {
    const onUpdateRepoAppearance = vi.fn();
    const { rerender } = renderSidebar({
      onUpdateRepoAppearance,
      groups: baseGroups({ alias: "Custom AOE", displayName: "Custom AOE" }),
    });

    openGroupMenuByKeyboard();
    fireEvent.click(screen.getByTestId("sidebar-group-context-menu-rename"));
    const input = screen.getByTestId("sidebar-group-rename-input");
    fireEvent.change(input, { target: { value: "  Ops Board  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onUpdateRepoAppearance).toHaveBeenCalledWith("/tmp/aoe", {
      alias: "Ops Board",
    });

    rerender(
      <WorkspaceSidebar
        groups={baseGroups({ alias: "Ops Board", displayName: "Ops Board" })}
        onReorderWorkspaces={vi.fn()}
        activeId="ws-a"
        open={true}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        onToggleRepo={vi.fn()}
        onUpdateRepoAppearance={onUpdateRepoAppearance}
        onNew={vi.fn()}
        onCreateSession={vi.fn()}
        onSettings={vi.fn()}
        onProjects={vi.fn()}
      />,
    );

    openGroupMenuByKeyboard();
    fireEvent.click(screen.getByText("Clear alias"));
    expect(onUpdateRepoAppearance).toHaveBeenCalledWith("/tmp/aoe", {
      alias: null,
    });
  });

  it("sets and clears a group background color", () => {
    const onUpdateRepoAppearance = vi.fn();
    const { rerender } = renderSidebar({ onUpdateRepoAppearance });

    openGroupMenuByKeyboard();
    fireEvent.click(screen.getByTestId("sidebar-group-color-amber"));

    expect(onUpdateRepoAppearance).toHaveBeenCalledWith("/tmp/aoe", {
      color: "amber",
    });

    rerender(
      <WorkspaceSidebar
        groups={baseGroups({ color: "amber" })}
        onReorderWorkspaces={vi.fn()}
        activeId="ws-a"
        open={true}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        onToggleRepo={vi.fn()}
        onUpdateRepoAppearance={onUpdateRepoAppearance}
        onNew={vi.fn()}
        onCreateSession={vi.fn()}
        onSettings={vi.fn()}
        onProjects={vi.fn()}
      />,
    );

    expect(groupHeader().getAttribute("style")).toContain(
      "--color-status-waiting",
    );
    openGroupMenuByKeyboard();
    fireEvent.click(screen.getByTestId("sidebar-group-color-clear"));

    expect(onUpdateRepoAppearance).toHaveBeenCalledWith("/tmp/aoe", {
      color: null,
    });
  });
});
