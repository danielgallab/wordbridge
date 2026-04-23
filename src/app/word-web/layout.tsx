import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Word Web - Interactive Word Connection Graph | WordBridge',
  description:
    'Explore word connections in an interactive network graph on WordBridge. Visualize how words connect and discover patterns in your word chain gameplay.',
  openGraph: {
    title: 'Word Web - Interactive Word Connection Graph | WordBridge',
    description:
      'Explore word connections in an interactive network graph on WordBridge. Visualize how words connect and discover patterns in your word chain gameplay.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Word Web - Interactive Word Connection Graph | WordBridge',
    description:
      'Explore word connections in an interactive network graph on WordBridge. Visualize how words connect and discover patterns in your word chain gameplay.',
  },
};

export default function WordWebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
