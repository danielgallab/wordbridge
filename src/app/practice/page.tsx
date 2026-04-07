import { PracticeMode } from '@/components/practice/PracticeMode';
import { getPracticeData } from '@/lib/daily.server';

// Generate fresh puzzle on each request
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Practice Mode - WORDBRIDGE',
  description: 'Practice word association with unlimited random puzzles',
};

export default async function PracticePage() {
  const practiceData = await getPracticeData();

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md pt-8 sm:pt-12">
        {/* Logo */}
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 tracking-tight">
          WORDBRIDGE
        </h1>
        <p className="text-center text-[var(--text-muted)] text-xs sm:text-sm mb-6 sm:mb-8">
          Practice with unlimited random puzzles
        </p>

        {/* Practice Mode */}
        <PracticeMode initialData={practiceData} />
      </div>
    </main>
  );
}
