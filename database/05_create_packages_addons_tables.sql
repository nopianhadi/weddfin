-- ============================================
-- VENA PICTURES CRM - DATABASE SCHEMA
-- Part 5: Packages & Add-ons
-- ============================================

-- ============================================
-- TABLE: packages
-- Purpose: Service packages/products
-- ============================================
CREATE TABLE IF NOT EXISTS packages (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Package Info
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    region VARCHAR(100), -- e.g., 'bandung', 'jabodetabek'
    
    -- Pricing
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Duration Options (JSONB array)
    -- Example: [{"label": "2 Jam", "price": 1000000, "default": true}]
    duration_options JSONB DEFAULT '[]'::jsonb,
    
    -- Package Contents
    physical_items JSONB DEFAULT '[]'::jsonb, -- Array of {name, price}
    digital_items JSONB DEFAULT '[]'::jsonb, -- Array of strings
    
    -- Details
    processing_time VARCHAR(100),
    photographers VARCHAR(100),
    videographers VARCHAR(100),
    
    -- Default Costs
    default_printing_cost DECIMAL(15,2) DEFAULT 0,
    default_transport_cost DECIMAL(15,2) DEFAULT 0,
    
    -- Media
    cover_image TEXT, -- Base64 or URL
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: packages
-- ============================================
CREATE INDEX idx_packages_category ON packages(category);
CREATE INDEX idx_packages_region ON packages(region);
CREATE INDEX idx_packages_is_active ON packages(is_active);
CREATE INDEX idx_packages_name ON packages USING gin(name gin_trgm_ops);
CREATE INDEX idx_packages_price ON packages(price);

-- GIN indexes for JSONB
CREATE INDEX idx_packages_duration_options ON packages USING GIN (duration_options);
CREATE INDEX idx_packages_physical_items ON packages USING GIN (physical_items);

-- ============================================
-- COMMENTS: packages
-- ============================================
COMMENT ON TABLE packages IS 'Service packages/products catalog';
COMMENT ON COLUMN packages.duration_options IS 'JSONB array of duration-based pricing options';
COMMENT ON COLUMN packages.physical_items IS 'JSONB array of physical output items with prices';
COMMENT ON COLUMN packages.digital_items IS 'JSONB array of digital deliverables';
COMMENT ON COLUMN packages.region IS 'Operational region for this package';

-- ============================================
-- TRIGGER: packages
-- ============================================
CREATE TRIGGER update_packages_updated_at
    BEFORE UPDATE ON packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: add_ons
-- Purpose: Additional services/products
-- ============================================
CREATE TABLE IF NOT EXISTS add_ons (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Add-on Info
    name VARCHAR(255) NOT NULL,
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    region VARCHAR(100), -- Optional region scoping
    
    -- Description
    description TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: add_ons
-- ============================================
CREATE INDEX idx_addons_region ON add_ons(region);
CREATE INDEX idx_addons_is_active ON add_ons(is_active);
CREATE INDEX idx_addons_name ON add_ons USING gin(name gin_trgm_ops);
CREATE INDEX idx_addons_price ON add_ons(price);

-- ============================================
-- COMMENTS: add_ons
-- ============================================
COMMENT ON TABLE add_ons IS 'Additional services/products that can be added to packages';
COMMENT ON COLUMN add_ons.region IS 'Optional region scoping for add-on availability';

-- ============================================
-- TRIGGER: add_ons
-- ============================================
CREATE TRIGGER update_addons_updated_at
    BEFORE UPDATE ON add_ons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: promo_codes
-- Purpose: Promotional discount codes
-- ============================================
CREATE TABLE IF NOT EXISTS promo_codes (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Promo Info
    code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Discount
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(15,2) NOT NULL,
    
    -- Usage Limits
    max_usage INTEGER,
    usage_count INTEGER DEFAULT 0,
    
    -- Validity
    expiry_date DATE,
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES: promo_codes
-- ============================================
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_is_active ON promo_codes(is_active);
CREATE INDEX idx_promo_codes_expiry ON promo_codes(expiry_date);

-- ============================================
-- COMMENTS: promo_codes
-- ============================================
COMMENT ON TABLE promo_codes IS 'Promotional discount codes for bookings';
COMMENT ON COLUMN promo_codes.discount_type IS 'Type: percentage (%) or fixed (amount)';
COMMENT ON COLUMN promo_codes.usage_count IS 'Number of times this code has been used';

-- ============================================
-- TRIGGER: promo_codes
-- ============================================
CREATE TRIGGER update_promo_codes_updated_at
    BEFORE UPDATE ON promo_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Validate and apply promo code
-- ============================================
CREATE OR REPLACE FUNCTION validate_promo_code(
    promo_code_text VARCHAR,
    order_amount DECIMAL
)
RETURNS TABLE (
    is_valid BOOLEAN,
    discount_amount DECIMAL,
    message TEXT
) AS $$
DECLARE
    promo RECORD;
    calculated_discount DECIMAL;
BEGIN
    -- Get promo code
    SELECT * INTO promo FROM promo_codes WHERE code = promo_code_text;
    
    -- Check if exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'Kode promo tidak ditemukan';
        RETURN;
    END IF;
    
    -- Check if active
    IF NOT promo.is_active THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'Kode promo tidak aktif';
        RETURN;
    END IF;
    
    -- Check expiry
    IF promo.expiry_date IS NOT NULL AND promo.expiry_date < CURRENT_DATE THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'Kode promo sudah kadaluarsa';
        RETURN;
    END IF;
    
    -- Check usage limit
    IF promo.max_usage IS NOT NULL AND promo.usage_count >= promo.max_usage THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'Kode promo sudah mencapai batas penggunaan';
        RETURN;
    END IF;
    
    -- Calculate discount
    IF promo.discount_type = 'percentage' THEN
        calculated_discount := (order_amount * promo.discount_value / 100);
    ELSE
        calculated_discount := promo.discount_value;
    END IF;
    
    -- Ensure discount doesn't exceed order amount
    IF calculated_discount > order_amount THEN
        calculated_discount := order_amount;
    END IF;
    
    RETURN QUERY SELECT true, calculated_discount, 'Kode promo valid';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_promo_code IS 'Validate promo code and calculate discount amount';

-- ============================================
-- SAMPLE DATA: packages
-- ============================================
INSERT INTO packages (name, category, region, price, processing_time, photographers, videographers) VALUES
('Wedding Basic', 'Photo + Video', 'bandung', 5000000, '14 hari', '1', '1'),
('Wedding Premium', 'Photo + Video', 'bandung', 10000000, '21 hari', '2', '2'),
('Prewedding Standard', 'Photo', 'bandung', 3000000, '7 hari', '1', '0'),
('Corporate Event', 'Photo + Video', 'jabodetabek', 7500000, '10 hari', '2', '1')
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE DATA: add_ons
-- ============================================
INSERT INTO add_ons (name, price, region, description) VALUES
('Extra Photographer', 1000000, NULL, 'Tambahan 1 fotografer'),
('Drone Coverage', 1500000, NULL, 'Liputan menggunakan drone'),
('Same Day Edit', 2000000, NULL, 'Video highlight di hari yang sama'),
('Album Premium 30x40', 2500000, NULL, 'Album cetak ukuran 30x40 cm')
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE DATA: promo_codes
-- ============================================
INSERT INTO promo_codes (code, discount_type, discount_value, max_usage, expiry_date) VALUES
('WELCOME2024', 'percentage', 10, 100, '2024-12-31'),
('EARLYBIRD', 'fixed', 500000, 50, '2024-11-30'),
('REFERRAL20', 'percentage', 20, NULL, NULL)
ON CONFLICT DO NOTHING;
