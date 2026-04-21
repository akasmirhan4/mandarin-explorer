import { sql } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { vocabWords } from "~/server/db/schema";

export const healthRouter = createTRPCRouter({
  check: publicProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(vocabWords);
    return {
      ok: true,
      vocabCount: row?.count ?? 0,
      timestamp: new Date().toISOString(),
    };
  }),
});
