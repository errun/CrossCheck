'use client';
import { useEffect, useMemo } from 'react';
import { createToolJourney } from '@/lib/tool-journey';
import type { TrackedTool } from '@/lib/telemetry-schema';
export function useToolJourney(tool: TrackedTool, lang: 'en' | 'zh') {
  const journey = useMemo(() => createToolJourney(tool, lang), [tool, lang]);
  useEffect(() => {
    journey.view();
    const hide = () => journey.exit(), show = () => journey.resume();
    const timer = window.setInterval(() => journey.wait(document.visibilityState === 'visible'), 5000);
    window.addEventListener('pagehide', hide); window.addEventListener('pageshow', show);
    return () => { window.clearInterval(timer); window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', show); journey.exit(); journey.dispose(); };
  }, [journey]);
  return journey;
}
