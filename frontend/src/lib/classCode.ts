/** Class join codes are 6 capital letters/digits, typed as you go ("zm7-a92" → "ZM7A92"). */
export const CLASS_CODE_LENGTH = 6;

export function cleanClassCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CLASS_CODE_LENGTH);
}
