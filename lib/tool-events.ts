/** Task counters only. Never include filenames, document content or bidder details. */
export function toolEvent(tool: 'scanner' | 'matrix' | 'writer', stage: 'start' | 'success' | 'failure') {
  if (typeof window === 'undefined' || !['rfpai.io', 'www.rfpai.io'].includes(window.location.hostname)) return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.('event', `tool_${stage}`, { tool });
}
