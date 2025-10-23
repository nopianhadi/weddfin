-- ============================================
-- VENA PICTURES CRM - DATABASE SCHEMA
-- Part 7: Financial Tables
-- ============================================

-- ============================================
-- TABLE: cards
-- Purpose: Bank cards/accounts
-- ============================================
CREATE TABLE IF NOT EXISTS cards (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Card Info
    card_holder_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    last_four_digits VARCHAR(4) NOT NULL,
    
    -- Card Type
    card_type VARCHAR(50) NOT NULL CHECK (card_type IN ('Prabayar', 'Kredit', 'Debit', 'Tunai')),
    
    -- Details
    expiry_date VARCHAR(7), -- MM/YY format
    
    -- Balance
    balance DECIMAL(15,2) DEFAULT 0,
    
    -- UI Customization
    color_gradient VARCHAR(100) DEFAULT 'from-slate-700 to-slate-900',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: cards
-- ============================================
CREATE INDEX idx_cards_card_type ON cards(card_type);
CREATE INDEX idx_cards_is_active ON cards(is_active);
CREATE INDEX idx_cards_bank_name ON cards(bank_name);

-- ============================================
-- COMMENTS: cards
-- ============================================
COMMENT ON TABLE cards IS 'Bank cards and cash accounts';
COMMENT ON COLUMN cards.last_four_digits IS 'Last 4 digits of card number, or "CASH" for cash accounts';
COMMENT ON COLUMN cards.color_gradient IS 'Tailwind gradient class for UI display';

-- ============================================
-- TRIGGER: cards
-- ============================================
CREATE TRIGGER update_cards_updated_at
    BEFORE UPDATE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: pockets
-- Purpose: Financial pockets/envelopes
-- ============================================
CREATE TABLE IF NOT EXISTS pockets (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Pocket Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'piggy-bank' 
        CHECK (icon IN ('piggy-bank', 'lock', 'users', 'clipboard-list', 'star')),
    
    -- Pocket Type
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'Nabung & Bayar',
        'Terkunci',
        'Bersama',
        'Anggaran Pengeluaran',
        'Tabungan Hadiah Freelancer'
    )),
    
    -- Balance
    amount DECIMAL(15,2) DEFAULT 0,
    goal_amount DECIMAL(15,2), -- For savings and budget types
    
    -- Lock Settings (for 'Terkunci' type)
    lock_end_date DATE,
    
    -- Source Card (optional link to physical card)
    source_card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
    
    -- Members (JSONB array for 'Bersama' type)
    members JSONB DEFAULT '[]'::jsonb, -- Array of team member IDs
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: pockets
-- ============================================
CREATE INDEX idx_pockets_type ON pockets(type);
CREATE INDEX idx_pockets_source_card ON pockets(source_card_id);
CREATE INDEX idx_pockets_is_active ON pockets(is_active);
CREATE INDEX idx_pockets_members ON pockets USING GIN (members);

-- ============================================
-- COMMENTS: pockets
-- ============================================
COMMENT ON TABLE pockets IS 'Financial pockets for budget management';
COMMENT ON COLUMN pockets.type IS 'Pocket type determines behavior and rules';
COMMENT ON COLUMN pockets.goal_amount IS 'Target amount for savings or budget limit';
COMMENT ON COLUMN pockets.lock_end_date IS 'Date when locked pocket can be accessed';
COMMENT ON COLUMN pockets.source_card_id IS 'Optional link to physical card';
COMMENT ON COLUMN pockets.members IS 'Team member IDs for shared pockets';

-- ============================================
-- TRIGGER: pockets
-- ============================================
CREATE TRIGGER update_pockets_updated_at
    BEFORE UPDATE ON pockets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: transactions
-- Purpose: All financial transactions
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
    pocket_id UUID REFERENCES pockets(id) ON DELETE SET NULL,
    
    -- Transaction Info
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    
    -- Type & Category
    type VARCHAR(50) NOT NULL CHECK (type IN ('Pemasukan', 'Pengeluaran')),
    category VARCHAR(100) NOT NULL,
    method VARCHAR(50) NOT NULL CHECK (method IN ('Transfer Bank', 'Tunai', 'E-Wallet', 'Sistem', 'Kartu')),
    
    -- Additional References
    printing_item_id VARCHAR(100), -- Reference to printing item in project
    
    -- Signature (for vendor payments)
    vendor_signature TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: transactions
