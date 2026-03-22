import { sql } from '../../db/connection';
import { nanoid } from 'nanoid';

export interface AlbumShare {
  id: string;
  album_id: string;
  user_id: string | null;
  permission: 'viewer' | 'commenter' | 'editor';
  share_token: string;
  link_active: boolean;
  access_type: string;
  invited_by: string | null;
  claimed_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface ShareView {
  id: string;
  album_id: string;
  share_token: string;
  user_id: string | null;
  ip_hash: string;
  viewed_at: string;
}

// Flag to track if tables have been initialized
let tablesInitialized = false;
let migrationsStarted = false;

// Run column migrations in parallel (non-blocking, fire-and-forget)
export function runColumnMigrations(): void {
  if (migrationsStarted || !sql) return;
  migrationsStarted = true;

  const migrations = [
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS public_name VARCHAR(255)`,
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`,
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS birth_date DATE`,
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN DEFAULT false`,
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS albums_public BOOLEAN DEFAULT false`,
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT false`,
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true`,
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS marketing_emails BOOLEAN DEFAULT false`,
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS marketing_opt_in_at TIMESTAMP WITH TIME ZONE`,
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS marketing_opt_out_at TIMESTAMP WITH TIME ZONE`,
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`,
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE`,
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`,
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)`,
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS avatar_url TEXT`,
    sql`CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_idx ON users (google_id) WHERE google_id IS NOT NULL`,
    sql`ALTER TABLE IF EXISTS sections ADD COLUMN IF NOT EXISTS image_url TEXT`,
  ];

  Promise.all(migrations)
    .then(() => console.log('Column migrations applied successfully'))
    .catch((err) => console.warn('Column migrations (some may already exist):', err?.message));
}

// Initialize sharing tables if they don't exist
async function ensureShareTablesExist(): Promise<void> {
  if (tablesInitialized || !sql) return;

  try {
    // Create album_shares table
    await sql`
      CREATE TABLE IF NOT EXISTS album_shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        permission VARCHAR(20) NOT NULL DEFAULT 'viewer',
        share_token VARCHAR(64) UNIQUE,
        link_active BOOLEAN DEFAULT true,
        access_type VARCHAR(20) DEFAULT 'public_link',
        invited_by UUID REFERENCES users(id),
        claimed_at TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE,
        CONSTRAINT chk_public_link_permission 
          CHECK (access_type != 'public_link' OR permission = 'viewer')
      )
    `;

    // Create album_share_views table for analytics
    await sql`
      CREATE TABLE IF NOT EXISTS album_share_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
        share_token VARCHAR(64),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ip_hash VARCHAR(64),
        viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for better performance
    await Promise.all([
      sql`CREATE INDEX IF NOT EXISTS idx_album_shares_token ON album_shares(share_token)`,
      sql`CREATE INDEX IF NOT EXISTS idx_album_shares_album ON album_shares(album_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_album_share_views_album ON album_share_views(album_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_album_share_views_token ON album_share_views(share_token)`,
    ]);

    tablesInitialized = true;
    console.log('Share tables initialized successfully');
  } catch (error) {
    console.error('Error initializing share tables:', error);
    tablesInitialized = true;
  }

  // Run column migrations in the background (non-blocking)
  runColumnMigrations();
}

// Generate a new share token for an album (or return existing)
export async function generateShareToken(albumId: string): Promise<string> {
  if (!sql) throw new Error('Database not available');

  // Ensure tables exist
  await ensureShareTablesExist();

  // Check if share token already exists
  const existingShare = await sql`
    SELECT share_token FROM album_shares 
    WHERE album_id = ${albumId} AND access_type = 'public_link'
    LIMIT 1
  `;

  if (existingShare[0]) {
    // Return existing token
    return (existingShare[0] as AlbumShare).share_token;
  }

  // Generate new token
  const token = nanoid(24);

  await sql`
    INSERT INTO album_shares (
      album_id, share_token, link_active, access_type, permission
    ) VALUES (
      ${albumId}, ${token}, true, 'public_link', 'viewer'
    )
  `;

  return token;
}

// Get share info by token
export async function getShareByToken(token: string): Promise<AlbumShare | null> {
  if (!sql) throw new Error('Database not available');

  // Ensure tables exist
  await ensureShareTablesExist();

  const result = await sql`
    SELECT * FROM album_shares 
    WHERE share_token = ${token}
    LIMIT 1
  `;

  return result[0] as AlbumShare || null;
}

// Get share link status for an album
export async function getShareLinkStatus(albumId: string): Promise<{ token: string | null; isActive: boolean }> {
  if (!sql) throw new Error('Database not available');

  // Ensure tables exist
  await ensureShareTablesExist();

  const result = await sql`
    SELECT share_token, link_active 
    FROM album_shares 
    WHERE album_id = ${albumId} AND access_type = 'public_link'
    LIMIT 1
  `;

  if (result[0]) {
    return {
      token: (result[0] as AlbumShare).share_token,
      isActive: (result[0] as AlbumShare).link_active
    };
  }

  return { token: null, isActive: false };
}

