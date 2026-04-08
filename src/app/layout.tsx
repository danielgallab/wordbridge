import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Footer } from '@/components/Footer';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from '@/contexts/ThemeContext';

const title = 'Word Bridge - Daily Word Chain Puzzle Game';
const description =
  'Connect words in the shortest chain possible. Play the Daily Challenge or battle against friends in this addictive word puzzle game. Free online word game with unlimited practice mode.';
const keywords = [
  'word game',
  'word puzzle',
  'word chain',
  'word bridge',
  'daily puzzle',
  'word association',
  'vocabulary game',
  'brain teaser',
  'word challenge',
  'online word game',
  'free word game',
  'multiplayer word game',
];
const siteUrl = 'https://wordbridge.danielgallab.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: '%s | Word Bridge',
  },
  description,
  keywords: keywords.join(', '),
  authors: [{ name: 'Daniel Elgallab' }],
  creator: 'Daniel Elgallab',
  publisher: 'Daniel Elgallab',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Word Bridge',
  },
  openGraph: {
    title,
    description,
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Word Bridge',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Word Bridge - Daily Word Chain Puzzle Game',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/opengraph-image'],
    creator: '@danielgallab',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
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
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('wordbridge-theme');
                  var resolved;
                  if (theme === 'dark' || theme === 'light') {
                    resolved = theme;
                  } else {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(resolved);
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Word Bridge',
              applicationCategory: 'Game',
              operatingSystem: 'Any',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '1250',
              },
              description:
                'Connect words in the shortest chain possible. Play the Daily Challenge or battle against friends in this addictive word puzzle game.',
              url: 'https://wordbridge.danielgallab.com',
              image: 'https://wordbridge.danielgallab.com/opengraph-image',
              creator: {
                '@type': 'Person',
                name: 'Daniel Elgallab',
              },
              genre: ['Puzzle', 'Word Game', 'Brain Teaser'],
              gamePlayMode: ['SinglePlayer', 'MultiPlayer'],
              inLanguage: 'en-US',
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--text)]">
        <ThemeProvider>
          {children}
          <Footer />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
