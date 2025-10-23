-- ============================================
-- VENA PICTURES CRM - DATABASE SCHEMA
-- Part 8: Team & Freelancer Management
-- ============================================

-- ============================================
-- TABLE: team_members
-- Purpose: Freelancer/team member data
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Personal Info
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    
    -- Role & Skills
    role VARCHAR(100) NOT NULL, -- e.g., Fotografer, Videografer, Editor
    
    -- Financial
    standard_fee DECIMAL(15,2) DEFAULT 0,
    no_rek VARCHAR(100), -- Bank account number
    reward_balance DECIMAL(15,2) DEFAULT 0,
    
    -- Performance
    rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    performance_notes JSONB DEFAULT '[]'::jsonb, -- Array of performance note objects
    
    -- Portal Access
    portal_access_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: team_members
-- ============================================
CREATE INDEX idx_team_members_role ON team_members(role);
CREATE INDEX idx_team_members_is_active ON team_members(is_active);
CREATE INDEX idx_team_members_portal_access ON team_members(portal_access_id);
CREATE INDEX idx_team_members_name ON team_members USING gin(name gin_trgm_ops);
CREATE INDEX idx_team_members_rating ON team_members(rating DESC);
CREATE INDEX idx_team_members_performance_notes ON team_members USING GIN (performance_notes);

-- ============================================
-- COMMENTS: team_members
-- ============================================
COMMENT ON TABLE team_members IS 'Freelancer and team member database';
COMMENT ON COLUMN team_members.standard_fee IS 'Default fee per project';
COMMENT ON COLUMN team_members.reward_balance IS 'Accumulated reward/bonus balance';
COMMENT ON COLUMN team_members.rating IS 'Performance rating (1-5 stars)';
COMMENT ON COLUMN team_members.performance_notes IS 'JSONB array of performance notes';
COMMENT ON COLUMN team_members.portal_access_id IS 'Unique ID for freelancer portal access';

-- ============================================
-- TRIGGER: team_members
-- ============================================
CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: project_team_assignments
-- Purpose: Team member assignments to projects
-- ============================================
CREATE TABLE IF NOT EXISTS project_team_assignments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    
    -- Assignment Details
    role VARCHAR(100) NOT NULL,
    fee DECIMAL(15,2) NOT NULL DEFAULT 0,
    reward DECIMAL(15,2) DEFAULT 0,
    sub_job TEXT, -- Specific task/responsibility
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(project_id, team_member_id)
);

-- ============================================
-- INDEXES: project_team_assignments
-- ============================================
CREATE INDEX idx_assignments_project ON project_team_assignments(project_id);
CREATE INDEX idx_assignments_team_member ON project_team_assignments(team_member_id);
CREATE INDEX idx_assignments_is_active ON project_team_assignments(is_active);

-- ============================================
-- COMMENTS: project_team_assignments
-- ============================================
COMMENT ON TABLE project_team_assignments IS 'Team member assignments to specific projects';
COMMENT ON COLUMN project_team_assignments.fee IS 'Fee for this specific project';
COMMENT ON COLUMN project_team_assignments.reward IS 'Bonus/reward for this project';
COMMENT ON COLUMN project_team_assignments.sub_job IS 'Specific task or responsibility';

-- ============================================
-- TRIGGER: project_team_assignments
-- ============================================
CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON project_team_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: team_project_payments
-- Purpose: Track payment status for team members per project
-- ============================================
CREATE TABLE IF NOT EXISTS team_project_payments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    
    -- Payment Info
    team_member_name VARCHAR(255) NOT NULL, -- Denormalized
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    fee DECIMAL(15,2) NOT NULL DEFAULT 0,
    reward DECIMAL(15,2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Paid', 'Unpaid')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(project_id, team_member_id)
);

-- ============================================
-- INDEXES: team_project_payments
-- ============================================
CREATE INDEX idx_team_payments_project ON team_project_payments(project_id);
CREATE INDEX idx_team_payments_member ON team_project_payments(team_member_id);
CREATE INDEX idx_team_payments_status ON team_project_payments(status);
CREATE INDEX idx_team_payments_date ON team_project_payments(date DESC);

-- ============================================
-- COMMENTS: team_project_payments
-- ============================================
COMMENT ON TABLE team_project_payments IS 'Payment tracking for team members per project';
COMMENT ON COLUMN team_project_payments.status IS 'Payment status: Paid or Unpaid';

