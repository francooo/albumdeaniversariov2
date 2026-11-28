import { http } from './http';

/** Registra um evento de privacidade da própria conta (o servidor aceita só uma lista fechada de ações). */
export function logAuditEvent(_userId: string, action: string, details?: Record<string, unknown>): Promise<void> {
  return http.post('/me/audit', { action, details });
}

export const AuditActions = {
  PROFILE_VISIBILITY_CHANGED: 'profile_visibility_changed',
  ALBUMS_VISIBILITY_CHANGED: 'albums_visibility_changed',
  EMAIL_VISIBILITY_CHANGED: 'email_visibility_changed',
  EMAIL_NOTIFICATIONS_CHANGED: 'email_notifications_changed',
  MARKETING_EMAILS_OPT_IN: 'marketing_emails_opt_in',
  MARKETING_EMAILS_OPT_OUT: 'marketing_emails_opt_out',
  DATA_EXPORT_REQUESTED: 'data_export_requested',
  ACCOUNT_DELETION_REQUESTED: 'account_deletion_requested',
} as const;
