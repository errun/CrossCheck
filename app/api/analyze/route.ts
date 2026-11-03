import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { analyzeWithGemini, extractComplianceMatrix } from '@/lib/gemini';
import { readDocument } from '@/lib/document-input';
import { errorResponse, requirePublicMaterialConsent } from '@/lib/free-ai';
import { cacheManager } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  let lang: 'zh' | 'en' = 'zh';
  try {
    const form = await request.formData();
    lang = form.get('lang') === 'en' ? 'en' : 'zh';
    requirePublicMaterialConsent(form);
    const value = form.get('file');
    const document = await readDocument(value instanceof File ? value : null);
    const docId = randomUUID();
    if (form.get('mode') === 'matrix') {
      const result = await extractComplianceMatrix(document.text, 'default', lang);
      return NextResponse.json({ doc_id: docId, total_pages: document.pages, ...result }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const result = await analyzeWithGemini(document.text, 'default', lang);
    cacheManager.set(docId, { doc_id: docId, total_pages: document.pages, errors: result.errors, status: 'completed', created_at: Date.now() });
    return NextResponse.json({ doc_id: docId, total_pages: document.pages, ...result, error_count: result.errors.length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const safe = errorResponse(error, lang);
    console.warn('analysis_failed', safe.body.code);
    return NextResponse.json(safe.body, { status: safe.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
