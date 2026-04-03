import { DailyChallenge } from '@/components/daily';
import { getSessionId } from '@/lib/sessionId.server';
import { getDailyData } from '@/lib/daily.server';
import { HomeClient } from '@/components/HomeClient';

export default async function Home() {
  const sessionId = await getSessionId();
  const dailyData = await getDailyData(sessionId);

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md pt-8 sm:pt-12">
        {/* Logo */}
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 tracking-tight">
          WORDBRIDGE
        </h1>
        <p className="text-center text-[var(--text-muted)] text-xs sm:text-sm mb-6 sm:mb-8">
          Connect words in the shortest chain
        </p>

        {/* Daily Challenge */}
        <DailyChallenge initialData={dailyData} />

        {/* Footer links */}
        <HomeClient />
      </div>
    </main>
  );
}
