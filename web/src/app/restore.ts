export function restoreLastEvent(getLast: () => string | null, show: (id: string) => void): void {
  const id = getLast();
  if (typeof id === 'string' && id.length > 0) {
    show(id);
  }
}

