import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Play WordBridge - Multiplayer Word Chain Game',
  description:
    'Join a WordBridge multiplayer game room. Race against friends to connect words in the shortest chain possible.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
