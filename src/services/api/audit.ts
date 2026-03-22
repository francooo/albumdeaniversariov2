import { sql } from '../../db/connection';

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Log an audit event
export async function logAuditEvent(
  userId: string,
  action: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  if (!sql) throw new Error('Database not available');
  
  await sql`
    INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent)
    VALUES (${userId}, ${action}, ${details ? JSON.stringify(details) : null}, ${ipAddress || null}, ${userAgent || null})
  `;
}

// Get audit logs for a user
export async function getUserAuditLogs(userId: string, limit: number = 50): Promise<AuditLog[]> {
  if (!sql) throw new Error('Database not available');
  
  const result = await sql`
    SELECT * FROM audit_logs 
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  
  return result as AuditLog[];
}

// Get specific action logs
export async function getAuditLogsByAction(action: string, limit: number = 100): Promise<AuditLog[]> {
  if (!sql) throw new Error('Database not available');
  
  const result = await sql`
    SELECT * FROM audit_logs 
    WHERE action = ${action}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  
  return result as AuditLog[];
}

// Common audit actions
export const AuditActions = {
  // Privacy settings
  PROFILE_VISIBILITY_CHANGED: 'profile_visibility_changed',
  ALBUMS_VISIBILITY_CHANGED: 'albums_visibility_changed',
  EMAIL_VISIBILITY_CHANGED: 'email_visibility_changed',
  
  // Notifications
  EMAIL_NOTIFICATIONS_CHANGED: 'email_notifications_changed',
  MARKETING_EMAILS_OPT_IN: 'marketing_emails_opt_in',
  MARKETING_EMAILS_OPT_OUT: 'marketing_emails_opt_out',
  
  // Data & Security
  DATA_EXPORT_REQUESTED: 'data_export_requested',
  DATA_EXPORT_COMPLETED: 'data_export_completed',
  DATA_EXPORT_DOWNLOADED: 'data_export_downloaded',
  
  // Account
  ACCOUNT_DELETION_REQUESTED: 'account_deletion_requested',
  ACCOUNT_DELETION_CANCELLED: 'account_deletion_cancelled',
  ACCOUNT_DELETION_COMPLETED: 'account_deletion_completed',
  
  // Auth
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  PASSWORD_CHANGED: 'password_changed',
  
  // Profile
  PROFILE_UPDATED: 'profile_updated',
  AVATAR_UPDATED: 'avatar_updated',
} as const;
