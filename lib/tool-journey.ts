import { toolEvent, type ExportFormat } from './tool-events';
import { boundedMs, safeReason, type ReasonCode, type TrackedTool } from './telemetry-schema';
type Phase = 'idle' | 'selected' | 'processing' | 'result' | 'failed';
export function createToolJourney(tool: TrackedTool, lang: 'en' | 'zh', now = () => Date.now()) {
  let phase: Phase = 'idle', started = 0, active = false, reason: ReasonCode = 'UNKNOWN', exited = false, disposed = false;
  let attempt = '', server: Record<string, string | number> = {};
  const waits = new Set<string>(), edits = new Set<string>(), exports = new Map<ExportFormat, number>();
  const event = (stage: Parameters<typeof toolEvent>[1], format?: ExportFormat, p: Record<string, string | number> = {}) => toolEvent(tool, stage, format, { ui_language: lang, phase, ...p });
  const elapsed = () => Math.max(0, now() - started);
  return {
    view() { disposed = false; event('view'); },
    selectFile(file: { name: string; size: number }) {
      phase = 'selected'; exited = false;
      const lower = file.name.toLowerCase(), input_format = lower.endsWith('.pdf') ? 'pdf' : lower.endsWith('.docx') ? 'docx' : 'other';
      const size_bucket = file.size <= 512 * 1024 ? 'under_512kb' : file.size <= 2 * 1024 * 1024 ? 'under_2mb' : file.size <= 4 * 1024 * 1024 ? 'under_4mb' : 'over_4mb';
      event('file_selected', undefined, { input_format, size_bucket });
      const code = input_format === 'other' ? 'UNSUPPORTED_FILE' : file.size > 4 * 1024 * 1024 ? 'FILE_TOO_LARGE' : undefined;
      if (code) { phase = 'failed'; event('file_rejected', undefined, { reason_code: code, input_format, size_bucket }); }
      return code;
    },
    consent(accepted: boolean) { event('consent', undefined, { consent_state: accepted ? 'accepted' : 'revoked' }); },
    begin() {
      started = now(); active = true; reason = 'UNKNOWN'; phase = 'processing'; server = {}; waits.clear(); edits.clear(); exited = false;
      try { attempt = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ''; } catch { attempt = ''; }
      event('start');
    },
    async request(url: string, init: RequestInit) {
      try {
        const headers = new Headers(init.headers); if (attempt) headers.set('x-rfpai-attempt', attempt);
        const response = await fetch(url, { ...init, headers });
        for (const [header, key] of [['x-rfpai-parse-ms', 'parse_ms'], ['x-rfpai-generation-ms', 'generation_ms']]) {
          const raw = response.headers.get(header), value = raw === null ? undefined : boundedMs(Number(raw));
          if (value !== undefined) server[key] = value;
        }
        if (!response.ok) {
          const stage = response.headers.get('x-rfpai-stage'); if (stage && ['request', 'document', 'generation'].includes(stage)) server.failure_stage = stage;
          const data = await response.clone().json().catch(() => null); reason = safeReason(data?.code);
          if (reason === 'UNKNOWN' && response.status === 413) reason = 'FILE_TOO_LARGE';
        }
        return response;
      } catch (error) { reason = 'NETWORK_ERROR'; server.failure_stage = 'network'; throw error; }
    },
    success() { if (!active || disposed) return; active = false; phase = 'result'; event('success', undefined, { elapsed_ms: elapsed(), ...server }); },
    failure(code?: ReasonCode) { if (!active || disposed) return; active = false; phase = 'failed'; event('failure', undefined, { reason_code: code || reason, elapsed_ms: elapsed(), ...server }); },
    invalidResult() { reason = 'CLIENT_INVALID_RESULT'; },
    wait(visible: boolean) {
      if (!active || !visible) return;
      for (const seconds of [15, 30, 60, 120]) if (elapsed() >= seconds * 1000 && !waits.has(`${seconds}s`)) {
        waits.add(`${seconds}s`); event('wait', undefined, { wait_bucket: `${seconds}s`, elapsed_ms: elapsed() });
      }
    },
    exit() { if (exited) return; exited = true; event('exit', undefined, { ...(active ? { elapsed_ms: elapsed() } : {}) }); },
    resume() { exited = false; },
    dispose() { disposed = true; },
    exportBegin(format: ExportFormat) { exports.set(format, now()); event('export_start', format); },
    exportSuccess(format: ExportFormat) { const start = exports.get(format); exports.delete(format); event(format === 'pdf_print' ? 'export_requested' : 'download', format, start === undefined ? {} : { export_ms: Math.max(0, now() - start) }); },
    exportFailure(format: ExportFormat, code: ReasonCode = 'EXPORT_FAILED') { exports.delete(format); event('export_failure', format, { reason_code: code }); },
    copy(success: boolean) { event(success ? 'copy' : 'copy_failure', undefined, success ? {} : { reason_code: 'COPY_FAILED' }); },
    edit(field: 'status' | 'notes') { if (edits.has(field)) return; edits.add(field); event('result_edit', undefined, { edit_field: field }); },
  };
}
export function uploadValidationMessage(code: string, lang: 'en' | 'zh') {
  return code === 'FILE_TOO_LARGE' ? (lang === 'zh' ? '文件超过4MB，请拆分后上传。' : 'The file exceeds 4MB. Split it before uploading.') : (lang === 'zh' ? '仅支持PDF和Word .docx；旧版.doc请先转换。' : 'Use PDF or Word .docx. Convert legacy .doc files first.');
}
