-- ============================================
-- VENA PICTURES CRM - COMPLETE DATABASE SETUP
-- ============================================
-- Run this single file to create all tables
-- ============================================

-- Step 1: Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Step 2: Helper Function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CORE TABLES
-- ============================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Member' CHECK (role IN ('Admin', 'Member', 'Kasir')),
    permissions JSONB DEFAULT '[]'::jsonb,
    restricted_cards JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
    income_categories JSONB DEFAULT '["Pembayaran Klien", "Lainnya"]'::jsonb,
    expense_categories JSONB DEFAULT '["Operasional", "Gaji Tim", "Cetak", "Transport", "Lainnya"]'::jsonb,
    project_types JSONB DEFAULT '["Wedding", "Prewedding", "Engagement", "Birthday", "Corporate"]'::jsonb,
    event_types JSONB DEFAULT '["Indoor", "Outdoor", "Studio"]'::jsonb,
    asset_categories JSONB DEFAULT '["Kamera", "Lensa", "Lighting", "Audio", "Lainnya"]'::jsonb,
    sop_categories JSONB DEFAULT '["Shooting", "Editing", "Client Management", "Finance"]'::jsonb,
    package_categories JSONB DEFAULT '["Photo", "Video", "Photo + Video"]'::jsonb,
    project_status_config JSONB DEFAULT '[]'::jsonb,
    notification_settings JSONB DEFAULT '{}'::jsonb,
    security_settings JSONB DEFAULT '{}'::jsonb,
    briefing_template TEXT,
    terms_and_conditions TEXT,
    contract_template TEXT,
    package_share_template TEXT,
    booking_form_template TEXT,
    chat_templates JSONB DEFAULT '[]'::jsonb,
    logo_base64 TEXT,
    brand_color VARCHAR(7) DEFAULT '#3b82f6',
    public_page_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profiles_admin_user ON profiles(admin_user_id);

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50),
    instagram VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'Prospek' CHECK (status IN ('Prospek', 'Aktif', 'Tidak Aktif', 'Hilang')),
    client_type VARCHAR(50) NOT NULL DEFAULT 'Langsung' CHECK (client_type IN ('Langsung', 'Vendor')),
    since DATE NOT NULL DEFAULT CURRENT_DATE,
    last_contact DATE NOT NULL DEFAULT CURRENT_DATE,
    portal_access_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_type ON clients(client_type);
CREATE INDEX idx_clients_portal_access ON clients(portal_access_id);

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_channel VARCHAR(100) NOT NULL DEFAULT 'WhatsApp',
    location VARCHAR(255),
    status VARCHAR(100) NOT NULL DEFAULT 'Sedang Diskusi',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    whatsapp VARCHAR(50),
    converted_to_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    converted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_date ON leads(date DESC);

CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Packages Table
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    duration_options JSONB DEFAULT '[]'::jsonb,
    physical_items JSONB DEFAULT '[]'::jsonb,
    digital_items JSONB DEFAULT '[]'::jsonb,
    processing_time VARCHAR(100),
    photographers VARCHAR(100),
    videographers VARCHAR(100),
    default_printing_cost DECIMAL(15,2) DEFAULT 0,
    default_transport_cost DECIMAL(15,2) DEFAULT 0,
    cover_image TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_packages_category ON packages(category);
CREATE INDEX idx_packages_is_active ON packages(is_active);

CREATE TRIGGER update_packages_updated_at
    BEFORE UPDATE ON packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add-ons Table
CREATE TABLE IF NOT EXISTS add_ons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    region VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_addons_is_active ON add_ons(is_active);

CREATE TRIGGER update_addons_updated_at
    BEFORE UPDATE ON add_ons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Promo Codes Table
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(15,2) NOT NULL,
    max_usage INTEGER,
    usage_count INTEGER DEFAULT 0,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_is_active ON promo_codes(is_active);

CREATE TRIGGER update_promo_codes_updated_at
    BEFORE UPDATE ON promo_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Projects Table (Main)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
    promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
    project_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    project_type VARCHAR(100) NOT NULL,
    package_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    date DATE NOT NULL,
    deadline_date DATE,
    start_time TIME,
    end_time TIME,
    status VARCHAR(100) NOT NULL DEFAULT 'Dikonfirmasi',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    active_sub_statuses JSONB DEFAULT '[]'::jsonb,
    confirmed_sub_statuses JSONB DEFAULT '[]'::jsonb,
    custom_sub_statuses JSONB DEFAULT '[]'::jsonb,
    booking_status VARCHAR(50) CHECK (booking_status IN ('Baru', 'Terkonfirmasi', 'Ditolak')),
    rejection_reason TEXT,
    total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(15,2) DEFAULT 0,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Belum Bayar' CHECK (payment_status IN ('Lunas', 'DP Terbayar', 'Belum Bayar')),
    discount_amount DECIMAL(15,2) DEFAULT 0,
    duration_selection VARCHAR(100),
    unit_price DECIMAL(15,2),
    add_ons JSONB DEFAULT '[]'::jsonb,
    printing_cost DECIMAL(15,2) DEFAULT 0,
    transport_cost DECIMAL(15,2) DEFAULT 0,
    transport_used BOOLEAN DEFAULT false,
    transport_paid BOOLEAN DEFAULT false,
    transport_note TEXT,
    printing_details JSONB DEFAULT '[]'::jsonb,
    transport_details JSONB DEFAULT '[]'::jsonb,
    custom_costs JSONB DEFAULT '[]'::jsonb,
    team JSONB DEFAULT '[]'::jsonb,
    drive_link TEXT,
    client_drive_link TEXT,
    final_drive_link TEXT,
    image TEXT,
    notes TEXT,
    accommodation TEXT,
    shipping_details TEXT,
    is_editing_confirmed_by_client BOOLEAN DEFAULT false,
    is_printing_confirmed_by_client BOOLEAN DEFAULT false,
    is_delivery_confirmed_by_client BOOLEAN DEFAULT false,
    client_sub_status_notes JSONB DEFAULT '{}'::jsonb,
    sub_status_confirmation_sent_at JSONB DEFAULT '{}'::jsonb,
    completed_digital_items JSONB DEFAULT '[]'::jsonb,
    dp_proof_url TEXT,
    invoice_signature TEXT,
    chat_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_date ON projects(date DESC);

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'DATABASE SETUP COMPLETE!';
    RAISE NOTICE 'Core tables created successfully';
    RAISE NOTICE '============================================';
END $$;
