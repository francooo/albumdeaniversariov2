import { sql } from '../../db/connection';

export interface User {
  id: string;
  email: string;
  name: string;
  public_name?: string;
  birth_date?: string;
  phone?: string;
  avatar_url?: string;
  plan_type: string;
  storage_used: number;
  storage_limit: number;
  is_public_profile: boolean;
  albums_public: boolean;
  show_email: boolean;
  email_notifications: boolean;
  marketing_emails: boolean;
  marketing_opt_in_at?: string;
  marketing_opt_out_at?: string;
  deleted_at?: string;
  deletion_requested_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  birth_date: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name?: string;
  public_name?: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  avatar_url?: string;
}

export interface UpdatePrivacyInput {
  is_public_profile?: boolean;
  albums_public?: boolean;
  show_email?: boolean;
  email_notifications?: boolean;
  marketing_emails?: boolean;
}

// Simple hash function for demo purposes
// In production, use bcrypt or similar
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

// Register a new user
export async function registerUser(input: RegisterInput): Promise<User> {
  if (!sql) throw new Error('Database not available');
  
  // Check if email already exists
  const existing = await sql`SELECT id FROM users WHERE email = ${input.email}`;
  if (existing.length > 0) {
    throw new Error('Email já cadastrado');
  }
  
  const passwordHash = simpleHash(input.password);
  
  const result = await sql`
    INSERT INTO users (name, email, password_hash, birth_date, plan_type, storage_used, storage_limit)
    VALUES (
      ${input.name}, 
      ${input.email}, 
      ${passwordHash}, 
      ${input.birth_date},
      'basic',
      0,
      1073741824
    )
    RETURNING *
  `;
  
  return result[0] as User;
}

// Login user
export async function loginUser(input: LoginInput): Promise<User | null> {
  if (!sql) throw new Error('Database not available');
  
  const passwordHash = simpleHash(input.password);
  
  const result = await sql`
    SELECT * FROM users 
    WHERE email = ${input.email} AND password_hash = ${passwordHash}
  `;
  
  if (result.length === 0) {
    return null;
  }
  
  // Update last login
  await sql`UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ${result[0].id}`;
  
  return result[0] as User;
}

// Login or register user via Google OAuth
export async function loginWithGoogle(googleProfile: {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}): Promise<User> {
  if (!sql) throw new Error('Database not available');

  // Ensure google_id and avatar_url columns exist (safe if already present)
  await Promise.all([
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)`,
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS avatar_url TEXT`,
  ]).catch(() => {});

  const { googleId, email, name, avatarUrl } = googleProfile;

  // 1. Try to find by google_id
  let existing = await sql`
    SELECT * FROM users WHERE google_id = ${googleId} LIMIT 1
  `;

  if (existing.length > 0) {
    // Update last login and avatar
    await sql`
      UPDATE users SET
        updated_at = CURRENT_TIMESTAMP,
        avatar_url = COALESCE(${avatarUrl ?? null}, avatar_url)
      WHERE id = ${existing[0].id}
    `;
    return existing[0] as User;
  }

  // 2. Try to find by email (link Google to existing account)
  existing = await sql`
    SELECT * FROM users WHERE email = ${email} LIMIT 1
  `;

  if (existing.length > 0) {
    await sql`
      UPDATE users SET
        google_id = ${googleId},
        avatar_url = COALESCE(${avatarUrl ?? null}, avatar_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${existing[0].id}
    `;
    const updated = await sql`SELECT * FROM users WHERE id = ${existing[0].id} LIMIT 1`;
    return updated[0] as User;
  }

  // 3. Create new user
  const result = await sql`
    INSERT INTO users (name, email, google_id, avatar_url, plan_type, storage_used, storage_limit)
    VALUES (
      ${name},
      ${email},
      ${googleId},
      ${avatarUrl ?? null},
      'basic',
      0,
      1073741824
    )
    RETURNING *
  `;

  return result[0] as User;
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  if (!sql) throw new Error('Database not available');
  
  const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
  
  return result[0] as User || null;
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  if (!sql) throw new Error('Database not available');
  
  const result = await sql`SELECT * FROM users WHERE email = ${email}`;
  
  return result[0] as User || null;
}

// Update user profile
export async function updateUserProfile(userId: string, input: UpdateProfileInput): Promise<User> {
  if (!sql) throw new Error('Database not available');
  
  const result = await sql`
    UPDATE users 
    SET 
      name = COALESCE(${input.name ?? null}, name),
      public_name = COALESCE(${input.public_name ?? null}, public_name),
      email = COALESCE(${input.email ?? null}, email),
      phone = COALESCE(${input.phone ?? null}, phone),
      birth_date = COALESCE(${input.birth_date ?? null}, birth_date),
      avatar_url = COALESCE(${input.avatar_url ?? null}, avatar_url),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
    RETURNING *
  `;
  
  return result[0] as User;
}

// Update privacy settings with LGPD compliance
export async function updatePrivacySettings(
  userId: string, 
  input: UpdatePrivacyInput,
  ipAddress?: string
): Promise<User> {
  if (!sql) throw new Error('Database not available');
  
  // Handle marketing emails with LGPD timestamps
  let marketingOptInAt = null;
  let marketingOptOutAt = null;
  
  if (input.marketing_emails !== undefined) {
    if (input.marketing_emails) {
      marketingOptInAt = new Date().toISOString();
    } else {
      marketingOptOutAt = new Date().toISOString();
    }
  }
  
  const result = await sql`
    UPDATE users 
    SET 
      is_public_profile = COALESCE(${input.is_public_profile ?? null}, is_public_profile),
      albums_public = COALESCE(${input.albums_public ?? null}, albums_public),
      show_email = COALESCE(${input.show_email ?? null}, show_email),
      email_notifications = COALESCE(${input.email_notifications ?? null}, email_notifications),
      marketing_emails = COALESCE(${input.marketing_emails ?? null}, marketing_emails),
      marketing_opt_in_at = COALESCE(${marketingOptInAt}, marketing_opt_in_at),
      marketing_opt_out_at = COALESCE(${marketingOptOutAt}, marketing_opt_out_at),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
    RETURNING *
  `;
  
  return result[0] as User;
}

