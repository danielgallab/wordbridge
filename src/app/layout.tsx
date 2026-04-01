import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WordBridge - Word Association Game',
  description: 'Connect words in the shortest chain possible. Challenge friends or play against AI.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--text)]">
        {children}
      </body>
    </html>
  );
}
