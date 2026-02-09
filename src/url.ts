export function isUrl(input: string): boolean {
  if (/^[^\s]+\.[^\s]+$/.test(input)) return true;
  if (/^https?:\/\//i.test(input)) return true;
  if (/^localhost(:\d+)?/i.test(input)) return true;
  return false;
}

export function resolveInput(input: string): string {
  if (isUrl(input)) {
    return input.startsWith('http://') || input.startsWith('https://')
      ? input
      : 'https://' + input;
  }
  return 'https://www.google.com/search?q=' + encodeURIComponent(input);
}