// Validate share token and return album data (public-safe fields only)
export async function validateShareToken(token: string): Promise<{
  valid: boolean;
  album: any | null;
  ownerName: string;
  error?: string;
}> {
  if (!sql) throw new Error('Database not available');

  const share = await getShareByToken(token);

  if (!share) {
    return { valid: false, album: null, ownerName: '', error: 'not_found' };
  }

  if (!share.link_active) {
    return { valid: false, album: null, ownerName: '', error: 'inactive' };
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return { valid: false, album: null, ownerName: '', error: 'expired' };
  }

  // Get album data — only public-safe fields, no internal identifiers
  let albumResult: any[];
  try {
    albumResult = await sql`
      SELECT 
        a.id,
        a.title,
        a.subtitle,
        a.description,
        a.cover_image_url,
        a.created_at,
        COALESCE(NULLIF(u.public_name, ''), u.name) AS owner_name
      FROM albums a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ${share.album_id}
    `;
  } catch {
    // Fallback: public_name column may not exist yet, use only name
    albumResult = await sql`
      SELECT 
        a.id,
        a.title,
        a.subtitle,
        a.description,
        a.cover_image_url,
        a.created_at,
        u.name AS owner_name
      FROM albums a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ${share.album_id}
    `;
  }

  if (!albumResult[0]) {
    return { valid: false, album: null, ownerName: '', error: 'not_found' };
  }

  const row = albumResult[0] as any;
  const ownerName: string = row.owner_name ?? '';
  const { owner_name, ...publicAlbum } = row;

  return {
    valid: true,
    album: publicAlbum,
    ownerName,
  };
}

// Toggle share link active status
export async function toggleShareLink(albumId: string, active: boolean): Promise<boolean> {
  if (!sql) throw new Error('Database not available');

  // Ensure tables exist
  await ensureShareTablesExist();

  await sql`
    UPDATE album_shares 
    SET link_active = ${active}
    WHERE album_id = ${albumId} AND access_type = 'public_link'
  `;

  return true;
}

// Claim album share after user registration/login
export async function claimAlbumShare(
  token: string,
  userId: string
): Promise<{ success: boolean; albumId?: string; error?: string }> {
  if (!sql) throw new Error('Database not available');

  const share = await getShareByToken(token);

  if (!share) {
    return { success: false, error: 'Token not found' };
  }

  if (!share.link_active) {
    return { success: false, error: 'Link is inactive' };
  }

  // Check if user is the owner
  const albumCheck = await sql`
    SELECT user_id FROM albums WHERE id = ${share.album_id}
  `;

  if (albumCheck[0] && (albumCheck[0] as any).user_id === userId) {
    return { success: false, error: 'Cannot claim your own album' };
  }

  // Check if already claimed by this user
  const existingClaim = await sql`
    SELECT id FROM album_shares 
    WHERE album_id = ${share.album_id} 
    AND user_id = ${userId}
    LIMIT 1
  `;

  if (existingClaim[0]) {
    // Already claimed, return success
    return { success: true, albumId: share.album_id };
  }

  // Create new share record for this user
  await sql`
    INSERT INTO album_shares (
      album_id, user_id, permission, access_type, claimed_at
    ) VALUES (
      ${share.album_id}, ${userId}, 'viewer', 'public_link', CURRENT_TIMESTAMP
    )
  `;

  return { success: true, albumId: share.album_id };
}

// Record a view of the shared album
export async function recordShareView(
  albumId: string,
  token: string,
  userId: string | null,
  ipAddress: string
): Promise<void> {
  if (!sql) throw new Error('Database not available');

  // Hash the IP for privacy (LGPD compliance)
  const ipHash = await hashIp(ipAddress);

  await sql`
    INSERT INTO album_share_views (
      album_id, share_token, user_id, ip_hash
    ) VALUES (
      ${albumId}, ${token}, ${userId}, ${ipHash}
    )
  `;
}

// Get share statistics for an album
export async function getShareStats(albumId: string): Promise<{
  totalViews: number;
  uniqueViews: number;
  claimedByUsers: number;
}> {
  if (!sql) throw new Error('Database not available');

  // Ensure tables exist
  await ensureShareTablesExist();

  const viewStats = await sql`
    SELECT 
      COUNT(*) as total_views,
      COUNT(DISTINCT ip_hash) as unique_views
    FROM album_share_views
    WHERE album_id = ${albumId}
  `;

  const claimedStats = await sql`
    SELECT COUNT(*) as claimed_count
    FROM album_shares
    WHERE album_id = ${albumId} 
    AND user_id IS NOT NULL
    AND claimed_at IS NOT NULL
  `;

  return {
    totalViews: Number(viewStats[0]?.total_views || 0),
    uniqueViews: Number(viewStats[0]?.unique_views || 0),
    claimedByUsers: Number(claimedStats[0]?.claimed_count || 0)
  };
}

// Get all albums shared with a user
export async function getSharedAlbums(userId: string): Promise<any[]> {
  if (!sql) throw new Error('Database not available');

  const result = await sql`
    SELECT 
      a.*,
      COALESCE(NULLIF(u.public_name, ''), u.name) as owner_name,
      s.permission,
      s.claimed_at
    FROM album_shares s
    JOIN albums a ON s.album_id = a.id
    JOIN users u ON a.user_id = u.id
    WHERE s.user_id = ${userId}
    AND a.user_id != ${userId}
    ORDER BY s.claimed_at DESC
  `;

  return result;
}

// Helper function to hash IP address
async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'album-salt-key');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}