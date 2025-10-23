# 🗄️ VENA PICTURES CRM - DATABASE SCHEMA

**Database**: PostgreSQL (Supabase)  
**Total Tables**: 26  
**Created**: 2025-10-23  
**Version**: 1.0.0

---

## 📋 QUICK START

### Option 1: Run Master Setup (Recommended)
```bash
psql -U your_user -d your_database -f 00_master_setup.sql
```

### Option 2: Run Individual Files
```bash
psql -U your_user -d your_database -f 01_create_extensions.sql
psql -U your_user -d your_database -f 02_create_users_table.sql
psql -U your_user -d your_database -f 03_create_profiles_table.sql
# ... and so on
```

### Option 3: Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste each file content
3. Run in sequence (01 → 09)

---

## 📊 DATABASE STRUCTURE

### **Core Tables** (11 tables)
1. `users` - User authentication & authorization
2. `profiles` - Company profile & settings
3. `clients` - Client database
4. `leads` - Prospek/potential clients
5. `projects` - Main project management
6. `team_members` - Freelancer/team data
7. `packages` - Service packages
8. `add_ons` - Package add-ons
9. `promo_codes` - Promotional codes
10. `contracts` - Client contracts
11. `sops` - Standard Operating Procedures

### **Financial Tables** (5 tables)
12. `cards` - Bank cards/accounts
13. `pockets` - Financial pockets
14. `transactions` - All transactions
15. `team_project_payments` - Team payment tracking
16. `team_payment_records` - Payment records
17. `reward_ledger_entries` - Reward tracking

### **Project Detail Tables** (4 tables)
18. `project_team_assignments` - Team assignments
19. `project_revisions` - Project revisions
20. `project_sub_status_confirmations` - Client confirmations
21. `revision_submissions` - Revision submissions

### **Feedback & Gallery** (4 tables)
22. `client_feedback` - Client testimonials
23. `freelancer_feedback` - Freelancer feedback
24. `galleries` - Gallery collections
25. `gallery_images` - Gallery images

### **Notifications** (1 table)
26. `notifications` - System notifications

---

## 🔑 KEY FEATURES

### **1. UUID Primary Keys**
All tables use UUID for primary keys for better security and scalability.

### **2. Timestamps**
All tables have `created_at` and `updated_at` with auto-update triggers.

### **3. JSONB Columns**
Flexible data storage for:
- Project status configuration
- Team assignments
- Add-ons and costs
- Chat history
- Performance notes

### **4. Full Text Search**
GIN indexes on text columns for fast search:
- Client names
- Project names
- SOP content

### **5. Automatic Triggers**
- Auto-update `updated_at` on all tables
- Auto-update card balance on transactions
- Auto-update payment status on projects
- Auto-update reward balance on ledger entries

### **6. Views**
- `projects_with_balance` - Projects with outstanding balance
- `active_projects` - Active projects
- `unpaid_team_payments` - Unpaid team payments
- `financial_summary` - Overall financial summary

### **7. Helper Functions**
- `verify_user_password()` - User authentication
- `convert_lead_to_client()` - Lead conversion
- `validate_promo_code()` - Promo code validation
- `calculate_project_total_cost()` - Cost calculation

---

## 🔐 SAMPLE DATA

Each SQL file includes sample data for testing:

### Users
- **Admin**: admin@venapictures.com / admin123
- **Member**: member@venapictures.com / member123
- **Kasir**: kasir@venapictures.com / kasir123

### Clients
- John & Jane Doe
- PT. Example Corp
- Ahmad & Siti

### Packages
- Wedding Basic (Rp 5,000,000)
- Wedding Premium (Rp 10,000,000)
- Prewedding Standard (Rp 3,000,000)

### Team Members
- Andi Photographer
- Budi Videographer
- Citra Editor

---

## 📐 ENTITY RELATIONSHIPS

### **Core Relationships**
```
users (1) ──→ (1) profiles
clients (1) ──→ (N) projects
clients (1) ──→ (N) contracts
projects (1) ──→ (N) transactions
projects (1) ──→ (N) team_project_payments
projects (1) ──→ (N) project_revisions
packages (1) ──→ (N) projects
```

