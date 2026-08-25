import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getCandidatePatch, listAnalysisHistory, persistAnalysis, selectCandidate } from "./mergepilot.db";
import { runMergePilotAnalysis } from "./mergepilot";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  mergepilot: router({
    analyze: publicProcedure
      .input(z.object({
        repositoryPath: z.string().min(1),
        sourceBranch: z.string().min(1),
        targetBranch: z.string().min(1),
        validationProfile: z.enum(["demo-node", "python-unit", "none"]).default("demo-node"),
      }))
      .mutation(async ({ input, ctx }) => {
        const analysis = await runMergePilotAnalysis(input);
        await persistAnalysis(analysis, ctx.user?.id);
        return analysis;
      }),
    history: publicProcedure.query(async () => listAnalysisHistory()),
    selectCandidate: publicProcedure
      .input(z.object({ analysisId: z.string().min(1), candidateId: z.string().min(1) }))
      .mutation(async ({ input }) => ({ persisted: await selectCandidate(input.analysisId, input.candidateId) })),
    revalidate: publicProcedure
      .input(z.object({
        repositoryPath: z.string().min(1),
        sourceBranch: z.string().min(1),
        targetBranch: z.string().min(1),
        validationProfile: z.enum(["demo-node", "python-unit", "none"]),
        strategy: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const analysis = await runMergePilotAnalysis(input);
        await persistAnalysis(analysis, ctx.user?.id);
        const matchingCandidate = analysis.conflicts.flatMap(conflict => conflict.candidates)
          .find(candidate => candidate.strategy === input.strategy);
        if (!matchingCandidate) throw new Error("The requested candidate strategy was not produced by this analysis.");
        return { analysis, candidate: matchingCandidate };
      }),
    patch: publicProcedure
      .input(z.object({ candidateId: z.string().min(1) }))
      .query(async ({ input }) => getCandidatePatch(input.candidateId)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
