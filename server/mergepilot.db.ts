import { desc, eq } from "drizzle-orm";
import { mergeAnalyses, mergeConflicts, resolutionCandidates, resolutionEvents } from "../drizzle/schema";
import type { MergePilotAnalysis } from "./mergepilot";
import { getDb } from "./db";

export async function persistAnalysis(analysis: MergePilotAnalysis, userId?: number) {
  const db = await getDb();
  if (!db) return;

  await db.insert(mergeAnalyses).values({
    id: analysis.id,
    userId,
    repositoryPath: analysis.repositoryPath,
    sourceBranch: analysis.sourceBranch,
    targetBranch: analysis.targetBranch,
    mergeBase: analysis.mergeBase,
    status: "completed",
    conflictCount: analysis.summary.conflictCount,
    summary: analysis.summary,
  });
  await db.insert(resolutionEvents).values({
    analysisId: analysis.id,
    eventType: "analysis_created",
    details: { sourceBranch: analysis.sourceBranch, targetBranch: analysis.targetBranch },
  });

  for (const conflict of analysis.conflicts) {
    await db.insert(mergeConflicts).values({
      id: conflict.id,
      analysisId: analysis.id,
      filePath: conflict.path,
      classification: conflict.classification,
      risk: conflict.risk,
      explanation: conflict.explanation,
      astSummary: conflict.ast,
    });
    for (const candidate of conflict.candidates) {
      await db.insert(resolutionCandidates).values({
        id: candidate.id,
        analysisId: analysis.id,
        conflictId: conflict.id,
        strategy: candidate.strategy,
        label: candidate.label,
        score: candidate.score,
        decision: candidate.decision,
        scoreExplanation: candidate.scoreExplanation,
        validation: candidate.validation,
        patch: candidate.patch,
        payload: candidate,
      });
    }
  }
}

export async function listAnalysisHistory() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mergeAnalyses).orderBy(desc(mergeAnalyses.createdAt)).limit(25);
}

export async function selectCandidate(analysisId: string, candidateId: string) {
  const db = await getDb();
  if (!db) return false;
  await db.update(resolutionCandidates).set({ selectedAt: new Date() }).where(eq(resolutionCandidates.id, candidateId));
  await db.insert(resolutionEvents).values({
    analysisId,
    candidateId,
    eventType: "candidate_selected",
    details: { selectedAt: new Date().toISOString() },
  });
  return true;
}

export async function getCandidatePatch(candidateId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ patch: resolutionCandidates.patch, label: resolutionCandidates.label })
    .from(resolutionCandidates)
    .where(eq(resolutionCandidates.id, candidateId))
    .limit(1);
  return rows[0] ?? null;
}
