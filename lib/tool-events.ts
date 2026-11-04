import { resourceDownloads, type ResourceId } from './resources';
import { boundedMs, safeReason, type TrackedTool } from './telemetry-schema';
export type ToolStage = 'view' | 'file_selected' | 'file_rejected' | 'consent' | 'start' | 'success' | 'failure' | 'wait' | 'exit' | 'export_start' | 'export_failure' | 'download' | 'copy' | 'copy_failure' | 'export_requested' | 'result_edit';
export type ExportFormat = 'csv' | 'xlsx_gov' | 'xlsx_enterprise' | 'docx' | 'pdf_print';
type Parameters = Record<string, string | number>;
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; rfpaiAnalyticsReady?: boolean; clarity?: (...args: unknown[]) => void };
const stages: ToolStage[] = ['view', 'file_selected', 'file_rejected', 'consent', 'start', 'success', 'failure', 'wait', 'exit', 'export_start', 'export_failure', 'download', 'copy', 'copy_failure', 'export_requested', 'result_edit'];
export function productionAnalytics() {
  return typeof window !== 'undefined' && ['rfpai.io', 'www.rfpai.io'].includes(window.location.hostname);
}
export function testMode(): 'qa' | 'live' {
  if (typeof window === 'undefined') return 'live';
  const flag = new URLSearchParams(window.location.search).get('qa');
  if (flag === '1') { try { window.sessionStorage.setItem('rfpai_qa', '1'); } catch {} return 'qa'; }
  if (flag === '0') { try { window.sessionStorage.removeItem('rfpai_qa'); } catch {} return 'live'; }
  try { return window.sessionStorage.getItem('rfpai_qa') === '1' ? 'qa' : 'live'; } catch { return 'live'; }
}
export function analyticsQueue() {
  const w = window as AnalyticsWindow & { rfpaiGaConfigured?: boolean };
  w.dataLayer = w.dataLayer || [];
  if (!w.gtag) w.gtag = function (..._args: unknown[]) { if (w.rfpaiAnalyticsReady || w.dataLayer!.length < 200) w.dataLayer!.push(arguments); };
  if (!w.rfpaiGaConfigured) {
    w.rfpaiGaConfigured = true;
    w.gtag('js', new Date()); w.gtag('config', 'G-4M4FRSZPJH', { test_mode: testMode() });
  }
  if (!w.clarity) {
    const queue = function (..._args: unknown[]) { if (queue.q.length < 100) queue.q.push(arguments); };
    queue.q = [] as unknown[]; w.clarity = queue;
  }
  return w;
}
function emit(name: string, parameters: Parameters) {
  if (!productionAnalytics()) return;
  try { analyticsQueue().gtag?.('event', name, parameters); } catch { /* Measurement cannot interrupt the tool. */ }
}
/** Only approved categories and bounded numbers; never filenames, content, messages or account IDs. */
export function toolEvent(tool: TrackedTool, stage: ToolStage, format?: ExportFormat, detail: Parameters = {}) {
  if (!['scanner', 'matrix', 'writer'].includes(tool) || !stages.includes(stage)) return;
  const p: Parameters = { tool };
  if (format && ['csv', 'xlsx_gov', 'xlsx_enterprise', 'docx', 'pdf_print'].includes(format)) p.file_format = format;
  for (const key of ['elapsed_ms', 'parse_ms', 'generation_ms', 'export_ms']) {
    const value = boundedMs(detail[key]); if (value !== undefined) p[key] = value;
  }
  const allowed: Record<string, readonly string[]> = {
    failure_stage: ['request', 'document', 'generation', 'network'], ui_language: ['en', 'zh'], input_format: ['pdf', 'docx', 'other'], size_bucket: ['under_512kb', 'under_2mb', 'under_4mb', 'over_4mb'],
    phase: ['idle', 'selected', 'processing', 'result', 'failed'], consent_state: ['accepted', 'revoked'], edit_field: ['status', 'notes'],
    wait_bucket: ['15s', '30s', '60s', '120s'], http_group: ['2xx', '4xx', '5xx', 'network'],
  };
  for (const [key, values] of Object.entries(allowed)) if (typeof detail[key] === 'string' && values.includes(detail[key] as string)) p[key] = detail[key];
  if ('reason_code' in detail) p.reason_code = safeReason(detail.reason_code);
  if (productionAnalytics()) p.test_mode = testMode();
  emit(`tool_${stage}`, p);
  // Use only tool_success for the historical use count; rfpai_* events describe each tool's funnel.
  emit(`rfpai_${tool}_${stage}`, p);
  if (!productionAnalytics()) return;
  try {
    const clarity = (window as AnalyticsWindow).clarity;
    clarity?.('set', 'rfpai_tool', tool); clarity?.('set', 'rfpai_test_mode', p.test_mode);
    if (p.ui_language) clarity?.('set', 'rfpai_language', p.ui_language);
    if (p.reason_code) clarity?.('set', 'rfpai_reason', p.reason_code);
    clarity?.('event', `rfpai_${tool}_${stage}`);
  } catch { /* Clarity is optional and cannot interrupt the tool. */ }
}
export function resourceEvent(resource: ResourceId, language: 'zh' | 'en') {
  if (!Object.prototype.hasOwnProperty.call(resourceDownloads, resource) || !['zh', 'en'].includes(language)) return;
  emit('resource_download', { resource, language, ...(productionAnalytics() ? { test_mode: testMode() } : {}) });
}
