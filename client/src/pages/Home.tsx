import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  Binary,
  BookOpenCheck,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Code2,
  FileCode2,
  GitBranch,
  GitMerge,
  History,
  Loader2,
  Network,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { MergePilotAnalysis, MergePilotCandidate } from "../../../server/mergepilot";

type ActivePanel = "workspace" | "history" | "architecture";

const navItems: { id: ActivePanel; icon: LucideIcon; label: string }[] = [
  { id: "workspace", icon: GitMerge, label: "Analysis workspace" },
  { id: "history", icon: History, label: "Resolution ledger" },
  { id: "architecture", icon: Network, label: "System design" },
];

function ScoreRing({ score, tone }: { score: number; tone: "emerald" | "amber" | "rose" }) {
  const toneClass = tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : "text-rose-300";
  return (
    <div className={cn("score-ring", toneClass)} style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}>
      <span>{score}</span>
    </div>
  );
}

function StatusPill({ status }: { status: "recommended" | "review" | "rejected" | "passed" | "failed" | "semantic" | "syntactic" | "mixed" }) {
  const config = {
    recommended: ["RECOMMENDED", "pill pill-emerald"],
    review: ["REVIEW REQUIRED", "pill pill-amber"],
    rejected: ["REJECTED", "pill pill-rose"],
    passed: ["VALIDATION PASSED", "pill pill-emerald"],
    failed: ["VALIDATION FAILED", "pill pill-rose"],
    semantic: ["SEMANTIC", "pill pill-amber"],
    syntactic: ["SYNTACTIC", "pill pill-blue"],
    mixed: ["MIXED", "pill pill-amber"],
  } as const;
  const [label, className] = config[status];
  return <span className={className}>{label}</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label">{children}</p>;
}

