'use client';
import { useEffect } from 'react';
import { bootstrapAnalytics } from '@/lib/browser-analytics';
export function ProductionAnalytics() {
  useEffect(bootstrapAnalytics, []);
  return null;
}