### **Financial Relationships**
```
cards (1) ──→ (N) transactions
cards (1) ──→ (N) pockets
pockets (1) ──→ (N) transactions
team_members (1) ──→ (N) reward_ledger_entries
team_members (1) ──→ (N) team_payment_records
```

### **Project Relationships**
```
projects (1) ──→ (N) project_team_assignments
projects (1) ──→ (N) project_revisions
projects (1) ──→ (N) project_sub_status_confirmations
projects (1) ──→ (N) revision_submissions
```

---

## 🔍 COMMON QUERIES

### Get all active projects with client info
```sql
SELECT 
    p.*,
    c.name AS client_name,
    c.email,
    c.phone
FROM projects p
JOIN clients c ON p.client_id = c.id
WHERE p.status NOT IN ('Selesai', 'Dibatalkan')
ORDER BY p.date ASC;
```

### Get unpaid invoices
```sql
SELECT 
    p.project_name,
    c.name AS client_name,
    p.total_cost,
    p.amount_paid,
    (p.total_cost - p.amount_paid) AS remaining
FROM projects p
JOIN clients c ON p.client_id = c.id
WHERE p.amount_paid < p.total_cost
ORDER BY p.date DESC;
```

### Get team member earnings
```sql
SELECT 
    tm.name,
    COUNT(tp.id) AS total_projects,
    SUM(tp.fee) AS total_fees,
    SUM(tp.reward) AS total_rewards,
    tm.reward_balance
FROM team_members tm
LEFT JOIN team_project_payments tp ON tm.id = tp.team_member_id
GROUP BY tm.id, tm.name, tm.reward_balance
ORDER BY total_fees DESC;
```

### Monthly income report
```sql
SELECT 
    DATE_TRUNC('month', date) AS month,
    SUM(CASE WHEN type = 'Pemasukan' THEN amount ELSE 0 END) AS income,
    SUM(CASE WHEN type = 'Pengeluaran' THEN amount ELSE 0 END) AS expense,
    SUM(CASE WHEN type = 'Pemasukan' THEN amount ELSE -amount END) AS profit
FROM transactions
WHERE date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', date)
ORDER BY month DESC;
```

---

## 🛡️ SECURITY CONSIDERATIONS

### **1. Row Level Security (RLS)**
Enable RLS on all tables in Supabase:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ... for all tables
```

### **2. Password Hashing**
Passwords are hashed using bcrypt via `pgcrypto` extension.

### **3. Access Control**
- Admin: Full access
- Member: Limited by permissions array
- Kasir: Finance-only access

### **4. Portal Access**
- Clients: Via `portal_access_id` (no login)
- Freelancers: Via `portal_access_id` (no login)

---

## 🔧 MAINTENANCE

### **Backup Database**
```bash
pg_dump -U your_user -d your_database > backup.sql
```

### **Restore Database**
```bash
psql -U your_user -d your_database < backup.sql
```

### **Vacuum & Analyze**
```sql
VACUUM ANALYZE;
```

### **Reindex**
```sql
REINDEX DATABASE your_database;
```

---

## 📈 PERFORMANCE TIPS

1. **Use Indexes**: All foreign keys and frequently queried columns are indexed
2. **Use Views**: Pre-defined views for common queries
3. **Use JSONB**: Flexible but indexed for fast queries
4. **Use Triggers**: Automatic updates reduce application logic
5. **Use Partitioning**: For large tables (transactions, notifications)

---

## 🐛 TROUBLESHOOTING

### **Error: Extension not found**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### **Error: Permission denied**
Grant necessary permissions:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### **Error: Trigger not firing**
Check trigger status:
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%updated_at%';
```

---

## 📞 SUPPORT

For issues or questions:
1. Check this README
2. Review SQL comments in each file
3. Check Supabase documentation
4. Contact development team

---

**Built with ❤️ for Vena Pictures**  
**Database Version**: 1.0.0  
**Last Updated**: 2025-10-23
