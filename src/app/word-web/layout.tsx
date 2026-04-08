import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Word Web - Interactive Word Connection Visualization',
  description:
    'Explore your word connections in an interactive network graph. Visualize how words connect and discover patterns in your word association gameplay.',
  openGraph: {
    title: 'Word Web - Interactive Word Connection Visualization',
    description:
      'Explore your word connections in an interactive network graph. Visualize how words connect and discover patterns in your word association gameplay.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Word Web - Interactive Word Connection Visualization',
    description:
      'Explore your word connections in an interactive network graph. Visualize how words connect and discover patterns in your word association gameplay.',
  },
};

export default function WordWebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
