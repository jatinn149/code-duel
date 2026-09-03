export const ROOM_CODE_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export const normalizeRoomCode = (code: string): string => {
  // Trim, remove all non-alphanumeric, uppercase
  let cleaned = code.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  // Canonicalize visually ambiguous characters so human typos never cause "Room Not Found":
  // 'O' (letter) -> '0' (digit zero)
  // 'I' and 'L' (letters) -> '1' (digit one)
  cleaned = cleaned.replace(/O/g, '0').replace(/[IL]/g, '1');

  // Take first 12 characters
  const truncated = cleaned.slice(0, 12);
  
  // Format as XXXX-XXXX-XXXX
  const parts = truncated.match(/.{1,4}/g) || [];
  return parts.join('-');
};

// Safe, human-friendly alphabet that avoids visual confusion:
// Excludes visually ambiguous characters: 0, O, 1, I, L
export const ROOM_CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const generateRoomCode = (): string => {
  const gen = (length: number) => 
    Array.from({ length }, () => ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length))).join('');
  
  return `${gen(4)}-${gen(4)}-${gen(4)}`;
};
