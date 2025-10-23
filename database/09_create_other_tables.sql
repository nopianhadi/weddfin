-- ============================================
-- VENA PICTURES CRM - DATABASE SCHEMA
-- Part 9: Contracts, SOPs, Feedback, Gallery, Notifications
-- ============================================

-- ============================================
-- TABLE: contracts
-- Purpose: Client contracts
-- ============================================
CREATE TABLE IF NOT EXISTS contracts (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Contract Info
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    signing_date DATE NOT NULL,
    signing_location VARCHAR(255) NOT NULL,
    
    -- Client Info (can be 1 or 2 clients)
    client_name_1 VARCHAR(255) NOT NULL,
    client_address_1 TEXT NOT NULL,
    client_phone_1 VARCHAR(50) NOT NULL,
    client_name_2 VARCHAR(255),
    client_address_2 TEXT,
    client_phone_2 VARCHAR(50),
    
    -- Scope of Work
    shooting_duration VARCHAR(255) NOT NULL,
    guaranteed_photos VARCHAR(255) NOT NULL,
    album_details TEXT NOT NULL,
    digital_files_format VARCHAR(255) NOT NULL,
    other_items TEXT,
    personnel_count VARCHAR(100) NOT NULL,
    delivery_timeframe VARCHAR(255) NOT NULL,
    
    -- Payment Terms
    dp_date DATE NOT NULL,
    final_payment_date DATE NOT NULL,
    
    -- Legal Terms
    cancellation_policy TEXT NOT NULL,
    jurisdiction VARCHAR(255) NOT NULL,
    
    -- Signatures (Base64)
    vendor_signature TEXT,
    client_signature TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: contracts
-- ============================================
CREATE INDEX idx_contracts_client ON contracts(client_id);
CREATE INDEX idx_contracts_project ON contracts(project_id);
CREATE INDEX idx_contracts_contract_number ON contracts(contract_number);
CREATE INDEX idx_contracts_signing_date ON contracts(signing_date DESC);

-- ============================================
-- COMMENTS: contracts
-- ============================================
COMMENT ON TABLE contracts IS 'Client contracts with e-signatures';
COMMENT ON COLUMN contracts.contract_number IS 'Unique contract identifier';
COMMENT ON COLUMN contracts.vendor_signature IS 'Base64 encoded vendor signature';
COMMENT ON COLUMN contracts.client_signature IS 'Base64 encoded client signature';

-- ============================================
-- TRIGGER: contracts
-- ============================================
CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: sops
-- Purpose: Standard Operating Procedures
-- ============================================
CREATE TABLE IF NOT EXISTS sops (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- SOP Info
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    content TEXT NOT NULL, -- Markdown or plain text
    
    -- Metadata
    last_updated TIMESTAMP DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: sops
-- ============================================
CREATE INDEX idx_sops_category ON sops(category);
CREATE INDEX idx_sops_title ON sops USING gin(title gin_trgm_ops);
CREATE INDEX idx_sops_last_updated ON sops(last_updated DESC);

-- Full text search
CREATE INDEX idx_sops_content_search ON sops USING gin(to_tsvector('indonesian', content));

-- ============================================
-- COMMENTS: sops
-- ============================================
COMMENT ON TABLE sops IS 'Standard Operating Procedures documentation';
COMMENT ON COLUMN sops.content IS 'SOP content in Markdown or plain text format';

-- ============================================
-- TRIGGER: sops
-- ============================================
CREATE TRIGGER update_sops_updated_at
    BEFORE UPDATE ON sops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: project_revisions
-- Purpose: Project revision requests
-- ============================================
CREATE TABLE IF NOT EXISTS project_revisions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    freelancer_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    
    -- Revision Info
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    deadline DATE NOT NULL,
    admin_notes TEXT NOT NULL,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'Menunggu Revisi'
        CHECK (status IN ('Menunggu Revisi', 'Sedang Direvisi', 'Revisi Selesai')),
    
    -- Freelancer Response
    freelancer_notes TEXT,
    drive_link TEXT,
    completed_date DATE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: project_revisions
-- ============================================
CREATE INDEX idx_revisions_project ON project_revisions(project_id);
CREATE INDEX idx_revisions_freelancer ON project_revisions(freelancer_id);
CREATE INDEX idx_revisions_status ON project_revisions(status);
CREATE INDEX idx_revisions_deadline ON project_revisions(deadline);

-- ============================================
-- COMMENTS: project_revisions
-- ============================================
COMMENT ON TABLE project_revisions IS 'Project revision requests and tracking';

-- ============================================
-- TRIGGER: project_revisions
-- ============================================
CREATE TRIGGER update_revisions_updated_at
    BEFORE UPDATE ON project_revisions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: project_sub_status_confirmations
-- Purpose: Client confirmations for sub-statuses
-- ============================================
CREATE TABLE IF NOT EXISTS project_sub_status_confirmations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Confirmation Info
    sub_status_name VARCHAR(255) NOT NULL,
    confirmed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    client_note TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(project_id, sub_status_name)
);

-- ============================================
-- INDEXES: project_sub_status_confirmations
-- ============================================
CREATE INDEX idx_confirmations_project ON project_sub_status_confirmations(project_id);
CREATE INDEX idx_confirmations_confirmed_at ON project_sub_status_confirmations(confirmed_at DESC);

-- ============================================
-- COMMENTS: project_sub_status_confirmations
-- ============================================
COMMENT ON TABLE project_sub_status_confirmations IS 'Client confirmations for project sub-statuses';

-- ============================================
-- TABLE: revision_submissions
-- Purpose: Client revision submissions
-- ============================================
CREATE TABLE IF NOT EXISTS revision_submissions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Submission Info
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revision_notes TEXT NOT NULL,
    reference_links TEXT,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'In Progress', 'Completed')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: revision_submissions
