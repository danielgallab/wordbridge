import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Word Bridge - Daily Word Chain Puzzle Game';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// SVG icons matching lucide-react style (24x24 viewBox, stroke-based)
const CalendarIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const DumbbellIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6.5 6.5 11 11" />
    <path d="m21 21-1-1" />
    <path d="m3 3 1 1" />
    <path d="m18 22 4-4" />
    <path d="m2 6 4-4" />
    <path d="m3 10 7-7" />
    <path d="m14 21 7-7" />
  </svg>
);

const SwordsIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
    <line x1="13" x2="19" y1="19" y2="13" />
    <line x1="16" x2="20" y1="16" y2="20" />
    <line x1="19" x2="21" y1="21" y2="19" />
    <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
    <line x1="5" x2="9" y1="14" y2="18" />
    <line x1="7" x2="4" y1="17" y2="20" />
    <line x1="3" x2="5" y1="19" y2="21" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#121213',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            marginBottom: 20,
          }}
        >
          WORDBRIDGE
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: '#818384',
            marginBottom: 50,
          }}
        >
          Connect words in the shortest chain possible
        </div>

        {/* Visual element - word chain from tutorial: SUN → SKY → BLUE → OCEAN → SHARK */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {/* SUN - start word (yellow/present) */}
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: '#b59f3b',
              color: '#ffffff',
              fontSize: 32,
              fontWeight: 'bold',
              borderRadius: 8,
            }}
          >
            SUN
          </div>
          <div style={{ display: 'flex', color: '#818384' }}>
            <ArrowRightIcon />
          </div>
          {/* SKY - intermediate */}
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: '#3a3a3c',
              color: '#ffffff',
              fontSize: 32,
              fontWeight: 'bold',
              borderRadius: 8,
              border: '2px solid #565758',
            }}
          >
            SKY
          </div>
          <div style={{ display: 'flex', color: '#818384' }}>
            <ArrowRightIcon />
          </div>
          {/* BLUE - intermediate */}
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: '#3a3a3c',
              color: '#ffffff',
              fontSize: 32,
              fontWeight: 'bold',
              borderRadius: 8,
              border: '2px solid #565758',
            }}
          >
            BLUE
          </div>
          <div style={{ display: 'flex', color: '#818384' }}>
            <ArrowRightIcon />
          </div>
          {/* OCEAN - intermediate */}
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: '#3a3a3c',
              color: '#ffffff',
              fontSize: 32,
              fontWeight: 'bold',
              borderRadius: 8,
              border: '2px solid #565758',
            }}
          >
            OCEAN
          </div>
          <div style={{ display: 'flex', color: '#818384' }}>
            <ArrowRightIcon />
          </div>
          {/* SHARK - target word (green/correct) */}
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: '#538d4e',
              color: '#ffffff',
              fontSize: 32,
              fontWeight: 'bold',
              borderRadius: 8,
            }}
          >
            SHARK
          </div>
        </div>

        {/* Features with icons */}
        <div
          style={{
            display: 'flex',
            gap: 50,
            marginTop: 50,
            fontSize: 24,
            color: '#818384',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarIcon />
            <span>Daily Challenge</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <DumbbellIcon />
            <span>Practice Mode</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SwordsIcon />
            <span>Multiplayer</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