export default function Home() {
  const [activePanel, setActivePanel] = useState<ActivePanel>("workspace");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [expandedPatch, setExpandedPatch] = useState(false);
  const [repositoryPath, setRepositoryPath] = useState("demo://mergepilot");
  const [sourceBranch, setSourceBranch] = useState("feature/tax-aware-total");
  const [targetBranch, setTargetBranch] = useState("master");
  const [validationProfile, setValidationProfile] = useState<"demo-node" | "python-unit" | "none">("demo-node");
  const [analysis, setAnalysis] = useState<MergePilotAnalysis | null>(null);
  const analysisMutation = trpc.mergepilot.analyze.useMutation({
    onSuccess: result => {
      setAnalysis(result);
      setSelectedCandidateId(result.conflicts[0]?.candidates[0]?.id ?? null);
      toast.success("Analysis complete", { description: `${result.summary.conflictCount} semantic conflict mapped; unsafe candidates were rejected.` });
    },
    onError: error => toast.error("Analysis could not start", { description: error.message }),
  });
  const historyQuery = trpc.mergepilot.history.useQuery();
  const selectionMutation = trpc.mergepilot.selectCandidate.useMutation({
    onSuccess: () => toast.success("Resolution recorded", { description: "The selected candidate was added to the audit trail." }),
  });
  const revalidationMutation = trpc.mergepilot.revalidate.useMutation({
    onSuccess: result => {
      setAnalysis(result.analysis);
      setSelectedCandidateId(result.candidate.id);
      toast.success("Candidate revalidated", { description: `${result.candidate.label} was evaluated again in a fresh isolated workspace.` });
    },
    onError: error => toast.error("Revalidation failed", { description: error.message }),
  });

  const conflict = analysis?.conflicts[0];
  const candidates = conflict?.candidates ?? [];
  const selectedCandidate = candidates.find((candidate: MergePilotCandidate) => candidate.id === selectedCandidateId) ?? candidates[0];
  const sortedHistory = useMemo(() => historyQuery.data ?? [], [historyQuery.data]);
  const patchQuery = trpc.mergepilot.patch.useQuery({ candidateId: selectedCandidateId ?? "not-selected" }, { enabled: false });

  const startDemo = () => {
    setExpandedPatch(false);
    analysisMutation.mutate({
      repositoryPath: repositoryPath.trim() || "demo://mergepilot",
      sourceBranch: sourceBranch.trim(),
      targetBranch: targetBranch.trim(),
      validationProfile,
    });
  };

  const exportPatch = async () => {
    if (!selectedCandidate) return;
    const persistedPatch = await patchQuery.refetch();
    const patch = persistedPatch.data?.patch ?? selectedCandidate.patch;
    const blob = new Blob([patch], { type: "text/x-diff" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mergepilot-resolution.patch";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Patch prepared", { description: "The apply-ready patch was downloaded locally." });
  };

  return (
    <div className="blueprint-shell">
      <aside className="blueprint-sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><GitMerge size={19} strokeWidth={2.5} /></div>
          <div>
            <p className="brand-name">MERGE<span>PILOT</span></p>
            <p className="brand-subtitle">RESOLUTION SYSTEM</p>
          </div>
        </div>

        <nav className="side-nav" aria-label="MergePilot sections">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActivePanel(id)}
              className={cn("side-nav-item", activePanel === id && "is-active")}
            >
              <Icon size={16} />
              <span>{label}</span>
              {activePanel === id && <ChevronRight size={14} className="ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-specs">
          <SectionLabel>RUNNER STATUS</SectionLabel>
          <div className="status-line"><span className="live-dot" />ISOLATED WORKTREE</div>
          <div className="status-line"><span className="live-dot" />AST GRAMMAR READY</div>
          <div className="status-line"><span className="live-dot" />AUDIT LEDGER ONLINE</div>
          <div className="measure-line"><span>ENGINE</span><b>0.1.0</b></div>
        </div>

        <div className="sidebar-footer">MP / 2026<br />PRECISION MERGE ANALYSIS</div>
      </aside>

      <main className="blueprint-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">CONTROL ROOM / AUTONOMOUS CONFLICT RESOLUTION</p>
            <h1>{activePanel === "workspace" ? "Analysis workspace" : activePanel === "history" ? "Resolution ledger" : "System architecture"}</h1>
          </div>
          <div className="topbar-actions">
            <div className="system-clock"><CircleDot size={14} />BUILD MP-ALPHA</div>
            <button className="primary-action" onClick={startDemo} disabled={analysisMutation.isPending}>
              {analysisMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} fill="currentColor" />}
              {analysisMutation.isPending ? "ANALYZING" : "RUN DEMO ANALYSIS"}
            </button>
          </div>
        </header>

        {activePanel === "workspace" && (
          <div className="workspace-grid">
            <section className="repository-console blueprint-card">
              <div className="card-title-row">
                <div><SectionLabel>01 / INPUT SPECIFICATION</SectionLabel><h2>Merge context</h2></div>
                <div className="cad-id">MP-ANL-042</div>
              </div>
              <div className="input-diagram">
                <div className="repo-input">
                  <label><GitBranch size={14} /> REPOSITORY</label>
                  <div className="input-value"><span className="input-prefix">//</span><input aria-label="Repository path" value={repositoryPath} onChange={event => setRepositoryPath(event.target.value)} /></div>
                </div>
                <div className="branch-fields">
                  <label>SOURCE BRANCH<input aria-label="Source branch" value={sourceBranch} onChange={event => setSourceBranch(event.target.value)} /></label>
                  <div className="branch-connector"><span /><i /><span /></div>
                  <label>TARGET BRANCH<input aria-label="Target branch" value={targetBranch} onChange={event => setTargetBranch(event.target.value)} /></label>
                </div>
                <div className="safety-stamp"><ShieldCheck size={19} /><div><b>APPROVED RUNNER</b><select aria-label="Validation profile" value={validationProfile} onChange={event => setValidationProfile(event.target.value as "demo-node" | "python-unit" | "none")}><option value="demo-node">demo-node</option><option value="python-unit">python-unit</option><option value="none">read-only</option></select></div></div>
              </div>
              <p className="muted-note">Use <code>demo://mergepilot</code> for the disposable demonstration repository, or provide an approved workspace path and real branch names. Shell commands remain allow-listed by the selected validation profile.</p>
            </section>

            <section className="status-overview blueprint-card">
              <div className="card-title-row"><div><SectionLabel>02 / ANALYSIS STATUS</SectionLabel><h2>{analysis ? "Conflict mapped" : "Standing by"}</h2></div><Binary size={18} className="technical-icon" /></div>
              <div className="metric-grid">
                <div className="metric"><b>{analysis?.summary.conflictCount ?? "—"}</b><span>conflicted files</span></div>
                <div className="metric"><b>{analysis?.summary.reviewCandidates ?? "—"}</b><span>requires review</span></div>
                <div className="metric danger"><b>{analysis?.summary.rejectedCandidates ?? "—"}</b><span>auto-rejected</span></div>
              </div>
              <div className="progress-assembly">
                <span>BRANCH GRAPH</span><i className={analysis ? "is-ready" : ""} /><span>AST MAP</span><i className={analysis ? "is-ready" : ""} /><span>VALIDATE</span>
              </div>
            </section>

            <section className="conflict-panel blueprint-card">
              <div className="card-title-row">
                <div><SectionLabel>03 / CONFLICT INSPECTION</SectionLabel><h2>{conflict?.path ?? "Awaiting a branch comparison"}</h2></div>
                {conflict && <StatusPill status={conflict.classification} />}
              </div>
              {conflict ? (
                <div className="conflict-layout">
                  <div className="code-window">
                    <div className="code-window-bar"><span /><span /><span /><b>src/total.js</b><em>JS / AST</em></div>
                    <pre>{conflict.preview}</pre>
                  </div>
                  <div className="risk-brief">
                    <div className="risk-heading"><AlertTriangle size={16} /><span>SEMANTIC COLLISION</span></div>
                    <p>{conflict.explanation}</p>
                    <div className="symbol-list"><SectionLabel>AFFECTED SYMBOLS</SectionLabel>{conflict.ast.affectedSymbols.map((symbol: string) => <span key={symbol}><Code2 size={13} />{symbol}()</span>)}</div>
                    <div className="risk-factors">{conflict.riskFactors.map((item: string) => <div key={item}><span />{item}</div>)}</div>
                  </div>
                </div>
              ) : (
                <div className="empty-technical"><GitMerge size={30} /><p>Start the demo analysis to construct the AST map, compare resolution candidates, and record validation evidence.</p></div>
              )}
            </section>

            <section className="candidate-panel blueprint-card">
              <div className="card-title-row"><div><SectionLabel>04 / CANDIDATE MATRIX</SectionLabel><h2>Safe resolution candidates</h2></div><div className="cad-id">{candidates.length} CONFIGURATIONS</div></div>
              {candidates.length ? (
                <div className="candidate-table-wrap">
                  <div className="candidate-header"><span>STRATEGY</span><span>SAFETY SCORE</span><span>VALIDATION</span><span>DECISION</span><span /></div>
                  {candidates.map((candidate: MergePilotCandidate) => {
                    const tone = candidate.decision === "rejected" ? "rose" : candidate.decision === "review" ? "amber" : "emerald";
                    return (
                      <button className={cn("candidate-row", selectedCandidate?.id === candidate.id && "is-selected")} onClick={() => { setSelectedCandidateId(candidate.id); setExpandedPatch(false); }} key={candidate.id}>
                        <div className="strategy-cell"><span className="strategy-node"><FileCode2 size={15} /></span><div><b>{candidate.label}</b><small>{candidate.strategy}</small></div></div>
                        <div className="score-cell"><ScoreRing score={candidate.score} tone={tone} /><span>{candidate.scoreExplanation.slice(0, 52)}…</span></div>
                        <div>{candidate.validation.status === "passed" ? <StatusPill status="passed" /> : <StatusPill status="failed" />}</div>
                        <div><StatusPill status={candidate.decision} /></div>
                        <ChevronRight size={17} className="row-chevron" />
                      </button>
                    );
                  })}
                </div>
              ) : <div className="empty-technical compact"><Network size={24} /><p>The candidate matrix will populate after analysis.</p></div>}
            </section>

            <section className="resolution-panel blueprint-card">
              <div className="card-title-row"><div><SectionLabel>05 / RESOLUTION EVIDENCE</SectionLabel><h2>{selectedCandidate?.label ?? "Select a candidate"}</h2></div>{selectedCandidate && <StatusPill status={selectedCandidate.decision} />}</div>
              {selectedCandidate ? (
                <div className="resolution-layout">
                  <div className="evidence-stack">
                    <div className="evidence-block"><BookOpenCheck size={17} /><div><b>Why this score</b><p>{selectedCandidate.scoreExplanation}</p>{selectedCandidate.scoreFactors.map((factor: string) => <small key={factor}>+ {factor}</small>)}</div></div>
                    <div className="evidence-block"><Bot size={17} /><div><b>Semantic impact</b><p>{selectedCandidate.semanticImpact}</p></div></div>
                    <div className={cn("validation-block", selectedCandidate.validation.status === "passed" ? "is-passed" : "is-failed")}>
                      {selectedCandidate.validation.status === "passed" ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
                      <div><b>{selectedCandidate.validation.status === "passed" ? "Isolated validation passed" : "Automatically rejected"}</b><p><code>{selectedCandidate.validation.command}</code> · exit {selectedCandidate.validation.exitCode}</p></div>
                    </div>
                    <div className="resolution-actions">
                      <button className="outline-action" onClick={() => setExpandedPatch(value => !value)}><TerminalSquare size={15} />{expandedPatch ? "HIDE PATCH" : "VIEW PATCH"}</button>
                      <button className="outline-action" onClick={exportPatch}><ArrowDownToLine size={15} />EXPORT PATCH</button>
                      <button className="outline-action" disabled={revalidationMutation.isPending} onClick={() => revalidationMutation.mutate({ repositoryPath, sourceBranch, targetBranch, validationProfile, strategy: selectedCandidate.strategy })}><RotateCcw size={15} />{revalidationMutation.isPending ? "REVALIDATING" : "REVALIDATE"}</button>
                      <button className="primary-action apply" disabled={selectedCandidate.decision === "rejected" || selectionMutation.isPending} onClick={() => selectionMutation.mutate({ analysisId: analysis!.id, candidateId: selectedCandidate.id })}><ShieldCheck size={15} />{selectedCandidate.decision === "rejected" ? "REJECTED" : "MARK APPLY-READY"}</button>
                    </div>
                  </div>
                  <div className="patch-window"><div className="code-window-bar"><b>APPLY-READY PATCH</b><em>unified diff</em></div><pre>{expandedPatch ? selectedCandidate.patch || "No source changes required." : selectedCandidate.validation.output || "Validation output will appear here."}</pre></div>
                </div>
              ) : <div className="empty-technical compact"><ShieldCheck size={24} /><p>Select a proposal to review its test evidence and apply-ready patch.</p></div>}
            </section>
          </div>
        )}

        {activePanel === "history" && (
          <section className="ledger-page blueprint-card">
            <div className="card-title-row"><div><SectionLabel>AUDIT / PERSISTENT DECISION LEDGER</SectionLabel><h2>Resolution history</h2></div><History size={19} className="technical-icon" /></div>
            <p className="ledger-intro">Each completed analysis records branch context, conflict count, candidate scores, validation results, and any candidate selected for application. The ledger is append-only at the decision layer.</p>
            <div className="history-table">
              <div className="history-header"><span>ANALYSIS</span><span>BRANCH PATH</span><span>CONFLICTS</span><span>STATUS</span><span>RECORDED</span></div>
              {sortedHistory.length ? sortedHistory.map(item => <div className="history-row" key={item.id}><span className="history-id">{item.id.slice(0, 8).toUpperCase()}</span><span><b>{item.sourceBranch}</b><ArrowRight size={13} /><b>{item.targetBranch}</b></span><span>{item.conflictCount}</span><span><StatusPill status="passed" /></span><span>{new Date(item.createdAt).toLocaleString()}</span></div>) : <div className="empty-technical"><History size={28} /><p>No completed analyses are in the ledger yet. Run the demo analysis to create the first auditable decision record.</p></div>}
            </div>
          </section>
        )}

        {activePanel === "architecture" && (
          <section className="architecture-page blueprint-card">
            <div className="card-title-row"><div><SectionLabel>ENGINEERING BLUEPRINT / RUNTIME TOPOLOGY</SectionLabel><h2>Resolution execution path</h2></div><Network size={19} className="technical-icon" /></div>
            <div className="architecture-flow">
              {[['01', 'GIT ENGINE', 'GitPython reads the branch graph, merge base, and conflict-prone files.'], ['02', 'AST ENGINE', 'Tree-sitter maps grammar nodes, symbols, and structural risk.'], ['03', 'RESOLUTION ENGINE', 'Safe deterministic strategies and LLM-ready proposals are ranked.'], ['04', 'VALIDATION WORKTREE', 'Allow-listed checks run against disposable candidate workspaces.'], ['05', 'AUDIT LEDGER', 'Analysis facts, scores, outcomes, and selected patches are persisted.']].map(([number, title, copy], index) => <div className="architecture-node" key={title}><span>{number}</span><div><b>{title}</b><p>{copy}</p></div>{index < 4 && <i />}</div>)}
            </div>
            <div className="architecture-note"><Sparkles size={17} /><p><b>LLM safety boundary:</b> an assisted suggestion remains a candidate only. It must receive AST signals and pass the same isolated validation gate before a user can mark it apply-ready.</p></div>
          </section>
        )}
      </main>
    </div>
  );
}
