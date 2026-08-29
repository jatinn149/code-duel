export const ROOM_CODE_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export const normalizeRoomCode = (code: string): string => {
  // Trim, remove all non-alphanumeric, uppercase
  const cleaned = code.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  // Take first 12 characters
  const truncated = cleaned.slice(0, 12);
  
  // Format as XXXX-XXXX-XXXX
  const parts = truncated.match(/.{1,4}/g) || [];
  return parts.join('-');
};

export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const gen = (length: number) => 
    Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  
  return `${gen(4)}-${gen(4)}-${gen(4)}`;
};
