import { resourceDownloads, type ResourceId } from './resources';
type Tool = 'scanner' | 'matrix' | 'writer';
type Stage = 'start' | 'success' | 'failure' | 'download' | 'copy' | 'export_requested';
type Format = 'csv' | 'xlsx_gov' | 'xlsx_enterprise' | 'docx' | 'pdf_print';
function emit(name: string, parameters: Record<string, string>) {
  if (typeof window === 'undefined' || !['rfpai.io', 'www.rfpai.io'].includes(window.location.hostname)) return;
  try {
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    gtag?.('event', name, parameters);
  } catch { /* Analytics must never interrupt document processing or downloads. */ }
}
/** Fixed categories only: never pass filenames, document text, errors or bidder details. */
export function toolEvent(tool: Tool, stage: Stage, format?: Format) {
  if (!['scanner', 'matrix', 'writer'].includes(tool) || !['start', 'success', 'failure', 'download', 'copy', 'export_requested'].includes(stage)) return;
  const parameters: Record<string, string> = { tool };
  if (format && ['csv', 'xlsx_gov', 'xlsx_enterprise', 'docx', 'pdf_print'].includes(format)) parameters.file_format = format;
  emit(`tool_${stage}`, parameters);
}
export function resourceEvent(resource: ResourceId, language: 'zh' | 'en') {
  if (!Object.prototype.hasOwnProperty.call(resourceDownloads, resource) || !['zh', 'en'].includes(language)) return;
  emit('resource_download', { resource, language });
}
