import { TabsShell } from "~/components/tabs-shell";
import { api, HydrateClient } from "~/trpc/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  void api.vocab.list.prefetch({ limit: 200, offset: 0 });
  void api.vocab.count.prefetch();

  return (
    <HydrateClient>
      <main className="min-h-screen">
        <div className="mx-auto max-w-[960px] px-5 pt-6 pb-20">
          <header className="animate-fade-up mb-2 text-center">
            <h1 className="app-header-title font-chinese mb-0.5 text-[38px] leading-none font-black max-[740px]:text-[30px]">
              词语探索
            </h1>
            <p className="text-text2 text-sm">
              Translate, learn strokes & pronunciation, build your vocabulary
            </p>
          </header>
          <TabsShell />
        </div>
      </main>
    </HydrateClient>
  );
}
