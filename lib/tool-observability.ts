import { randomUUID } from 'node:crypto';
import { safeReason, type TrackedTool } from './telemetry-schema';
/** Operational diagnostics only; no document data, filenames, IPs or upstream errors. */
export function toolObservation(request: Request, initialTool: TrackedTool) {
  const supplied = request.headers.get('x-rfpai-attempt') || '';
  const id = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(supplied) ? supplied : randomUUID();
  const started = Date.now(); let phase = 'request', phaseStarted = started, parseMs = 0, generationMs = 0, tool = initialTool;
  const log = (outcome: string, code?: unknown) => { try { console.info(JSON.stringify({ event: 'rfpai_operation', tool, attempt_id: id, phase, outcome, elapsed_ms: Date.now() - started, phase_ms: Date.now() - phaseStarted, ...(code ? { reason_code: safeReason(code) } : {}) })); } catch {} };
  return {
    tool(value: TrackedTool) { tool = value; },
    documentStart() { phase = 'document'; phaseStarted = Date.now(); },
    generationStart() { parseMs = Date.now() - phaseStarted; log('completed'); phase = 'generation'; phaseStarted = Date.now(); },
    finish(code?: unknown) {
      if (phase === 'document') parseMs = Date.now() - phaseStarted;
      if (phase === 'generation') generationMs = Date.now() - phaseStarted;
      log(code ? 'failed' : 'completed', code);
      return { 'Cache-Control': 'no-store', 'x-rfpai-attempt': id, 'x-rfpai-stage': phase, 'x-rfpai-parse-ms': String(parseMs), 'x-rfpai-generation-ms': String(generationMs), 'Server-Timing': `document;dur=${parseMs}, generation;dur=${generationMs}` };
    },
  };
}