-- ============================================
CREATE INDEX idx_transactions_project_id ON transactions(project_id);
CREATE INDEX idx_transactions_card_id ON transactions(card_id);
CREATE INDEX idx_transactions_pocket_id ON transactions(pocket_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_method ON transactions(method);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_amount ON transactions(amount);

-- Text search
CREATE INDEX idx_transactions_description ON transactions USING gin(description gin_trgm_ops);

-- ============================================
-- COMMENTS: transactions
-- ============================================
COMMENT ON TABLE transactions IS 'All financial transactions (income and expenses)';
COMMENT ON COLUMN transactions.type IS 'Pemasukan (income) or Pengeluaran (expense)';
COMMENT ON COLUMN transactions.method IS 'Payment method used';
COMMENT ON COLUMN transactions.printing_item_id IS 'Reference to specific printing item in project';
COMMENT ON COLUMN transactions.vendor_signature IS 'Digital signature for vendor payments';

-- ============================================
-- TRIGGER: transactions
-- ============================================
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: Update card balance on transaction
-- ============================================
CREATE OR REPLACE FUNCTION update_card_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.card_id IS NOT NULL THEN
            IF NEW.type = 'Pemasukan' THEN
                UPDATE cards SET balance = balance + NEW.amount WHERE id = NEW.card_id;
            ELSE
                UPDATE cards SET balance = balance - NEW.amount WHERE id = NEW.card_id;
            END IF;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Revert old transaction
        IF OLD.card_id IS NOT NULL THEN
            IF OLD.type = 'Pemasukan' THEN
                UPDATE cards SET balance = balance - OLD.amount WHERE id = OLD.card_id;
            ELSE
                UPDATE cards SET balance = balance + OLD.amount WHERE id = OLD.card_id;
            END IF;
        END IF;
        -- Apply new transaction
        IF NEW.card_id IS NOT NULL THEN
            IF NEW.type = 'Pemasukan' THEN
                UPDATE cards SET balance = balance + NEW.amount WHERE id = NEW.card_id;
            ELSE
                UPDATE cards SET balance = balance - NEW.amount WHERE id = NEW.card_id;
            END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.card_id IS NOT NULL THEN
            IF OLD.type = 'Pemasukan' THEN
                UPDATE cards SET balance = balance - OLD.amount WHERE id = OLD.card_id;
            ELSE
                UPDATE cards SET balance = balance + OLD.amount WHERE id = OLD.card_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_card_balance
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_card_balance_on_transaction();

-- ============================================
-- VIEW: financial_summary
-- Purpose: Overall financial summary
-- ============================================
CREATE OR REPLACE VIEW financial_summary AS
SELECT 
    (SELECT COALESCE(SUM(balance), 0) FROM cards WHERE is_active = true) AS total_card_balance,
    (SELECT COALESCE(SUM(amount), 0) FROM pockets WHERE is_active = true) AS total_pocket_balance,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'Pemasukan' AND date >= DATE_TRUNC('month', CURRENT_DATE)) AS monthly_income,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'Pengeluaran' AND date >= DATE_TRUNC('month', CURRENT_DATE)) AS monthly_expense,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'Pemasukan' AND date >= DATE_TRUNC('year', CURRENT_DATE)) AS yearly_income,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'Pengeluaran' AND date >= DATE_TRUNC('year', CURRENT_DATE)) AS yearly_expense;

COMMENT ON VIEW financial_summary IS 'Overall financial summary with balances and income/expense';

-- ============================================
-- SAMPLE DATA: cards
-- ============================================
INSERT INTO cards (card_holder_name, bank_name, last_four_digits, card_type, balance, color_gradient) VALUES
('Vena Pictures', 'BCA', '1234', 'Debit', 50000000, 'from-blue-500 to-sky-400'),
('Vena Pictures', 'Mandiri', '5678', 'Debit', 25000000, 'from-yellow-500 to-orange-400'),
('Vena Pictures', 'Cash', 'CASH', 'Tunai', 5000000, 'from-green-500 to-emerald-400')
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE DATA: pockets
-- ============================================
INSERT INTO pockets (name, description, type, amount, goal_amount) VALUES
('Dana Darurat', 'Dana untuk keperluan darurat', 'Terkunci', 10000000, 20000000),
('Tabungan Peralatan', 'Untuk beli kamera baru', 'Nabung & Bayar', 15000000, 50000000),
('Reward Pool', 'Pool untuk bonus freelancer', 'Tabungan Hadiah Freelancer', 5000000, NULL)
ON CONFLICT DO NOTHING;
