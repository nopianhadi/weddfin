-- ============================================
-- VENA PICTURES CRM - DATABASE SCHEMA
-- Part 6: Projects (Main Table)
-- ============================================

-- ============================================
-- TABLE: projects
-- Purpose: Main project management
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
    promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
    
    -- Project Info
    project_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL, -- Denormalized for quick access
    project_type VARCHAR(100) NOT NULL,
    package_name VARCHAR(255) NOT NULL, -- Denormalized
    
    -- Location & Schedule
    location VARCHAR(255),
    date DATE NOT NULL,
    deadline_date DATE,
    start_time TIME,
    end_time TIME,
    
    -- Status & Progress
    status VARCHAR(100) NOT NULL DEFAULT 'Dikonfirmasi',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    active_sub_statuses JSONB DEFAULT '[]'::jsonb, -- Array of active sub-status names
    confirmed_sub_statuses JSONB DEFAULT '[]'::jsonb, -- Sub-statuses confirmed by client
    custom_sub_statuses JSONB DEFAULT '[]'::jsonb, -- Custom sub-statuses for this project
    
    -- Booking Status
    booking_status VARCHAR(50) CHECK (booking_status IN ('Baru', 'Terkonfirmasi', 'Ditolak')),
    rejection_reason TEXT,
    
    -- Financial
    total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(15,2) DEFAULT 0,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Belum Bayar'
        CHECK (payment_status IN ('Lunas', 'DP Terbayar', 'Belum Bayar')),
    discount_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Package Details (stored at booking time)
    duration_selection VARCHAR(100), -- e.g., '4 Jam'
    unit_price DECIMAL(15,2), -- Price per unit/duration
    add_ons JSONB DEFAULT '[]'::jsonb, -- Array of add-on objects {id, name, price}
    
    -- Operational Costs
    printing_cost DECIMAL(15,2) DEFAULT 0,
    transport_cost DECIMAL(15,2) DEFAULT 0,
    transport_used BOOLEAN DEFAULT false,
    transport_paid BOOLEAN DEFAULT false,
    transport_note TEXT,
    
    -- Detailed Cost Items (JSONB arrays)
    printing_details JSONB DEFAULT '[]'::jsonb, -- Array of printing items
    transport_details JSONB DEFAULT '[]'::jsonb, -- Array of transport items
    custom_costs JSONB DEFAULT '[]'::jsonb, -- Array of custom cost items
    
    -- Team Assignment (JSONB array)
    team JSONB DEFAULT '[]'::jsonb, -- Array of assigned team members
    
    -- Links & Files
    drive_link TEXT, -- Internal brief/moodboard
    client_drive_link TEXT, -- Files from client
    final_drive_link TEXT, -- Final deliverables
    image TEXT, -- Cover image URL
    
    -- Notes & Details
    notes TEXT,
    accommodation TEXT,
    shipping_details TEXT,
    
    -- Client Confirmations
    is_editing_confirmed_by_client BOOLEAN DEFAULT false,
    is_printing_confirmed_by_client BOOLEAN DEFAULT false,
    is_delivery_confirmed_by_client BOOLEAN DEFAULT false,
    client_sub_status_notes JSONB DEFAULT '{}'::jsonb, -- Object {subStatusName: note}
    sub_status_confirmation_sent_at JSONB DEFAULT '{}'::jsonb, -- Object {subStatusName: timestamp}
    
    -- Completed Items Tracking
    completed_digital_items JSONB DEFAULT '[]'::jsonb, -- Array of completed digital item names
    
    -- Payment Proof
    dp_proof_url TEXT, -- URL to DP payment proof image
    
    -- Signatures
    invoice_signature TEXT, -- Base64 signature for invoice
    
    -- Chat History (JSONB array)
    chat_history JSONB DEFAULT '[]'::jsonb, -- Array of chat messages
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: projects
-- ============================================
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_package_id ON projects(package_id);
CREATE INDEX idx_projects_promo_code_id ON projects(promo_code_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_booking_status ON projects(booking_status);
CREATE INDEX idx_projects_payment_status ON projects(payment_status);
CREATE INDEX idx_projects_date ON projects(date DESC);
CREATE INDEX idx_projects_deadline_date ON projects(deadline_date);
CREATE INDEX idx_projects_project_type ON projects(project_type);
CREATE INDEX idx_projects_progress ON projects(progress);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- Text search indexes
CREATE INDEX idx_projects_project_name ON projects USING gin(project_name gin_trgm_ops);
CREATE INDEX idx_projects_client_name ON projects USING gin(client_name gin_trgm_ops);
CREATE INDEX idx_projects_location ON projects USING gin(location gin_trgm_ops);

-- GIN indexes for JSONB
CREATE INDEX idx_projects_team ON projects USING GIN (team);
CREATE INDEX idx_projects_add_ons ON projects USING GIN (add_ons);
CREATE INDEX idx_projects_active_sub_statuses ON projects USING GIN (active_sub_statuses);
CREATE INDEX idx_projects_printing_details ON projects USING GIN (printing_details);
CREATE INDEX idx_projects_transport_details ON projects USING GIN (transport_details);

-- ============================================
-- COMMENTS: projects
-- ============================================
COMMENT ON TABLE projects IS 'Main project management table';
COMMENT ON COLUMN projects.client_name IS 'Denormalized client name for quick access';
COMMENT ON COLUMN projects.package_name IS 'Denormalized package name for quick access';
COMMENT ON COLUMN projects.active_sub_statuses IS 'Array of currently active sub-status names';
COMMENT ON COLUMN projects.confirmed_sub_statuses IS 'Sub-statuses confirmed by client';
COMMENT ON COLUMN projects.custom_sub_statuses IS 'Custom sub-statuses specific to this project';
COMMENT ON COLUMN projects.booking_status IS 'Status for new bookings from public form';
COMMENT ON COLUMN projects.duration_selection IS 'Selected duration option from package';
COMMENT ON COLUMN projects.unit_price IS 'Price per unit at time of booking';
COMMENT ON COLUMN projects.add_ons IS 'JSONB array of selected add-ons with prices';
COMMENT ON COLUMN projects.team IS 'JSONB array of assigned team members with fees';
COMMENT ON COLUMN projects.printing_details IS 'Detailed printing items with costs';
COMMENT ON COLUMN projects.transport_details IS 'Detailed transport items with costs';
COMMENT ON COLUMN projects.custom_costs IS 'Additional custom operational costs';
COMMENT ON COLUMN projects.chat_history IS 'Chat messages between vendor and client';

-- ============================================
-- TRIGGER: projects
-- ============================================
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: Auto-update payment status
-- ============================================
CREATE OR REPLACE FUNCTION update_project_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.amount_paid >= NEW.total_cost THEN
        NEW.payment_status := 'Lunas';
    ELSIF NEW.amount_paid > 0 THEN
        NEW.payment_status := 'DP Terbayar';
    ELSE
        NEW.payment_status := 'Belum Bayar';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_status
    BEFORE INSERT OR UPDATE OF amount_paid, total_cost ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_project_payment_status();

-- ============================================
-- FUNCTION: Calculate project total cost
-- ============================================
CREATE OR REPLACE FUNCTION calculate_project_total_cost(
    package_price DECIMAL,
    add_ons_total DECIMAL,
    printing_cost DECIMAL,
    transport_cost DECIMAL,
    custom_costs_total DECIMAL,
    discount_amount DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
    RETURN (package_price + add_ons_total + printing_cost + transport_cost + custom_costs_total) - discount_amount;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_project_total_cost IS 'Calculate total project cost including all items and discount';

-- ============================================
-- VIEW: projects_with_balance
-- Purpose: Projects with remaining balance
-- ============================================
CREATE OR REPLACE VIEW projects_with_balance AS
SELECT 
    p.*,
    (p.total_cost - p.amount_paid) AS remaining_balance,
    c.email AS client_email,
    c.phone AS client_phone,
    c.whatsapp AS client_whatsapp
FROM projects p
JOIN clients c ON p.client_id = c.id
WHERE p.amount_paid < p.total_cost
ORDER BY p.date DESC;

COMMENT ON VIEW projects_with_balance IS 'Projects with outstanding balance';

-- ============================================
-- VIEW: active_projects
-- Purpose: Projects that are not completed or cancelled
-- ============================================
CREATE OR REPLACE VIEW active_projects AS
SELECT 
    p.*,
    c.email AS client_email,
    c.phone AS client_phone,
    c.status AS client_status
FROM projects p
JOIN clients c ON p.client_id = c.id
WHERE p.status NOT IN ('Selesai', 'Dibatalkan')
ORDER BY p.date ASC;

COMMENT ON VIEW active_projects IS 'Active projects (not completed or cancelled)';

-- ============================================
-- SAMPLE DATA: projects
-- ============================================
INSERT INTO projects (
    client_id,
    package_id,
    project_name,
    client_name,
    project_type,
    package_name,
    location,
    date,
    status,
    progress,
    total_cost,
    amount_paid,
    payment_status
)
SELECT 
    c.id,
    p.id,
    'Wedding ' || c.name,
    c.name,
    'Wedding',
    p.name,
    'Bandung',
    CURRENT_DATE + INTERVAL '30 days',
    'Dikonfirmasi',
    10,
    p.price,
    p.price * 0.3, -- 30% DP
    'DP Terbayar'
FROM clients c
CROSS JOIN packages p
WHERE c.email = 'john.doe@email.com'
AND p.name = 'Wedding Basic'
LIMIT 1
ON CONFLICT DO NOTHING;
