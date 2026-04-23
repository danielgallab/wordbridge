import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Multiplayer Word Chain Game - Play WordBridge With Friends',
  description:
    'Challenge your friends to a word chain battle in WordBridge multiplayer mode. Create a room, share the code, and compete to build the shortest word chain.',
  openGraph: {
    title: 'Multiplayer Word Chain Game - Play WordBridge With Friends',
    description:
      'Challenge your friends to a word chain battle in WordBridge multiplayer mode. Create a room, share the code, and compete to build the shortest word chain.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Multiplayer Word Chain Game - Play WordBridge With Friends',
    description:
      'Challenge your friends to a word chain battle in WordBridge multiplayer mode. Create a room, share the code, and compete to build the shortest word chain.',
  },
};

export default function MultiplayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
