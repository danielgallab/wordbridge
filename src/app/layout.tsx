import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Footer } from '@/components/Footer';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from '@/contexts/ThemeContext';

const title = 'WordBridge - Daily Word Chain Puzzle Game by Daniel Elgallab';
const description =
  'WordBridge is a free online word chain puzzle game by Daniel Elgallab. Connect words in the shortest chain possible! Play the Daily Challenge, practice with unlimited puzzles, or battle friends in multiplayer mode.';
const keywords = [
  'wordbridge',
  'word bridge',
  'word bridge game',
  'word game',
  'word puzzle',
  'word chain',
  'word chain game',
  'daily word puzzle',
  'word association game',
  'vocabulary game',
  'brain teaser',
  'word challenge',
  'online word game',
  'free word game',
  'multiplayer word game',
  'daniel elgallab',
  'word bridge daniel elgallab',
  'daily word game',
  'word connection game',
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
    siteName: 'WordBridge',
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
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'WordBridge',
                alternateName: ['Word Bridge', 'WordBridge Game'],
                url: 'https://wordbridge.danielgallab.com',
                description:
                  'WordBridge is a free online word chain puzzle game. Connect words in the shortest chain possible!',
                creator: {
                  '@type': 'Person',
                  name: 'Daniel Elgallab',
                  url: 'https://danielgallab.com',
                },
                inLanguage: 'en-US',
              },
              {
                '@context': 'https://schema.org',
                '@type': 'WebApplication',
                name: 'WordBridge',
                alternateName: 'Word Bridge',
                applicationCategory: 'GameApplication',
                operatingSystem: 'Any',
                browserRequirements: 'Requires a modern web browser',
                offers: {
                  '@type': 'Offer',
                  price: '0',
                  priceCurrency: 'USD',
                },
                description:
                  'WordBridge is a free online word chain puzzle game by Daniel Elgallab. Connect words in the shortest chain possible! Play daily challenges, practice mode, or multiplayer.',
                url: 'https://wordbridge.danielgallab.com',
                image: 'https://wordbridge.danielgallab.com/opengraph-image',
                author: {
                  '@type': 'Person',
                  name: 'Daniel Elgallab',
                  url: 'https://danielgallab.com',
                },
                creator: {
                  '@type': 'Person',
                  name: 'Daniel Elgallab',
                  url: 'https://danielgallab.com',
                },
                genre: ['Puzzle', 'Word Game', 'Brain Teaser'],
                gamePlayMode: ['SinglePlayer', 'MultiPlayer'],
                inLanguage: 'en-US',
              },
            ]),
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
