-- ============================================
-- VENA PICTURES CRM - DATABASE SCHEMA
-- Part 4: Clients & Leads
-- ============================================

-- ============================================
-- TABLE: clients
-- Purpose: Client/customer data
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Client Info
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50),
    instagram VARCHAR(255),
    
    -- Status & Type
    status VARCHAR(50) NOT NULL DEFAULT 'Prospek'
        CHECK (status IN ('Prospek', 'Aktif', 'Tidak Aktif', 'Hilang')),
    client_type VARCHAR(50) NOT NULL DEFAULT 'Langsung'
        CHECK (client_type IN ('Langsung', 'Vendor')),
    
    -- Dates
    since DATE NOT NULL DEFAULT CURRENT_DATE,
    last_contact DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Portal Access
    portal_access_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: clients
-- ============================================
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_type ON clients(client_type);
CREATE INDEX idx_clients_portal_access ON clients(portal_access_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_name ON clients USING gin(name gin_trgm_ops);
CREATE INDEX idx_clients_since ON clients(since);
CREATE INDEX idx_clients_last_contact ON clients(last_contact);

-- ============================================
-- COMMENTS: clients
-- ============================================
COMMENT ON TABLE clients IS 'Client/customer database';
COMMENT ON COLUMN clients.status IS 'Client status: Prospek, Aktif, Tidak Aktif, Hilang';
COMMENT ON COLUMN clients.client_type IS 'Client type: Langsung (direct) or Vendor';
COMMENT ON COLUMN clients.portal_access_id IS 'Unique ID for client portal access (no login required)';
COMMENT ON COLUMN clients.since IS 'Date when client first registered';
COMMENT ON COLUMN clients.last_contact IS 'Last contact/interaction date';

-- ============================================
-- TRIGGER: clients
-- ============================================
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: leads
-- Purpose: Prospek/potential clients
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Lead Info
    name VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(50),
    location VARCHAR(255),
    
    -- Contact Channel
    contact_channel VARCHAR(100) NOT NULL DEFAULT 'WhatsApp'
        CHECK (contact_channel IN (
            'WhatsApp', 
            'Instagram', 
            'Website', 
            'Telepon', 
            'Referensi', 
            'Form Saran', 
            'Lainnya'
        )),
    
    -- Status
    status VARCHAR(100) NOT NULL DEFAULT 'Sedang Diskusi'
        CHECK (status IN (
            'Sedang Diskusi', 
            'Menunggu Follow Up', 
            'Dikonversi', 
            'Ditolak'
        )),
    
    -- Date & Notes
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    
    -- Converted Client Reference (optional)
    converted_to_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    converted_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: leads
-- ============================================
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_date ON leads(date DESC);
CREATE INDEX idx_leads_channel ON leads(contact_channel);
CREATE INDEX idx_leads_name ON leads USING gin(name gin_trgm_ops);
CREATE INDEX idx_leads_converted_client ON leads(converted_to_client_id);

-- ============================================
-- COMMENTS: leads
-- ============================================
COMMENT ON TABLE leads IS 'Prospek/potential clients database';
COMMENT ON COLUMN leads.contact_channel IS 'How the lead contacted us';
COMMENT ON COLUMN leads.status IS 'Lead status in sales funnel';
COMMENT ON COLUMN leads.converted_to_client_id IS 'Reference to client if lead was converted';
COMMENT ON COLUMN leads.converted_at IS 'Timestamp when lead was converted to client';

-- ============================================
-- TRIGGER: leads
-- ============================================
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Convert lead to client
-- ============================================
CREATE OR REPLACE FUNCTION convert_lead_to_client(
    lead_id UUID,
    client_email VARCHAR,
    client_phone VARCHAR
)
RETURNS UUID AS $$
DECLARE
    new_client_id UUID;
    lead_record RECORD;
BEGIN
    -- Get lead data
    SELECT * INTO lead_record FROM leads WHERE id = lead_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead not found';
    END IF;
    
    -- Create new client
    INSERT INTO clients (
        name,
        email,
        phone,
        whatsapp,
        status,
        client_type,
        since,
        last_contact
    ) VALUES (
        lead_record.name,
        client_email,
        client_phone,
        lead_record.whatsapp,
        'Aktif',
        'Langsung',
        CURRENT_DATE,
        CURRENT_DATE
    ) RETURNING id INTO new_client_id;
    
    -- Update lead status
    UPDATE leads 
    SET 
        status = 'Dikonversi',
        converted_to_client_id = new_client_id,
        converted_at = NOW()
    WHERE id = lead_id;
    
    RETURN new_client_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION convert_lead_to_client IS 'Convert a lead to a client and update lead status';

-- ============================================
-- SAMPLE DATA: clients
-- ============================================
INSERT INTO clients (name, email, phone, whatsapp, status, client_type) VALUES
('John & Jane Doe', 'john.doe@email.com', '081234567890', '081234567890', 'Aktif', 'Langsung'),
('PT. Example Corp', 'info@example.com', '081234567891', '081234567891', 'Aktif', 'Vendor'),
('Ahmad & Siti', 'ahmad@email.com', '081234567892', '081234567892', 'Prospek', 'Langsung')
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE DATA: leads
-- ============================================
INSERT INTO leads (name, contact_channel, location, status, whatsapp, notes) VALUES
('Budi Santoso', 'WhatsApp', 'Jakarta', 'Sedang Diskusi', '081234567893', 'Tertarik paket wedding'),
('Rina Wijaya', 'Instagram', 'Bandung', 'Menunggu Follow Up', '081234567894', 'Tanya harga prewedding'),
('David Chen', 'Website', 'Surabaya', 'Sedang Diskusi', '081234567895', 'Corporate event')
ON CONFLICT DO NOTHING;
