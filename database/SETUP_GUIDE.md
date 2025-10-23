# 🚀 DATABASE SETUP GUIDE

## Vena Pictures CRM - PostgreSQL Database

---

## 📋 QUICK START

### Option 1: Run All at Once (Recommended)
```sql
-- In Supabase SQL Editor or psql, run in this order:
\i database/10_run_all_setup.sql
\i database/11_financial_team_tables.sql
\i database/12_other_tables.sql
```

### Option 2: Copy-Paste in Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy content from `10_run_all_setup.sql` → Run
3. Copy content from `11_financial_team_tables.sql` → Run
4. Copy content from `12_other_tables.sql` → Run

### Option 3: Use psql Command Line
```bash
psql -U your_user -d your_database -f database/10_run_all_setup.sql
psql -U your_user -d your_database -f database/11_financial_team_tables.sql
psql -U your_user -d your_database -f database/12_other_tables.sql
```

---

## 📁 FILE STRUCTURE

### **New Simplified Files** (Use These!)
- `10_run_all_setup.sql` - Core tables (users, clients, projects, packages)
- `11_financial_team_tables.sql` - Financial & team tables
- `12_other_tables.sql` - Contracts, SOPs, feedback, gallery, notifications

### **Old Files** (For Reference Only)
- `01_create_extensions.sql` through `09_create_other_tables.sql`
- These are kept for documentation but not needed for setup

---

## ✅ VERIFICATION

After running all scripts, verify tables were created:

```sql
-- Check all tables
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Expected output: 26 tables
-- add_ons
-- cards
-- client_feedback
-- clients
-- contracts
-- freelancer_feedback
-- galleries
-- gallery_images
-- leads
-- notifications
-- packages
-- pockets
-- profiles
-- project_revisions
-- project_sub_status_confirmations
-- project_team_assignments
-- projects
-- promo_codes
-- revision_submissions
-- reward_ledger_entries
-- sops
-- team_members
-- team_payment_records
-- team_project_payments
-- transactions
-- users
```

---

## 🔐 DEFAULT CREDENTIALS

After setup, you can create admin user:

```sql
-- Create admin user (password will be hashed)
INSERT INTO users (email, password, full_name, role) 
VALUES (
    'admin@venapictures.com',
    crypt('admin123', gen_salt('bf')),
    'Admin Vena Pictures',
    'Admin'
);
```

**Login Credentials:**
- Email: `admin@venapictures.com`
- Password: `admin123`

⚠️ **IMPORTANT**: Change this password after first login!

---

## 📊 SAMPLE DATA

The scripts include sample data for:
- ✅ 3 Cards (BCA, Mandiri, Cash)
- ✅ 3 Team Members (Photographer, Videographer, Editor)
- ✅ 2 SOPs (Shooting, Editing procedures)

To add more sample data:

```sql
-- Sample Clients
INSERT INTO clients (name, email, phone, status, client_type) VALUES
('John & Jane Doe', 'john@email.com', '081234567890', 'Aktif', 'Langsung'),
('Ahmad & Siti', 'ahmad@email.com', '081234567891', 'Prospek', 'Langsung');

-- Sample Packages
INSERT INTO packages (name, category, price, processing_time) VALUES
('Wedding Basic', 'Photo + Video', 5000000, '14 hari'),
('Prewedding Standard', 'Photo', 3000000, '7 hari');

-- Sample Promo Codes
INSERT INTO promo_codes (code, discount_type, discount_value, is_active) VALUES
('WELCOME2024', 'percentage', 10, true),
('EARLYBIRD', 'fixed', 500000, true);
```

---

## 🔧 TROUBLESHOOTING

### Error: "extension does not exist"
```sql
-- Run this first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### Error: "permission denied"
```sql
-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### Error: "relation already exists"
This is normal if you're re-running scripts. The `IF NOT EXISTS` clause prevents errors.

### Check for errors
```sql
-- View recent errors
SELECT * FROM pg_stat_activity WHERE state = 'idle in transaction (aborted)';
```

---

## 🗑️ RESET DATABASE (CAUTION!)

If you need to start fresh:

```sql
-- ⚠️ WARNING: This will delete ALL data!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then run setup scripts again
```

---

## 📈 PERFORMANCE OPTIMIZATION

After setup, run these for better performance:

```sql
-- Analyze tables for query optimization
ANALYZE;

-- Vacuum to reclaim storage
VACUUM;

-- Update statistics
VACUUM ANALYZE;
```

---

## 🔒 SECURITY SETUP

### 1. Enable Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables
```

### 2. Create RLS Policies

```sql
-- Example: Users can only see their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Example: Admins can see all data
CREATE POLICY "Admins can view all" ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'Admin'
        )
    );
```

### 3. Configure Supabase Auth

In Supabase Dashboard:
1. Go to Authentication → Settings
2. Enable Email provider
3. Configure email templates
4. Set up password requirements

---

## 📞 SUPPORT

### Common Issues:

**Q: Tables not showing in Supabase Dashboard?**
A: Refresh the page or check the SQL Editor for errors.

**Q: Can't insert data?**
A: Check RLS policies and user permissions.

**Q: Slow queries?**
A: Run `ANALYZE` and check indexes are created.

**Q: Foreign key errors?**
A: Ensure parent records exist before inserting child records.

---

## 📚 NEXT STEPS

After database setup:

1. ✅ Configure Supabase Auth
2. ✅ Set up Row Level Security policies
3. ✅ Configure Realtime subscriptions
4. ✅ Test application connection
5. ✅ Import production data (if migrating)
6. ✅ Set up automated backups
7. ✅ Configure monitoring and alerts

---

## 🎉 SUCCESS!

If you see this message after running all scripts:

```
============================================
ALL TABLES CREATED SUCCESSFULLY!
Total Tables: 26
============================================
```

Your database is ready! 🚀

---

**Created**: 2025-10-23  
**Database**: PostgreSQL (Supabase)  
**Version**: 1.0.0  
**Total Tables**: 26

**Built with ❤️ for Vena Pictures**
