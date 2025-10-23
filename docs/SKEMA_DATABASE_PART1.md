# 🗄️ SKEMA DATABASE - VENA PICTURES CRM (Part 1)

**Tanggal**: 23 Oktober 2025  
**Database**: PostgreSQL (Supabase)  
**Versi**: 1.0.0

---

## 📋 DAFTAR TABEL

### **Core Tables** (11 tabel):
1. `users` - User & authentication
2. `profiles` - Company profile & settings
3. `clients` - Client data
4. `leads` - Prospek/leads
5. `projects` - Project management
6. `team_members` - Freelancer/team
7. `packages` - Service packages
8. `add_ons` - Package add-ons
9. `promo_codes` - Promo codes
10. `contracts` - Client contracts
11. `sops` - Standard Operating Procedures

### **Financial Tables** (5 tabel):
12. `cards` - Bank cards/accounts
13. `pockets` - Financial pockets
14. `transactions` - All transactions
15. `team_project_payments` - Team payment tracking
16. `team_payment_records` - Payment records
17. `reward_ledger_entries` - Reward tracking

### **Project Detail Tables** (4 tabel):
18. `project_team_assignments` - Team assignments
19. `project_revisions` - Project revisions
20. `project_sub_status_confirmations` - Client confirmations
21. `revision_submissions` - Revision submissions

### **Feedback & Gallery** (4 tabel):
22. `client_feedback` - Client testimonials
23. `freelancer_feedback` - Freelancer feedback
24. `galleries` - Gallery collections
25. `gallery_images` - Gallery images

### **Notifications** (1 tabel):
26. `notifications` - System notifications

**Total: 26 Tabel**

---

## 🔑 TABEL DETAIL

### 1. **users**
**Fungsi**: User authentication & authorization

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Hashed
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Member', 'Kasir')),
    permissions JSONB DEFAULT '[]', -- Array of ViewType
    restricted_cards JSONB DEFAULT '[]', -- Array of card IDs
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**Relasi**:
- Has one Profile
- Has many Notifications

---

### 2. **profiles**
**Fungsi**: Company profile & system settings

```sql
CREATE TABLE profiles (
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
    
    -- Categories (JSONB arrays)
    income_categories JSONB DEFAULT '[]',
    expense_categories JSONB DEFAULT '[]',
    project_types JSONB DEFAULT '[]',
    event_types JSONB DEFAULT '[]',
    asset_categories JSONB DEFAULT '[]',
    sop_categories JSONB DEFAULT '[]',
    package_categories JSONB DEFAULT '[]',
    
    -- Project status configuration
    project_status_config JSONB DEFAULT '[]',
    
    -- Settings
    notification_settings JSONB DEFAULT '{}',
    security_settings JSONB DEFAULT '{}',
    
    -- Templates
    briefing_template TEXT,
    terms_and_conditions TEXT,
    contract_template TEXT,
    package_share_template TEXT,
    booking_form_template TEXT,
    chat_templates JSONB DEFAULT '[]',
    
    -- Branding
    logo_base64 TEXT,
    brand_color VARCHAR(7) DEFAULT '#3b82f6',
    
    -- Public page config
    public_page_config JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profiles_admin_user ON profiles(admin_user_id);
```

**JSONB Structures**:
```typescript
// project_status_config
[{
  id: string,
  name: string,
  color: string,
  defaultProgress: number,
  subStatuses: [{name: string, note: string}],
  note: string
}]

// notification_settings
{
  newProject: boolean,
  paymentConfirmation: boolean,
  deadlineReminder: boolean
}

// security_settings
{
  twoFactorEnabled: boolean
}

// public_page_config
{
  template: 'classic' | 'modern' | 'gallery',
  title: string,
  introduction: string,
  galleryImages: string[]
}

// chat_templates
[{
  id: string,
  title: string,
  template: string
}]
```

---

### 3. **clients**
**Fungsi**: Client/customer data

```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50),
    instagram VARCHAR(255),
    since DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Prospek', 'Aktif', 'Tidak Aktif', 'Hilang')),
    client_type VARCHAR(50) NOT NULL CHECK (client_type IN ('Langsung', 'Vendor')),
    last_contact DATE NOT NULL DEFAULT CURRENT_DATE,
    portal_access_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_type ON clients(client_type);
CREATE INDEX idx_clients_portal_access ON clients(portal_access_id);
CREATE INDEX idx_clients_email ON clients(email);
```

**Relasi**:
- Has many Projects
- Has many Contracts
- Has many Transactions (via Projects)

---

### 4. **leads**
**Fungsi**: Prospek/potential clients

```sql
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_channel VARCHAR(100) NOT NULL CHECK (contact_channel IN (
        'WhatsApp', 'Instagram', 'Website', 'Telepon', 'Referensi', 'Form Saran', 'Lainnya'
    )),
    location VARCHAR(255),
    status VARCHAR(100) NOT NULL CHECK (status IN (
        'Sedang Diskusi', 'Menunggu Follow Up', 'Dikonversi', 'Ditolak'
    )),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    whatsapp VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_date ON leads(date);
CREATE INDEX idx_leads_channel ON leads(contact_channel);
```

**Relasi**:
- Can be converted to Client

---

