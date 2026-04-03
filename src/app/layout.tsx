import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Footer } from '@/components/Footer';

const title = 'Word Bridge';
const description =
  'Connect words in the shortest chain possible. Play the Daily Challenge or battle against friends.';
export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: 'website',
    locale: 'en_US',
    siteName: title,
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <Footer />
      </body>
    </html>
  );
}
