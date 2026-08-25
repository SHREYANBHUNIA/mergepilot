import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const mergeAnalyses = mysqlTable("merge_analyses", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId"),
  repositoryPath: varchar("repositoryPath", { length: 1024 }).notNull(),
  sourceBranch: varchar("sourceBranch", { length: 255 }).notNull(),
  targetBranch: varchar("targetBranch", { length: 255 }).notNull(),
  mergeBase: varchar("mergeBase", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["completed", "failed"]).notNull(),
  conflictCount: int("conflictCount").notNull().default(0),
  summary: json("summary").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const mergeConflicts = mysqlTable("merge_conflicts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  analysisId: varchar("analysisId", { length: 64 }).notNull(),
  filePath: varchar("filePath", { length: 1024 }).notNull(),
  classification: mysqlEnum("classification", ["syntactic", "semantic", "mixed"]).notNull(),
  risk: mysqlEnum("risk", ["low", "medium", "high"]).notNull(),
  explanation: text("explanation").notNull(),
  astSummary: json("astSummary").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const resolutionCandidates = mysqlTable("resolution_candidates", {
  id: varchar("id", { length: 64 }).primaryKey(),
  analysisId: varchar("analysisId", { length: 64 }).notNull(),
  conflictId: varchar("conflictId", { length: 64 }).notNull(),
  strategy: varchar("strategy", { length: 96 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  score: int("score").notNull(),
  decision: mysqlEnum("decision", ["recommended", "review", "rejected"]).notNull(),
  scoreExplanation: text("scoreExplanation").notNull(),
  validation: json("validation").notNull(),
  patch: text("patch").notNull(),
  payload: json("payload").notNull(),
  selectedAt: timestamp("selectedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const resolutionEvents = mysqlTable("resolution_events", {
  id: int("id").autoincrement().primaryKey(),
  analysisId: varchar("analysisId", { length: 64 }).notNull(),
  candidateId: varchar("candidateId", { length: 64 }),
  eventType: mysqlEnum("eventType", ["analysis_created", "candidate_selected", "patch_exported"]).notNull(),
  details: json("details").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
