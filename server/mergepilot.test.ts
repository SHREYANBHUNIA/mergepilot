import { describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({ access: vi.fn().mockResolvedValue(undefined) }));
vi.mock("node:child_process", () => ({
  spawn: vi.fn(() => {
    const handlers: Record<string, (value?: unknown) => void> = {};
    return {
      stdout: { on: vi.fn((event, handler) => { if (event === "data") handlers.stdout = handler; }) },
      stderr: { on: vi.fn((event, handler) => { if (event === "data") handlers.stderr = handler; }) },
      on: vi.fn((event, handler) => {
        if (event === "close") {
          queueMicrotask(() => {
            handlers.stdout?.(Buffer.from('{"id":"analysis-1","status":"completed","conflicts":[],"summary":{"conflictCount":0,"rejectedCandidates":0,"reviewCandidates":0}}'));
            handler(0);
          });
        }
      }),
      stdin: { write: vi.fn(), end: vi.fn() },
    };
  }),
}));

import { runMergePilotAnalysis } from "./mergepilot";

describe("MergePilot Python orchestration bridge", () => {
  it("serializes the requested repository analysis and returns the core payload", async () => {
    const result = await runMergePilotAnalysis({
      repositoryPath: "demo://mergepilot",
      sourceBranch: "feature/tax-aware-total",
      targetBranch: "master",
      validationProfile: "demo-node",
    });

    expect(result.status).toBe("completed");
    expect(result.id).toBe("analysis-1");
  });
});
