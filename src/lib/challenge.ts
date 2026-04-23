/** Encode/decode challenge data for share links.
 *  Format: base64url JSON with compact keys to keep URLs short.
 */

export interface ChallengeData {
  chain: string[];
  attempts: { valid: boolean }[];
}

interface CompactChallenge {
  /** chain words */
  c: string[];
  /** attempts as 1/0 array */
  a: number[];
}

export function encodeChallenge(data: ChallengeData): string {
  const compact: CompactChallenge = {
    c: data.chain,
    a: data.attempts.map(a => a.valid ? 1 : 0),
  };
  const json = JSON.stringify(compact);
  // Use base64url encoding (URL-safe)
  if (typeof window !== 'undefined') {
    return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return Buffer.from(json).toString('base64url');
}

export function decodeChallenge(encoded: string): ChallengeData | null {
  try {
    // Restore base64 padding and standard chars
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';

    let json: string;
    if (typeof window !== 'undefined') {
      json = atob(b64);
    } else {
      json = Buffer.from(encoded, 'base64url').toString();
    }

    const compact: CompactChallenge = JSON.parse(json);
    if (!Array.isArray(compact.c) || !Array.isArray(compact.a)) return null;

    return {
      chain: compact.c,
      attempts: compact.a.map(v => ({ valid: v === 1 })),
    };
  } catch {
    return null;
  }
}
