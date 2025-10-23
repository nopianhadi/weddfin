-- ============================================
-- VENA PICTURES CRM - DATABASE SCHEMA
-- Part 2: Users & Authentication
-- ============================================

-- ============================================
-- TABLE: users
-- Purpose: User authentication & authorization
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Hashed with bcrypt
    
    -- User Info
    full_name VARCHAR(255) NOT NULL,
    
    -- Authorization
    role VARCHAR(50) NOT NULL DEFAULT 'Member' 
        CHECK (role IN ('Admin', 'Member', 'Kasir')),
    
    -- Permissions (JSONB array of ViewType strings)
    -- Example: ["Dashboard", "Clients", "Projects"]
    permissions JSONB DEFAULT '[]'::jsonb,
    
    -- Restricted Cards (JSONB array of card UUIDs)
    -- Cards that this user cannot access
    -- Example: ["uuid1", "uuid2"]
    restricted_cards JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- GIN index for JSONB permissions search
CREATE INDEX idx_users_permissions ON users USING GIN (permissions);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE users IS 'User accounts for system authentication and authorization';
COMMENT ON COLUMN users.id IS 'Unique user identifier (UUID)';
COMMENT ON COLUMN users.email IS 'User email address (unique, used for login)';
COMMENT ON COLUMN users.password IS 'Hashed password (bcrypt)';
COMMENT ON COLUMN users.full_name IS 'Full name of the user';
COMMENT ON COLUMN users.role IS 'User role: Admin (full access), Member (limited), Kasir (cashier)';
COMMENT ON COLUMN users.permissions IS 'JSONB array of allowed views/pages for Member role';
COMMENT ON COLUMN users.restricted_cards IS 'JSONB array of card IDs that user cannot access';
COMMENT ON COLUMN users.is_active IS 'Whether user account is active';
COMMENT ON COLUMN users.last_login IS 'Last login timestamp';

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - for development)
-- ============================================
-- Insert default admin user
-- Password: 'admin123' (hashed with bcrypt)
INSERT INTO users (email, password, full_name, role, permissions) 
VALUES (
    'admin@venapictures.com',
    crypt('admin123', gen_salt('bf')),
    'Admin Vena Pictures',
    'Admin',
    '[]'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- Insert sample member user
INSERT INTO users (email, password, full_name, role, permissions) 
VALUES (
    'member@venapictures.com',
    crypt('member123', gen_salt('bf')),
    'Member User',
    'Member',
    '["Dashboard", "Clients", "Projects", "Finance"]'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- Insert sample kasir user
INSERT INTO users (email, password, full_name, role, permissions) 
VALUES (
    'kasir@venapictures.com',
    crypt('kasir123', gen_salt('bf')),
    'Kasir User',
    'Kasir',
    '["Dashboard", "Finance", "Booking"]'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- HELPER FUNCTION: Verify password
-- ============================================
CREATE OR REPLACE FUNCTION verify_user_password(
    user_email VARCHAR,
    user_password VARCHAR
)
RETURNS TABLE (
    user_id UUID,
    user_full_name VARCHAR,
    user_role VARCHAR,
    user_permissions JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.full_name,
        u.role,
        u.permissions
    FROM users u
    WHERE u.email = user_email
        AND u.password = crypt(user_password, u.password)
        AND u.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_user_password IS 'Verify user credentials and return user info if valid';
