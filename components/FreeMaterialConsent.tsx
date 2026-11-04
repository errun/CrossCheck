'use client';
import type { Language } from '@/types';

export function FreeMaterialConsent({ lang, checked, onChange }: { lang: Language; checked: boolean; onChange: (value: boolean) => void }) {
  return <label data-clarity-unmask="true" className="my-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-slate-800">
    <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
    <span>{lang === 'zh' ? '免费版仅处理公开或虚构材料。我确认材料不含保密或个人信息，并知晓免费模型提供方可能留存材料并用于训练。' : 'Free version: public or fictional material only. I confirm this contains no confidential or personal data and acknowledge the free model provider may retain it and use it for training.'}</span>
  </label>;
}
