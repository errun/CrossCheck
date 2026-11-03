'use client';
import { resourceEvent } from '@/lib/tool-events';
import { resourceDownloads, type ResourceId } from '@/lib/resources';
import type { Language } from '@/types';
export function ResourceDownload({ resource, lang, label, note }: { resource: ResourceId; lang: Language; label: string; note: string }) {
  return <a href={resourceDownloads[resource]} download onClick={() => resourceEvent(resource, lang)} className="group rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"><span className="block font-semibold text-blue-800 group-hover:underline">{label} <span aria-hidden="true">↓</span></span><span className="mt-1 block text-sm leading-6 text-slate-600">{note}</span></a>;
}
