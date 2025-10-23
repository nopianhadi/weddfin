-- ============================================
-- VENA PICTURES CRM - FINANCIAL & TEAM TABLES
-- ============================================
-- Run after 10_run_all_setup.sql
-- ============================================

-- ============================================
-- FINANCIAL TABLES
-- ============================================

-- Cards Table
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_holder_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    last_four_digits VARCHAR(4) NOT NULL,
    card_type VARCHAR(50) NOT NULL CHECK (card_type IN ('Prabayar', 'Kredit', 'Debit', 'Tunai')),
    expiry_date VARCHAR(7),
    balance DECIMAL(15,2) DEFAULT 0,
    color_gradient VARCHAR(100) DEFAULT 'from-slate-700 to-slate-900',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cards_card_type ON cards(card_type);
CREATE INDEX idx_cards_is_active ON cards(is_active);

CREATE TRIGGER update_cards_updated_at
    BEFORE UPDATE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Pockets Table
CREATE TABLE IF NOT EXISTS pockets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'piggy-bank',
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) DEFAULT 0,
    goal_amount DECIMAL(15,2),
    lock_end_date DATE,
    source_card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
    members JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pockets_type ON pockets(type);
CREATE INDEX idx_pockets_is_active ON pockets(is_active);

CREATE TRIGGER update_pockets_updated_at
    BEFORE UPDATE ON pockets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
    pocket_id UUID REFERENCES pockets(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Pemasukan', 'Pengeluaran')),
    category VARCHAR(100) NOT NULL,
    method VARCHAR(50) NOT NULL,
    printing_item_id VARCHAR(100),
    vendor_signature TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_project_id ON transactions(project_id);
CREATE INDEX idx_transactions_card_id ON transactions(card_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_date ON transactions(date DESC);

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TEAM TABLES
-- ============================================

-- Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    role VARCHAR(100) NOT NULL,
    standard_fee DECIMAL(15,2) DEFAULT 0,
    no_rek VARCHAR(100),
    reward_balance DECIMAL(15,2) DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    performance_notes JSONB DEFAULT '[]'::jsonb,
    portal_access_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_team_members_role ON team_members(role);
CREATE INDEX idx_team_members_is_active ON team_members(is_active);
CREATE INDEX idx_team_members_portal_access ON team_members(portal_access_id);

CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Project Team Assignments Table
CREATE TABLE IF NOT EXISTS project_team_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    fee DECIMAL(15,2) NOT NULL DEFAULT 0,
    reward DECIMAL(15,2) DEFAULT 0,
    sub_job TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, team_member_id)
);

CREATE INDEX idx_assignments_project ON project_team_assignments(project_id);
CREATE INDEX idx_assignments_team_member ON project_team_assignments(team_member_id);

CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON project_team_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Team Project Payments Table
CREATE TABLE IF NOT EXISTS team_project_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    team_member_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    fee DECIMAL(15,2) NOT NULL DEFAULT 0,
    reward DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Paid', 'Unpaid')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, team_member_id)
);

CREATE INDEX idx_team_payments_project ON team_project_payments(project_id);
CREATE INDEX idx_team_payments_member ON team_project_payments(team_member_id);
CREATE INDEX idx_team_payments_status ON team_project_payments(status);

CREATE TRIGGER update_team_payments_updated_at
    BEFORE UPDATE ON team_project_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Team Payment Records Table
CREATE TABLE IF NOT EXISTS team_payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    record_number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    project_payment_ids JSONB DEFAULT '[]'::jsonb,
    vendor_signature TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_records_team_member ON team_payment_records(team_member_id);
CREATE INDEX idx_payment_records_date ON team_payment_records(date DESC);

CREATE TRIGGER update_payment_records_updated_at
    BEFORE UPDATE ON team_payment_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Reward Ledger Entries Table
CREATE TABLE IF NOT EXISTS reward_ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reward_ledger_team_member ON reward_ledger_entries(team_member_id);
CREATE INDEX idx_reward_ledger_date ON reward_ledger_entries(date DESC);

CREATE TRIGGER update_reward_ledger_updated_at
    BEFORE UPDATE ON reward_ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Sample Cards
INSERT INTO cards (card_holder_name, bank_name, last_four_digits, card_type, balance, color_gradient) VALUES
('Vena Pictures', 'BCA', '1234', 'Debit', 50000000, 'from-blue-500 to-sky-400'),
('Vena Pictures', 'Mandiri', '5678', 'Debit', 25000000, 'from-yellow-500 to-orange-400'),
('Vena Pictures', 'Cash', 'CASH', 'Tunai', 5000000, 'from-green-500 to-emerald-400')
ON CONFLICT DO NOTHING;

-- Sample Team Members
INSERT INTO team_members (name, email, phone, role, standard_fee, rating) VALUES
('Andi Photographer', 'andi@email.com', '081234567896', 'Fotografer', 1500000, 4.5),
('Budi Videographer', 'budi@email.com', '081234567897', 'Videografer', 2000000, 4.8),
('Citra Editor', 'citra@email.com', '081234567898', 'Editor', 1000000, 4.2)
ON CONFLICT DO NOTHING;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'FINANCIAL & TEAM TABLES CREATED!';
    RAISE NOTICE '============================================';
END $$;
