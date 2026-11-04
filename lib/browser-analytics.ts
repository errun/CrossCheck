import { analyticsQueue, productionAnalytics, testMode } from './tool-events';
type Queue = ((...args: unknown[]) => void) & { q?: unknown[] };
export function bootstrapAnalytics() {
    if (!productionAnalytics()) return;
    try {
    const w = analyticsQueue() as ReturnType<typeof analyticsQueue> & { rfpaiAnalyticsReady?: boolean; rfpaiAnalyticsInitialized?: boolean };
    if (w.rfpaiAnalyticsInitialized) return;
    w.rfpaiAnalyticsInitialized = true;
    const ga = document.createElement('script'); ga.async = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-4M4FRSZPJH';
    ga.onload = () => { w.rfpaiAnalyticsReady = true; };
    document.head.appendChild(ga);
    if (!w.clarity) {
      const clarity: Queue = function (..._args: unknown[]) { if ((clarity.q?.length || 0) < 100) clarity.q?.push(arguments); };
      clarity.q = []; w.clarity = clarity;
    }
    w.clarity('set', 'rfpai_test_mode', testMode());
    const cl = document.createElement('script'); cl.async = true; cl.src = 'https://www.clarity.ms/tag/ui8gq59tt5';
    document.head.appendChild(cl);
    } catch { /* Analytics must never interrupt rendering or document tools. */ }
}
