const CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'; // no ambiguous chars (0/o, 1/l, i)
const CODE_LENGTH = 5;

export function generateShareCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}
