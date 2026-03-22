/**
 * Simple Database Initialization Script
 * Run this to set up all tables in your Neon PostgreSQL database
 * Usage: npx tsx src/db/init-simple.ts
 */

import { neon, neonConfig } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

// Enable connection pooling
neonConfig.fetchConnectionCache = true;

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL not found in environment variables');
  console.error('Please set VITE_DATABASE_URL in your .env file');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function initializeDatabase() {
  console.log('Connecting to Neon PostgreSQL...');
  
  try {
    // Test connection
    const result = await sql`SELECT NOW() as current_time`;
    console.log('Connected successfully! Server time:', result[0].current_time);
    
    console.log('\nCreating tables...\n');
    
    // Create extension
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    console.log('✓ UUID extension enabled');
    
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        google_id VARCHAR(255) UNIQUE,
        plan_type VARCHAR(50) DEFAULT 'free',
        storage_used BIGINT DEFAULT 0,
        storage_limit BIGINT DEFAULT 5368709120,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      )
    `;
    console.log('✓ users table created');
    
    // Create albums table
    await sql`
      CREATE TABLE IF NOT EXISTS albums (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(500),
        description TEXT,
        cover_image_url TEXT,
        cover_thumbnail_url TEXT,
        background_image_url TEXT,
        custom_background_url TEXT,
        theme VARCHAR(50) DEFAULT 'gold',
        accent_color VARCHAR(50) DEFAULT '#D4AF37',
        status VARCHAR(50) DEFAULT 'draft',
        is_public BOOLEAN DEFAULT false,
        view_count INTEGER DEFAULT 0,
        total_photos INTEGER DEFAULT 0,
        total_videos INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        published_at TIMESTAMP WITH TIME ZONE,
        last_edited_by UUID REFERENCES users(id),
        last_edited_at TIMESTAMP WITH TIME ZONE
      )
    `;
    console.log('✓ albums table created');
    
    // Create sections table
    await sql`
      CREATE TABLE IF NOT EXISTS sections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(100) DEFAULT 'calendar_today',
        icon_color VARCHAR(50) DEFAULT '#D4AF37',
        section_type VARCHAR(50) DEFAULT 'year',
        sort_order INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        photo_count INTEGER DEFAULT 0,
        video_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ sections table created');
    
    // Create background_presets table
    await sql`
      CREATE TABLE IF NOT EXISTS background_presets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        thumbnail_url TEXT NOT NULL,
        full_url TEXT NOT NULL,
        theme VARCHAR(50) DEFAULT 'gold',
        is_premium BOOLEAN DEFAULT false,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ background_presets table created');
    
    // Create pages table
    await sql`
      CREATE TABLE IF NOT EXISTS pages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
        section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
        page_number INTEGER NOT NULL,
        title VARCHAR(255),
        subtitle VARCHAR(500),
        content TEXT,
        quote TEXT,
        author_note TEXT,
        layout VARCHAR(50) DEFAULT 'standard',
        background_color VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(album_id, page_number)
      )
    `;
    console.log('✓ pages table created');
    
    // Create media table
    await sql`
      CREATE TABLE IF NOT EXISTS media (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
        section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
        page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
        file_name VARCHAR(500) NOT NULL,
        original_url TEXT NOT NULL,
        thumbnail_url TEXT,
        medium_url TEXT,
        file_type VARCHAR(50) NOT NULL,
        file_size BIGINT NOT NULL,
        width INTEGER,
        height INTEGER,
        duration INTEGER,
        caption TEXT,
        alt_text VARCHAR(500),
        sort_order INTEGER DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ media table created');
    
    // Create page_media table
    await sql`
      CREATE TABLE IF NOT EXISTS page_media (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
        position VARCHAR(50) DEFAULT 'main',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(page_id, media_id, position)
      )
    `;
    console.log('✓ page_media table created');
    
    // Create messages table
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
        author_name VARCHAR(255) NOT NULL,
        author_email VARCHAR(255),
        content TEXT NOT NULL,
        is_approved BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ messages table created');
    
    // Create activity_log table
    await sql`
      CREATE TABLE IF NOT EXISTS activity_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id UUID,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ activity_log table created');
    
    console.log('\nCreating indexes...');
    
    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_albums_status ON albums(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sections_album_id ON sections(album_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sections_type ON sections(section_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sections_status ON sections(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pages_album_id ON pages(album_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pages_section_id ON pages(section_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_media_user_id ON media(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_media_album_id ON media(album_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_media_section_id ON media(section_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_media_page_id ON media(page_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_album_id ON messages(album_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_activity_log_album_id ON activity_log(album_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at)`;
    console.log('✓ All indexes created');
    
    console.log('\nCreating triggers...');
    
    // Create trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `;
    
    // Create triggers
    await sql`CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`;
    await sql`CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON albums FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`;
    await sql`CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`;
    await sql`CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`;
    await sql`CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON media FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`;
    await sql`CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`;
    console.log('✓ All triggers created');
    
    console.log('\nInserting seed data...');
    
    // Insert background presets
    await sql`
      INSERT INTO background_presets (name, thumbnail_url, full_url, theme, sort_order) VALUES
      ('Gold Waves', 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=1920&h=1080&fit=crop', 'gold', 1),
      ('Gold Silk', 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&h=1080&fit=crop', 'gold', 2),
      ('Silver Elegance', 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1920&h=1080&fit=crop', 'silver', 3),
      ('Rose Gold', 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&h=1080&fit=crop', 'rose-gold', 4),
      ('Minimal White', 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&h=1080&fit=crop', 'minimal', 5)
      ON CONFLICT DO NOTHING
    `;
    console.log('✓ Background presets inserted');
    
    // Verify tables
    console.log('\nVerifying tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('\nCreated tables:');
    tables.forEach((t: any) => console.log(`  ✓ ${t.table_name}`));
    
    console.log('\n✅ Database initialization complete!');
    
  } catch (error: any) {
    console.error('\n❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();
