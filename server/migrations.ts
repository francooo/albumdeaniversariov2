import type { NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Migrações aditivas e idempotentes (podem rodar várias vezes).
 * Antes rodavam no navegador a cada visita; agora rodam uma vez, por `npm run db:migrate`.
 */
export async function runMigrations(sql: NeonQueryFunction<false, false>): Promise<void> {
  await sql.transaction([
    sql`
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
        CONSTRAINT chk_public_link_permission CHECK (access_type != 'public_link' OR permission = 'viewer')
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS album_share_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
        share_token VARCHAR(64),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ip_hash VARCHAR(64),
        viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `,
    sql`CREATE INDEX IF NOT EXISTS idx_album_shares_token ON album_shares(share_token)`,
    sql`CREATE INDEX IF NOT EXISTS idx_album_shares_album ON album_shares(album_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_album_share_views_album ON album_share_views(album_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_album_share_views_token ON album_share_views(share_token)`,
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
    sql`ALTER TABLE IF EXISTS albums ADD COLUMN IF NOT EXISTS event_date DATE`,
    sql`ALTER TABLE IF EXISTS albums ADD COLUMN IF NOT EXISTS occasion VARCHAR(30)`,
    sql`ALTER TABLE IF EXISTS albums ADD COLUMN IF NOT EXISTS layout VARCHAR(20) DEFAULT 'two'`,
    sql`ALTER TABLE IF EXISTS albums ADD COLUMN IF NOT EXISTS style VARCHAR(20) DEFAULT 'jardim'`,
    sql`ALTER TABLE IF EXISTS media ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT false`,
    sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS default_album_visibility VARCHAR(10) DEFAULT 'link'`,
    sql`CREATE INDEX IF NOT EXISTS idx_media_album ON media(album_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_media_section ON media(section_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email))`,
  ]);
}
