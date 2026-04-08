import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Word Bridge - Daily Word Chain Puzzle Game';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

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
            fontWeight: 'bold',
            color: '#ffffff',
            letterSpacing: '-0.02em',
            marginBottom: 20,
          }}
        >
          WORD BRIDGE
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: '#818384',
            marginBottom: 60,
          }}
        >
          Connect words in the shortest chain possible
        </div>

        {/* Visual element - word chain example */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              padding: '20px 30px',
              backgroundColor: '#538d4e',
              color: '#ffffff',
              fontSize: 36,
              fontWeight: 'bold',
              borderRadius: 8,
            }}
          >
            CAT
          </div>
          <div
            style={{
              fontSize: 40,
              color: '#538d4e',
            }}
          >
            →
          </div>
          <div
            style={{
              padding: '20px 30px',
              backgroundColor: '#b59f3b',
              color: '#ffffff',
              fontSize: 36,
              fontWeight: 'bold',
              borderRadius: 8,
            }}
          >
            PET
          </div>
          <div
            style={{
              fontSize: 40,
              color: '#538d4e',
            }}
          >
            →
          </div>
          <div
            style={{
              padding: '20px 30px',
              backgroundColor: '#538d4e',
              color: '#ffffff',
              fontSize: 36,
              fontWeight: 'bold',
              borderRadius: 8,
            }}
          >
            DOG
          </div>
        </div>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            marginTop: 60,
            fontSize: 24,
            color: '#818384',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            🎯 Daily Challenge
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            ♾️ Unlimited Practice
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            👥 Multiplayer
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
