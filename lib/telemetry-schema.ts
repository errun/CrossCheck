export type TrackedTool = 'scanner' | 'matrix' | 'writer';
export const reasonCodes = ['MISSING_FILE', 'UNSUPPORTED_FILE', 'FILE_TOO_LARGE', 'INVALID_DOCUMENT', 'NO_DOCUMENT_TEXT', 'DOCUMENT_TOO_LONG', 'CONSENT_REQUIRED', 'FREE_DAILY_QUOTA', 'FREE_MODEL_BUSY', 'FREE_MODEL_REQUIRED', 'FREE_MODEL_UNAVAILABLE', 'INVALID_AI_RESULT', 'KEY_CHECK_FAILED', 'MODEL_CATALOG_UNAVAILABLE', 'MODEL_NOT_CONFIGURED', 'MODEL_TIMEOUT', 'MODEL_UNAVAILABLE', 'PRIVACY_ROUTE_UNAVAILABLE', 'PROCESSING_FAILED', 'PROVIDER_QUOTA', 'NETWORK_ERROR', 'CLIENT_INVALID_RESULT', 'EXPORT_FAILED', 'POPUP_BLOCKED', 'COPY_FAILED', 'UNKNOWN'] as const;
export type ReasonCode = typeof reasonCodes[number];
export function safeReason(value: unknown): ReasonCode {
  return typeof value === 'string' && (reasonCodes as readonly string[]).includes(value) ? value as ReasonCode : 'UNKNOWN';
}
export function boundedMs(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(Math.round(value), 3_600_000) : undefined;
}
