import { NextRequest, NextResponse } from 'next/server';
import { generateBidDraftFromRfp } from '@/lib/gemini';
import { readDocument } from '@/lib/document-input';
import { errorResponse, requirePublicMaterialConsent } from '@/lib/free-ai';
import { toolObservation } from '@/lib/tool-observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  let lang: 'zh' | 'en' = 'zh';
  const observation = toolObservation(request, 'writer');
  try {
    const form = await request.formData();
    lang = form.get('lang') === 'en' ? 'en' : 'zh';
    requirePublicMaterialConsent(form);
    const value = form.get('rfp_file') || form.get('file');
    observation.documentStart();
    const document = await readDocument(value instanceof File ? value : null);
    observation.generationStart();
    const draft = await generateBidDraftFromRfp(document.text, 'default', lang);
    return NextResponse.json({ draft: draft.content }, { headers: observation.finish() });
  } catch (error) {
    const safe = errorResponse(error, lang);
    console.warn('draft_failed', safe.body.code);
    return NextResponse.json(safe.body, { status: safe.status, headers: observation.finish(safe.body.code) });
  }
}
