import { DailyChallenge } from '@/components/daily';
import { getSessionId } from '@/lib/sessionId.server';
import { getDailyData, getShareCompletion } from '@/lib/daily.server';
import { HomeClient } from '@/components/HomeClient';
import type { ShareCompletion } from '@/lib/daily.server';

interface HomeProps {
  searchParams: Promise<{ share?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const sessionId = await getSessionId();
  const dailyData = await getDailyData(sessionId);

  // Fetch shared completion if share ID is in the URL
  let shareData: ShareCompletion | null = null;
  if (params.share) {
    shareData = await getShareCompletion(params.share);
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md pt-8 sm:pt-12">
        {/* Logo */}
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 tracking-tight">
          WORDBRIDGE
        </h1>
        <p className="text-center text-[var(--text-muted)] text-xs sm:text-sm mb-1">
          Connect words in the shortest chain
        </p>
        <p className="text-center text-[var(--text-muted)] text-[10px] sm:text-xs mb-6 sm:mb-8 opacity-70">
          A free daily word chain puzzle game
        </p>

        {/* Daily Challenge */}
        <DailyChallenge initialData={dailyData} shareData={shareData} />

        {/* Footer links */}
        <HomeClient />
      </div>
    </main>
  );
}
