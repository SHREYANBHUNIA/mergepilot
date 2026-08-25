import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

export type MergePilotCandidate = {
  id: string;
  strategy: string;
  label: string;
  content: string;
  explanation: string;
  semanticImpact: string;
  patch: string;
  astSignals: { language: string; affectedSymbols: string[]; classification: string };
  validation: { status: "passed" | "failed"; exitCode: number; output: string; profile: string; command: string };
  score: number;
  decision: "recommended" | "review" | "rejected";
  scoreFactors: string[];
  scoreExplanation: string;
};

export type MergePilotConflict = {
  id: string;
  path: string;
  classification: "syntactic" | "semantic" | "mixed";
  risk: "low" | "medium" | "high";
  explanation: string;
  riskFactors: string[];
  ast: { language: string; affectedSymbols: string[]; regions: unknown[]; parseSupported: boolean };
  preview: string;
  candidates: MergePilotCandidate[];
};

export type MergePilotAnalysis = {
  id: string;
  status: "completed";
  repositoryPath: string;
  sourceBranch: string;
  targetBranch: string;
  mergeBase: string;
  branchSummary: { sourceChangedFiles: number; targetChangedFiles: number; sharedChangedFiles: number };
  conflicts: MergePilotConflict[];
  summary: { conflictCount: number; rejectedCandidates: number; reviewCandidates: number };
};

function runProcess(command: string, args: string[], input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    child.on("error", error => reject(error));
    child.on("close", code => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `MergePilot core process exited with code ${code}.`));
    });
    child.stdin.write(input);
    child.stdin.end();
  });
}

export async function runMergePilotAnalysis(input: {
  repositoryPath: string;
  sourceBranch: string;
  targetBranch: string;
  validationProfile: string;
}): Promise<MergePilotAnalysis> {
  const corePath = path.join(process.cwd(), "api", "cli.py");
  await access(corePath);
  const output = await runProcess("python3", [corePath], JSON.stringify(input));
  return JSON.parse(output) as MergePilotAnalysis;
}
