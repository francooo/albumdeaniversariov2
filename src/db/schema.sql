-- =====================================================
-- Neon PostgreSQL Schema for Álbum de Aniversário
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    public_name VARCHAR(255), -- Nome exibido publicamente nos álbuns (LGPD: nome configurável)
    avatar_url TEXT,
    google_id VARCHAR(255) UNIQUE,
    plan_type VARCHAR(50) DEFAULT 'free', -- free, premium, deluxe
    storage_used BIGINT DEFAULT 0, -- in bytes
    storage_limit BIGINT DEFAULT 5368709120, -- 5GB default
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- ALBUMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500),
    description TEXT,
    
    -- COVER & BACKGROUND FIELDS (Personalization Screen)
    cover_image_url TEXT,
    cover_thumbnail_url TEXT,
    background_image_url TEXT,
    custom_background_url TEXT,
    
    -- THEME & VISUAL SETTINGS
    theme VARCHAR(50) DEFAULT 'gold', -- gold, silver, rose-gold, minimal, dark
    accent_color VARCHAR(50) DEFAULT '#D4AF37', -- hex color code
    
    -- STATUS & VISIBILITY
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, archived
    is_public BOOLEAN DEFAULT false,
    
    -- STATISTICS (Dashboard Stats Cards)
    view_count INTEGER DEFAULT 0,
    total_photos INTEGER DEFAULT 0,
    total_videos INTEGER DEFAULT 0,
    
    -- METADATA
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    last_edited_by UUID REFERENCES users(id),
    last_edited_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- SECTIONS TABLE (Album Sections - Years/Ages/Categories)
-- =====================================================
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    
    -- SECTION DETAILS (Dashboard Table)
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100) DEFAULT 'calendar_today', -- emoji or icon name
    icon_color VARCHAR(50) DEFAULT '#D4AF37',
    
    -- ORGANIZATION (Dashboard Tabs: Anos/Idades/Categorias)
    section_type VARCHAR(50) DEFAULT 'year', -- year, age, category, custom
    sort_order INTEGER DEFAULT 0,
    
    -- STATUS (Dashboard: Ativo/Rascunho)
    status VARCHAR(50) DEFAULT 'active', -- active, draft, hidden
    
    -- STATISTICS (Dashboard: Mídias count - denormalized for performance)
    photo_count INTEGER DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    
    -- TIMESTAMPS (Dashboard: Data de Criação)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- BACKGROUND_PRESETS TABLE (Reusable backgrounds for Personalization)
-- =====================================================
CREATE TABLE IF NOT EXISTS background_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    thumbnail_url TEXT NOT NULL,
    full_url TEXT NOT NULL,
    theme VARCHAR(50) DEFAULT 'gold',
    is_premium BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PAGES TABLE (Flipbook Pages)
-- =====================================================
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
    page_number INTEGER NOT NULL,
    title VARCHAR(255),
    subtitle VARCHAR(500),
    content TEXT, -- HTML or markdown content
    quote TEXT,
    author_note TEXT,
    layout VARCHAR(50) DEFAULT 'standard', -- standard, full-bleed, collage, text-only
    background_color VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(album_id, page_number)
);

-- =====================================================
-- MEDIA TABLE (Photos and Videos)
-- =====================================================
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
    file_type VARCHAR(50) NOT NULL, -- image/jpeg, image/png, video/mp4
    file_size BIGINT NOT NULL, -- in bytes
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- for videos in seconds
    caption TEXT,
    alt_text VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    metadata JSONB, -- EXIF data, location, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PAGE_MEDIA TABLE (Many-to-Many: Pages <-> Media)
-- =====================================================
CREATE TABLE IF NOT EXISTS page_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    position VARCHAR(50) DEFAULT 'main', -- main, secondary, background
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(page_id, media_id, position)
);

-- =====================================================
-- MESSAGES TABLE (Guest Messages/Comments)
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    author_email VARCHAR(255),
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ACTIVITY_LOG TABLE (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- created, updated, deleted, viewed
    entity_type VARCHAR(100) NOT NULL, -- album, section, page, media
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_status ON albums(status);
CREATE INDEX IF NOT EXISTS idx_sections_album_id ON sections(album_id);
CREATE INDEX IF NOT EXISTS idx_sections_type ON sections(section_type);
CREATE INDEX IF NOT EXISTS idx_sections_status ON sections(status);
CREATE INDEX IF NOT EXISTS idx_pages_album_id ON pages(album_id);
CREATE INDEX IF NOT EXISTS idx_pages_section_id ON pages(section_id);
CREATE INDEX IF NOT EXISTS idx_media_user_id ON media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_album_id ON media(album_id);
CREATE INDEX IF NOT EXISTS idx_media_section_id ON media(section_id);
CREATE INDEX IF NOT EXISTS idx_media_page_id ON media(page_id);
CREATE INDEX IF NOT EXISTS idx_messages_album_id ON messages(album_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_album_id ON activity_log(album_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON albums
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON media
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ALBUM SHARES TABLE (Public Link Sharing)
-- =====================================================
CREATE TABLE IF NOT EXISTS album_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    -- NULL = acesso público anônimo; preenchido = usuário cadastrado vinculado

    permission VARCHAR(20) NOT NULL DEFAULT 'viewer',
    -- 'viewer' | 'commenter' | 'editor'
    -- via link público: sempre 'viewer'

    share_token VARCHAR(64) UNIQUE,
    -- token único para o link público; um por álbum

    link_active BOOLEAN DEFAULT true,
    -- false = link desativado

    access_type VARCHAR(20) DEFAULT 'public_link',
    -- 'public_link' = veio pelo link público
    -- 'direct_invite' = foi convidado diretamente pelo dono (feature futura)

    invited_by UUID REFERENCES users(id),
    -- para convites diretos futuros

    claimed_at TIMESTAMP,
    -- quando um usuário anônimo criou conta e vinculou o álbum

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- null = sem expiração

    -- LGPD/Privacy: Public link shares are ALWAYS viewer-only, irrevocable
    CONSTRAINT chk_public_link_permission 
        CHECK (access_type != 'public_link' OR permission = 'viewer')
);

-- Index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_album_shares_token ON album_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_album_shares_album ON album_shares(album_id);

-- =====================================================
-- ALBUM SHARE VIEWS TABLE (Analytics)
-- =====================================================
CREATE TABLE IF NOT EXISTS album_share_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    share_token VARCHAR(64),
    user_id UUID REFERENCES users(id), -- null se anônimo
    ip_hash VARCHAR(64), -- hash do IP (não salvar IP bruto - LGPD)
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_album_share_views_album ON album_share_views(album_id);
CREATE INDEX IF NOT EXISTS idx_album_share_views_token ON album_share_views(share_token);

-- Trigger for album_shares updated_at
CREATE TRIGGER update_album_shares_updated_at BEFORE UPDATE ON album_shares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA FOR BACKGROUND PRESETS
-- =====================================================
INSERT INTO background_presets (name, thumbnail_url, full_url, theme, sort_order) VALUES
('Gold Waves', 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=1920&h=1080&fit=crop', 'gold', 1),
('Gold Silk', 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&h=1080&fit=crop', 'gold', 2),
('Silver Elegance', 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1920&h=1080&fit=crop', 'silver', 3),
('Rose Gold', 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&h=1080&fit=crop', 'rose-gold', 4),
('Minimal White', 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&h=1080&fit=crop', 'minimal', 5)
ON CONFLICT DO NOTHING;
