import { healthRouter } from "~/server/api/routers/health";
import { reviewRouter } from "~/server/api/routers/review";
import { translateRouter } from "~/server/api/routers/translate";
import { vocabRouter } from "~/server/api/routers/vocab";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  vocab: vocabRouter,
  translate: translateRouter,
  review: reviewRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