-- ============================================
CREATE INDEX idx_revision_submissions_project ON revision_submissions(project_id);
CREATE INDEX idx_revision_submissions_status ON revision_submissions(status);
CREATE INDEX idx_revision_submissions_submitted_at ON revision_submissions(submitted_at DESC);

-- ============================================
-- COMMENTS: revision_submissions
-- ============================================
COMMENT ON TABLE revision_submissions IS 'Client revision submissions from portal';

-- ============================================
-- TRIGGER: revision_submissions
-- ============================================
CREATE TRIGGER update_revision_submissions_updated_at
    BEFORE UPDATE ON revision_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: client_feedback
-- Purpose: Client testimonials and feedback
-- ============================================
CREATE TABLE IF NOT EXISTS client_feedback (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Feedback Info
    client_name VARCHAR(255) NOT NULL,
    satisfaction VARCHAR(50) NOT NULL CHECK (satisfaction IN (
        'Sangat Puas', 'Puas', 'Biasa Saja', 'Tidak Puas'
    )),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Optional project reference
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: client_feedback
-- ============================================
CREATE INDEX idx_client_feedback_rating ON client_feedback(rating DESC);
CREATE INDEX idx_client_feedback_satisfaction ON client_feedback(satisfaction);
CREATE INDEX idx_client_feedback_date ON client_feedback(date DESC);
CREATE INDEX idx_client_feedback_project ON client_feedback(project_id);

-- ============================================
-- COMMENTS: client_feedback
-- ============================================
COMMENT ON TABLE client_feedback IS 'Client testimonials and satisfaction feedback';

-- ============================================
-- TRIGGER: client_feedback
-- ============================================
CREATE TRIGGER update_client_feedback_updated_at
    BEFORE UPDATE ON client_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: freelancer_feedback
-- Purpose: Freelancer feedback to admin
-- ============================================
CREATE TABLE IF NOT EXISTS freelancer_feedback (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    freelancer_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    
    -- Feedback Info
    team_member_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    message TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: freelancer_feedback
-- ============================================
CREATE INDEX idx_freelancer_feedback_freelancer ON freelancer_feedback(freelancer_id);
CREATE INDEX idx_freelancer_feedback_date ON freelancer_feedback(date DESC);

-- ============================================
-- COMMENTS: freelancer_feedback
-- ============================================
COMMENT ON TABLE freelancer_feedback IS 'Feedback from freelancers to admin';

-- ============================================
-- TRIGGER: freelancer_feedback
-- ============================================
CREATE TRIGGER update_freelancer_feedback_updated_at
    BEFORE UPDATE ON freelancer_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: galleries
-- Purpose: Gallery collections
-- ============================================
CREATE TABLE IF NOT EXISTS galleries (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Gallery Info
    title VARCHAR(255) NOT NULL,
    region VARCHAR(100),
    description TEXT,
    
    -- Access Control
    is_public BOOLEAN DEFAULT false,
    public_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    booking_link TEXT, -- Custom booking link for this gallery
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: galleries
-- ============================================
CREATE INDEX idx_galleries_user ON galleries(user_id);
CREATE INDEX idx_galleries_is_public ON galleries(is_public);
CREATE INDEX idx_galleries_public_id ON galleries(public_id);
CREATE INDEX idx_galleries_region ON galleries(region);

-- ============================================
-- COMMENTS: galleries
-- ============================================
COMMENT ON TABLE galleries IS 'Gallery collections for showcasing work';
COMMENT ON COLUMN galleries.public_id IS 'Unique ID for public gallery access';

-- ============================================
-- TRIGGER: galleries
-- ============================================
CREATE TRIGGER update_galleries_updated_at
    BEFORE UPDATE ON galleries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: gallery_images
-- Purpose: Images in galleries
-- ============================================
CREATE TABLE IF NOT EXISTS gallery_images (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
    
    -- Image Info
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    
    -- Display Order
    display_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: gallery_images
-- ============================================
CREATE INDEX idx_gallery_images_gallery ON gallery_images(gallery_id);
CREATE INDEX idx_gallery_images_display_order ON gallery_images(display_order);

-- ============================================
-- COMMENTS: gallery_images
-- ============================================
COMMENT ON TABLE gallery_images IS 'Images within gallery collections';

-- ============================================
-- TRIGGER: gallery_images
-- ============================================
CREATE TRIGGER update_gallery_images_updated_at
    BEFORE UPDATE ON gallery_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: notifications
-- Purpose: System notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Notification Info
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL CHECK (icon IN (
        'lead', 'deadline', 'revision', 'feedback', 'payment', 'completed', 'comment'
    )),
    
    -- Link (JSONB object)
    link JSONB, -- {view: ViewType, action: NavigationAction}
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    
    -- Timestamps
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: notifications
-- ============================================
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp DESC);
CREATE INDEX idx_notifications_icon ON notifications(icon);

-- ============================================
-- COMMENTS: notifications
-- ============================================
COMMENT ON TABLE notifications IS 'System notifications for users';
COMMENT ON COLUMN notifications.link IS 'JSONB object with navigation info';

-- ============================================
-- SAMPLE DATA: sops
-- ============================================
INSERT INTO sops (title, category, content) VALUES
('Prosedur Shooting Wedding', 'Shooting', '# Prosedur Shooting Wedding\n\n1. Persiapan equipment\n2. Briefing dengan klien\n3. Shooting ceremony\n4. Shooting reception'),
('Workflow Editing', 'Editing', '# Workflow Editing\n\n1. Import footage\n2. Seleksi foto/video\n3. Color grading\n4. Export final')
ON CONFLICT DO NOTHING;
