-- ============================================
-- VENA PICTURES CRM - OTHER TABLES
-- ============================================
-- Run after 11_financial_team_tables.sql
-- ============================================

-- Contracts Table
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    signing_date DATE NOT NULL,
    signing_location VARCHAR(255) NOT NULL,
    client_name_1 VARCHAR(255) NOT NULL,
    client_address_1 TEXT NOT NULL,
    client_phone_1 VARCHAR(50) NOT NULL,
    client_name_2 VARCHAR(255),
    client_address_2 TEXT,
    client_phone_2 VARCHAR(50),
    shooting_duration VARCHAR(255) NOT NULL,
    guaranteed_photos VARCHAR(255) NOT NULL,
    album_details TEXT NOT NULL,
    digital_files_format VARCHAR(255) NOT NULL,
    other_items TEXT,
    personnel_count VARCHAR(100) NOT NULL,
    delivery_timeframe VARCHAR(255) NOT NULL,
    dp_date DATE NOT NULL,
    final_payment_date DATE NOT NULL,
    cancellation_policy TEXT NOT NULL,
    jurisdiction VARCHAR(255) NOT NULL,
    vendor_signature TEXT,
    client_signature TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contracts_client ON contracts(client_id);
CREATE INDEX idx_contracts_project ON contracts(project_id);

CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- SOPs Table
CREATE TABLE IF NOT EXISTS sops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sops_category ON sops(category);

CREATE TRIGGER update_sops_updated_at
    BEFORE UPDATE ON sops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Project Revisions Table
CREATE TABLE IF NOT EXISTS project_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    freelancer_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    deadline DATE NOT NULL,
    admin_notes TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Menunggu Revisi',
    freelancer_notes TEXT,
    drive_link TEXT,
    completed_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_revisions_project ON project_revisions(project_id);
CREATE INDEX idx_revisions_status ON project_revisions(status);

CREATE TRIGGER update_revisions_updated_at
    BEFORE UPDATE ON project_revisions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Project Sub Status Confirmations Table
CREATE TABLE IF NOT EXISTS project_sub_status_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sub_status_name VARCHAR(255) NOT NULL,
    confirmed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    client_note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, sub_status_name)
);

CREATE INDEX idx_confirmations_project ON project_sub_status_confirmations(project_id);

-- Revision Submissions Table
CREATE TABLE IF NOT EXISTS revision_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revision_notes TEXT NOT NULL,
    reference_links TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_revision_submissions_project ON revision_submissions(project_id);
CREATE INDEX idx_revision_submissions_status ON revision_submissions(status);

CREATE TRIGGER update_revision_submissions_updated_at
    BEFORE UPDATE ON revision_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Client Feedback Table
CREATE TABLE IF NOT EXISTS client_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name VARCHAR(255) NOT NULL,
    satisfaction VARCHAR(50) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_client_feedback_rating ON client_feedback(rating DESC);
CREATE INDEX idx_client_feedback_date ON client_feedback(date DESC);

CREATE TRIGGER update_client_feedback_updated_at
    BEFORE UPDATE ON client_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Freelancer Feedback Table
CREATE TABLE IF NOT EXISTS freelancer_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    freelancer_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    team_member_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_freelancer_feedback_freelancer ON freelancer_feedback(freelancer_id);
CREATE INDEX idx_freelancer_feedback_date ON freelancer_feedback(date DESC);

CREATE TRIGGER update_freelancer_feedback_updated_at
    BEFORE UPDATE ON freelancer_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Galleries Table
CREATE TABLE IF NOT EXISTS galleries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    region VARCHAR(100),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    public_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    booking_link TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_galleries_user ON galleries(user_id);
CREATE INDEX idx_galleries_is_public ON galleries(is_public);
CREATE INDEX idx_galleries_public_id ON galleries(public_id);

CREATE TRIGGER update_galleries_updated_at
    BEFORE UPDATE ON galleries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Gallery Images Table
CREATE TABLE IF NOT EXISTS gallery_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_gallery_images_gallery ON gallery_images(gallery_id);
CREATE INDEX idx_gallery_images_display_order ON gallery_images(display_order);

CREATE TRIGGER update_gallery_images_updated_at
    BEFORE UPDATE ON gallery_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    link JSONB,
    is_read BOOLEAN DEFAULT false,
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp DESC);

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Sample SOPs
INSERT INTO sops (title, category, content) VALUES
('Prosedur Shooting Wedding', 'Shooting', '# Prosedur Shooting Wedding

1. Persiapan equipment
2. Briefing dengan klien
3. Shooting ceremony
4. Shooting reception'),
('Workflow Editing', 'Editing', '# Workflow Editing

1. Import footage
2. Seleksi foto/video
3. Color grading
4. Export final')
ON CONFLICT DO NOTHING;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'ALL TABLES CREATED SUCCESSFULLY!';
    RAISE NOTICE 'Total Tables: 26';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Insert sample data';
    RAISE NOTICE '2. Configure Supabase Auth';
    RAISE NOTICE '3. Set up Row Level Security';
    RAISE NOTICE '4. Test application connection';
    RAISE NOTICE '============================================';
END $$;
