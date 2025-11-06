export function isUciEmail(email: string): boolean {
  const v = email.trim().toLowerCase();
  if (v.length === 0) return false;
  return /^[^@\s]+@uci\.edu$/.test(v);
}