-- ============================================
-- TRIGGER: team_project_payments
-- ============================================
CREATE TRIGGER update_team_payments_updated_at
    BEFORE UPDATE ON team_project_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: team_payment_records
-- Purpose: Batch payment records with signature
-- ============================================
CREATE TABLE IF NOT EXISTS team_payment_records (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    
    -- Record Info
    record_number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Project Payment References (JSONB array of payment IDs)
    project_payment_ids JSONB DEFAULT '[]'::jsonb,
    
    -- Signature
    vendor_signature TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: team_payment_records
-- ============================================
CREATE INDEX idx_payment_records_team_member ON team_payment_records(team_member_id);
CREATE INDEX idx_payment_records_date ON team_payment_records(date DESC);
CREATE INDEX idx_payment_records_record_number ON team_payment_records(record_number);
CREATE INDEX idx_payment_records_project_payment_ids ON team_payment_records USING GIN (project_payment_ids);

-- ============================================
-- COMMENTS: team_payment_records
-- ============================================
COMMENT ON TABLE team_payment_records IS 'Batch payment records for team members';
COMMENT ON COLUMN team_payment_records.record_number IS 'Unique payment record number';
COMMENT ON COLUMN team_payment_records.project_payment_ids IS 'Array of team_project_payment IDs included in this record';
COMMENT ON COLUMN team_payment_records.vendor_signature IS 'Digital signature from vendor';

-- ============================================
-- TRIGGER: team_payment_records
-- ============================================
CREATE TRIGGER update_payment_records_updated_at
    BEFORE UPDATE ON team_payment_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: reward_ledger_entries
-- Purpose: Track reward deposits and withdrawals
-- ============================================
CREATE TABLE IF NOT EXISTS reward_ledger_entries (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Entry Info
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL, -- Positive for deposit, negative for withdrawal
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: reward_ledger_entries
-- ============================================
CREATE INDEX idx_reward_ledger_team_member ON reward_ledger_entries(team_member_id);
CREATE INDEX idx_reward_ledger_project ON reward_ledger_entries(project_id);
CREATE INDEX idx_reward_ledger_date ON reward_ledger_entries(date DESC);

-- ============================================
-- COMMENTS: reward_ledger_entries
-- ============================================
COMMENT ON TABLE reward_ledger_entries IS 'Reward/bonus ledger for team members';
COMMENT ON COLUMN reward_ledger_entries.amount IS 'Positive for deposit, negative for withdrawal';

-- ============================================
-- TRIGGER: reward_ledger_entries
-- ============================================
CREATE TRIGGER update_reward_ledger_updated_at
    BEFORE UPDATE ON reward_ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: Update team member reward balance
-- ============================================
CREATE OR REPLACE FUNCTION update_team_member_reward_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE team_members 
        SET reward_balance = reward_balance + NEW.amount 
        WHERE id = NEW.team_member_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE team_members 
        SET reward_balance = reward_balance - OLD.amount + NEW.amount 
        WHERE id = NEW.team_member_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE team_members 
        SET reward_balance = reward_balance - OLD.amount 
        WHERE id = OLD.team_member_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reward_balance
    AFTER INSERT OR UPDATE OR DELETE ON reward_ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_team_member_reward_balance();

-- ============================================
-- VIEW: unpaid_team_payments
-- Purpose: All unpaid team payments
-- ============================================
CREATE OR REPLACE VIEW unpaid_team_payments AS
SELECT 
    tp.*,
    tm.name AS team_member_name,
    tm.no_rek,
    p.project_name,
    p.date AS project_date
FROM team_project_payments tp
JOIN team_members tm ON tp.team_member_id = tm.id
JOIN projects p ON tp.project_id = p.id
WHERE tp.status = 'Unpaid'
ORDER BY tp.date ASC;

COMMENT ON VIEW unpaid_team_payments IS 'All unpaid team member payments';

-- ============================================
-- SAMPLE DATA: team_members
-- ============================================
INSERT INTO team_members (name, email, phone, role, standard_fee, rating) VALUES
('Andi Photographer', 'andi@email.com', '081234567896', 'Fotografer', 1500000, 4.5),
('Budi Videographer', 'budi@email.com', '081234567897', 'Videografer', 2000000, 4.8),
('Citra Editor', 'citra@email.com', '081234567898', 'Editor', 1000000, 4.2)
ON CONFLICT DO NOTHING;