// Change password
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  if (!sql) throw new Error('Database not available');
  
  const currentHash = simpleHash(currentPassword);
  
  // Verify current password
  const user = await sql`SELECT id FROM users WHERE id = ${userId} AND password_hash = ${currentHash}`;
  
  if (user.length === 0) {
    return false;
  }
  
  const newHash = simpleHash(newPassword);
  
  await sql`UPDATE users SET password_hash = ${newHash}, updated_at = CURRENT_TIMESTAMP WHERE id = ${userId}`;
  
  return true;
}

// Request data export (LGPD Article 18)
export async function requestDataExport(userId: string): Promise<{ requestId: string; message: string }> {
  if (!sql) throw new Error('Database not available');
  
  // Create export request
  const result = await sql`
    INSERT INTO data_export_requests (user_id, status, expires_at)
    VALUES (${userId}, 'pending', CURRENT_TIMESTAMP + INTERVAL '7 days')
    RETURNING id
  `;
  
  // In a real implementation, this would trigger a background job
  // to compile all user data into a downloadable file
  
  return {
    requestId: result[0].id,
    message: 'Solicitação recebida. Seus dados serão preparados e enviados por e-mail em até 24 horas.'
  };
}

// Get data export status
export async function getDataExportStatus(requestId: string): Promise<{
  status: string;
  fileUrl?: string;
  expiresAt?: string;
}> {
  if (!sql) throw new Error('Database not available');
  
  const result = await sql`
    SELECT status, file_url, expires_at 
    FROM data_export_requests 
    WHERE id = ${requestId}
  `;
  
  if (result.length === 0) {
    throw new Error('Export request not found');
  }
  
  return {
    status: result[0].status,
    fileUrl: result[0].file_url,
    expiresAt: result[0].expires_at
  };
}

// Request account deletion (soft delete with 30-day grace period - LGPD compliance)
export async function requestAccountDeletion(userId: string, confirmationMethod: 'password' | 'text'): Promise<void> {
  if (!sql) throw new Error('Database not available');
  
  // Soft delete: mark for deletion with 30-day grace period
  await sql`
    UPDATE users 
    SET 
      deletion_requested_at = CURRENT_TIMESTAMP,
      deleted_at = CURRENT_TIMESTAMP + INTERVAL '30 days',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
  `;
  
  // In a real implementation, this would:
  // 1. Send confirmation email with cancellation link
  // 2. Schedule hard deletion after 30 days
  // 3. Invalidate all user sessions
}

// Cancel account deletion request
export async function cancelAccountDeletion(userId: string): Promise<void> {
  if (!sql) throw new Error('Database not available');
  
  await sql`
    UPDATE users 
    SET 
      deletion_requested_at = NULL,
      deleted_at = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
  `;
}

// Update user plan
export async function updateUserPlan(userId: string, planType: 'basic' | 'premium'): Promise<User> {
  if (!sql) throw new Error('Database not available');

  const storageLimit = planType === 'premium' ? 5368709120 : 1073741824; // 5GB for premium, 1GB for basic

  const result = await sql`
    UPDATE users 
    SET 
      plan_type = ${planType},
      storage_limit = ${storageLimit},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
    RETURNING *
  `;

  return result[0] as User;
}

// Hard delete user account (for admin use or after grace period)
export async function permanentlyDeleteUserAccount(userId: string): Promise<void> {
  if (!sql) throw new Error('Database not available');
  
  // Delete all user's albums (cascades to sections, pages, etc.)
  await sql`DELETE FROM albums WHERE user_id = ${userId}`;
  
  // Delete data export requests
  await sql`DELETE FROM data_export_requests WHERE user_id = ${userId}`;
  
  // Delete user
  await sql`DELETE FROM users WHERE id = ${userId}`;
}

// Get user statistics for overview
export async function getUserStats(userId: string): Promise<{
  totalAlbums: number;
  totalSections: number;
  totalPhotos: number;
  totalVideos: number;
  storageUsed: number;
  storageLimit: number;
}> {
  if (!sql) throw new Error('Database not available');
  
  const albumStats = await sql`
    SELECT 
      COUNT(DISTINCT a.id) as total_albums,
      COALESCE(SUM(a.total_photos), 0) as total_photos,
      COALESCE(SUM(a.total_videos), 0) as total_videos
    FROM albums a
    WHERE a.user_id = ${userId}
  `;
  
  const sectionStats = await sql`
    SELECT COUNT(*) as total_sections
    FROM sections s
    JOIN albums a ON s.album_id = a.id
    WHERE a.user_id = ${userId}
  `;
  
  const userStats = await sql`
    SELECT storage_used, storage_limit FROM users WHERE id = ${userId}
  `;
  
  return {
    totalAlbums: Number(albumStats[0]?.total_albums || 0),
    totalSections: Number(sectionStats[0]?.total_sections || 0),
    totalPhotos: Number(albumStats[0]?.total_photos || 0),
    totalVideos: Number(albumStats[0]?.total_videos || 0),
    storageUsed: Number(userStats[0]?.storage_used || 0),
    storageLimit: Number(userStats[0]?.storage_limit || 1073741824)
  };
}
