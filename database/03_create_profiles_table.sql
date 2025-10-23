-- ============================================
-- VENA PICTURES CRM - DATABASE SCHEMA
-- Part 3: Profiles & Settings
-- ============================================

-- ============================================
-- TABLE: profiles
-- Purpose: Company profile & system settings
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    admin_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Company Info
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    instagram VARCHAR(255),
    address TEXT,
    bank_account TEXT,
    authorized_signer VARCHAR(255),
    id_number VARCHAR(100),
    bio TEXT,
    
    -- Categories (JSONB arrays)
    income_categories JSONB DEFAULT '["Pembayaran Klien", "Lainnya"]'::jsonb,
    expense_categories JSONB DEFAULT '["Operasional", "Gaji Tim", "Cetak", "Transport", "Lainnya"]'::jsonb,
    project_types JSONB DEFAULT '["Wedding", "Prewedding", "Engagement", "Birthday", "Corporate"]'::jsonb,
    event_types JSONB DEFAULT '["Indoor", "Outdoor", "Studio"]'::jsonb,
    asset_categories JSONB DEFAULT '["Kamera", "Lensa", "Lighting", "Audio", "Lainnya"]'::jsonb,
    sop_categories JSONB DEFAULT '["Shooting", "Editing", "Client Management", "Finance"]'::jsonb,
    package_categories JSONB DEFAULT '["Photo", "Video", "Photo + Video"]'::jsonb,
    
    -- Project Status Configuration (JSONB array of objects)
    project_status_config JSONB DEFAULT '[
        {
            "id": "1",
            "name": "Dikonfirmasi",
            "color": "#3b82f6",
            "defaultProgress": 10,
            "subStatuses": [],
            "note": "Project baru dikonfirmasi"
        },
        {
            "id": "2",
            "name": "Persiapan",
            "color": "#6366f1",
            "defaultProgress": 20,
            "subStatuses": [
                {"name": "Briefing", "note": "Briefing dengan klien"},
                {"name": "Planning", "note": "Planning timeline"}
            ],
            "note": "Persiapan project"
        },
        {
            "id": "3",
            "name": "Editing",
            "color": "#8b5cf6",
            "defaultProgress": 50,
            "subStatuses": [
                {"name": "Seleksi Foto", "note": "Memilih foto terbaik"},
                {"name": "Color Grading", "note": "Proses color grading"},
                {"name": "Export", "note": "Export file final"}
            ],
            "note": "Proses editing"
        },
        {
            "id": "4",
            "name": "Revisi",
            "color": "#14b8a6",
            "defaultProgress": 60,
            "subStatuses": [],
            "note": "Revisi dari klien"
        },
        {
            "id": "5",
            "name": "Cetak",
            "color": "#f97316",
            "defaultProgress": 80,
            "subStatuses": [
                {"name": "Desain Album", "note": "Desain layout album"},
                {"name": "Cetak Album", "note": "Proses cetak"},
                {"name": "QC", "note": "Quality control"}
            ],
            "note": "Proses cetak output fisik"
        },
        {
            "id": "6",
            "name": "Dikirim",
            "color": "#06b6d4",
            "defaultProgress": 90,
            "subStatuses": [
                {"name": "Packing", "note": "Packing hasil"},
                {"name": "Kirim", "note": "Pengiriman"},
                {"name": "Diterima", "note": "Diterima klien"}
            ],
            "note": "Pengiriman ke klien"
        },
        {
            "id": "7",
            "name": "Selesai",
            "color": "#10b981",
            "defaultProgress": 100,
            "subStatuses": [],
            "note": "Project selesai"
        },
        {
            "id": "8",
            "name": "Dibatalkan",
            "color": "#ef4444",
            "defaultProgress": 0,
            "subStatuses": [],
            "note": "Project dibatalkan"
        }
    ]'::jsonb,
    
    -- Settings (JSONB objects)
    notification_settings JSONB DEFAULT '{
        "newProject": true,
        "paymentConfirmation": true,
        "deadlineReminder": true
    }'::jsonb,
    
    security_settings JSONB DEFAULT '{
        "twoFactorEnabled": false
    }'::jsonb,
    
    -- Templates
    briefing_template TEXT,
    terms_and_conditions TEXT,
    contract_template TEXT,
    package_share_template TEXT,
    booking_form_template TEXT,
    
    -- Chat Templates (JSONB array)
    chat_templates JSONB DEFAULT '[
        {
            "id": "welcome",
            "title": "Pesan Selamat Datang",
            "template": "Halo {clientName}, terima kasih telah mempercayakan {projectName} kepada kami!"
        },
        {
            "id": "reminder",
            "title": "Pengingat Pembayaran",
            "template": "Halo {clientName}, ini pengingat untuk pembayaran project {projectName}."
        }
    ]'::jsonb,
    
    -- Branding
    logo_base64 TEXT,
    brand_color VARCHAR(7) DEFAULT '#3b82f6',
    
    -- Public Page Config (JSONB object)
    public_page_config JSONB DEFAULT '{
        "template": "classic",
        "title": "Vena Pictures",
        "introduction": "Professional Photography & Videography Services",
        "galleryImages": []
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_profiles_admin_user ON profiles(admin_user_id);
CREATE INDEX idx_profiles_company_name ON profiles(company_name);

-- GIN indexes for JSONB search
CREATE INDEX idx_profiles_project_status_config ON profiles USING GIN (project_status_config);
CREATE INDEX idx_profiles_chat_templates ON profiles USING GIN (chat_templates);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE profiles IS 'Company profile and system configuration';
COMMENT ON COLUMN profiles.admin_user_id IS 'Reference to admin user who owns this profile';
COMMENT ON COLUMN profiles.project_status_config IS 'Custom project status workflow configuration';
COMMENT ON COLUMN profiles.notification_settings IS 'Email and notification preferences';
COMMENT ON COLUMN profiles.security_settings IS 'Security settings like 2FA';
COMMENT ON COLUMN profiles.chat_templates IS 'WhatsApp message templates';
COMMENT ON COLUMN profiles.public_page_config IS 'Public homepage configuration';

-- ============================================
-- TRIGGER: Update updated_at
-- ============================================
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA
-- ============================================
INSERT INTO profiles (
    admin_user_id,
    full_name,
    email,
    phone,
    company_name,
    website,
    instagram,
    address,
    bank_account,
    authorized_signer,
    bio
) 
SELECT 
    id,
    'Vena Pictures',
    'info@venapictures.com',
    '081234567890',
    'Vena Pictures Studio',
    'https://venapictures.com',
    '@venapictures',
    'Jl. Contoh No. 123, Bandung',
    'BCA 1234567890 a.n. Vena Pictures',
    'John Doe',
    'Professional Photography & Videography Services'
FROM users 
WHERE email = 'admin@venapictures.com'
ON CONFLICT DO NOTHING;
