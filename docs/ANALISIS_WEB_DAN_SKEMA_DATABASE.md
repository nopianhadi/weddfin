# 📊 ANALISIS WEB & SKEMA DATABASE - VENA PICTURES CRM

**Tanggal**: 23 Oktober 2025  
**Versi**: 1.0.0  
**Status**: Analisis Lengkap

---

## 🎯 RINGKASAN EKSEKUTIF

**Vena Pictures CRM** adalah aplikasi manajemen bisnis lengkap untuk studio fotografi/videografi yang mengelola:
- Prospek & Booking klien
- Proyek & tim freelancer
- Keuangan & pembayaran
- Kontrak & dokumen
- Portal klien & freelancer
- Galeri & konten

---

## 📱 ANALISIS HALAMAN & FITUR

### 🏠 **HALAMAN PUBLIK** (Tanpa Login)

#### 1. **Homepage** (`/#/home`)
**Fungsi**: Landing page untuk calon klien
**Fitur**:
- Tampilan profil perusahaan
- Galeri portofolio
- Informasi kontak
- Link ke form booking
- Template: Classic/Modern/Gallery

**Alur**:
```
Pengunjung → Homepage → Lihat Portofolio → Form Booking/Lead
```

#### 2. **Public Booking Form** (`/#/booking-form`)
**Fungsi**: Form booking online untuk calon klien
**Fitur**:
- Pilih paket & add-ons
- Input data klien
- Upload bukti DP
- Kode promo
- Konfirmasi otomatis via WhatsApp

**Alur**:
```
Calon Klien → Isi Form → Pilih Paket → Bayar DP → Submit → 
Admin Notifikasi → Konfirmasi Booking
```

#### 3. **Public Lead Form** (`/#/lead-form`)
**Fungsi**: Form inquiry untuk prospek
**Fitur**:
- Data kontak
- Jenis acara
- Budget estimasi
- Channel kontak (WA/IG/Phone)

**Alur**:
```
Prospek → Isi Form → Submit → Admin Notifikasi → Follow Up
```

#### 4. **Public Gallery** (`/#/gallery/:id`)
**Fungsi**: Galeri hasil proyek untuk klien
**Fitur**:
- View foto/video hasil
- Download file
- Share link
- Feedback form

**Alur**:
```
Klien → Akses Link → Lihat Galeri → Download → Beri Feedback
```

#### 5. **Public Packages** (`/#/packages`)
**Fungsi**: Katalog paket layanan
**Fitur**:
- List semua paket
- Detail paket (harga, isi, durasi)
- Filter by region
- CTA booking

**Alur**:
```
Pengunjung → Browse Paket → Lihat Detail → Booking
```

---

### 🔐 **HALAMAN ADMIN** (Perlu Login)

#### 6. **Login** (`/#/login`)
**Fungsi**: Autentikasi admin/staff
**Fitur**:
- Email & password
- Supabase Auth
- Role-based access (Admin/Member/Kasir)

**Alur**:
```
User → Input Credentials → Supabase Auth → Dashboard
```

#### 7. **Dashboard** (`/#/dashboard`)
**Fungsi**: Overview bisnis & statistik
**Fitur**:
- Total saldo (semua kartu)
- Proyek aktif
- Klien aktif
- Total freelancer
- Grafik pemasukan (bulanan/tahunan)
- Transaksi terbaru
- Kalender mendatang
- Status proyek
- Ringkasan prospek
- Kepuasan klien
- Quick links

**Alur**:
```
Admin Login → Dashboard → Lihat Statistik → Akses Quick Links
```

**Data yang Ditampilkan**:
- Saldo: Sum dari semua Card.balance
- Proyek Aktif: Count Project where status != 'Selesai' && != 'Dibatalkan'
- Klien Aktif: Count Client where status = 'Aktif'
- Grafik: Sum Transaction.amount where type = 'Pemasukan' group by month/year

#### 8. **Prospek (Leads)** (`/#/leads`)
**Fungsi**: Manajemen prospek/calon klien
**Fitur**:
- List semua leads
- Filter by status (Diskusi/Follow Up/Converted/Rejected)
- Add/Edit/Delete lead
- Konversi ke klien
- WhatsApp integration
- Lead analytics

**Alur**:
```
Admin → Lihat Leads → Follow Up → Konversi ke Klien → 
Buat Proyek Pertama
```

**Pengelolaan**:
- **Baru**: Lead masuk dari form/manual input
- **Follow Up**: Admin hubungi via WA/IG
- **Converted**: Jadi klien, buat project
- **Rejected**: Tidak jadi, arsip

#### 9. **Booking** (`/#/booking`)
**Fungsi**: Konfirmasi booking baru
**Fitur**:
- List booking baru (status: Baru)
- Lihat bukti DP
- Konfirmasi/Tolak booking
- Filter by tanggal
- Grafik booking
- Distribusi paket

**Alur**:
```
Booking Masuk → Admin Review → Cek Bukti DP → 
Konfirmasi → Jadi Project Aktif
```

**Pengelolaan**:
- **Baru**: Booking dari form publik
- **Terkonfirmasi**: Admin approve, jadi project
- **Ditolak**: Admin reject dengan alasan

#### 10. **Manajemen Klien** (`/#/clients`)
**Fungsi**: Database klien & proyek mereka
**Fitur**:
- List semua klien
- Filter by status/type
- Add/Edit/Delete klien
- View detail klien:
  - Info kontak
  - Semua proyek
  - Riwayat transaksi
  - Kontrak
- Record pembayaran
- Share portal link
- Kirim tagihan via WA
- Export CSV

**Alur**:
```
Admin → Lihat Klien → Detail Klien → Lihat Proyek → 
Record Pembayaran → Kirim Invoice
```

**Pengelolaan**:
- **Prospek**: Dari leads, belum ada project
- **Aktif**: Punya project aktif
- **Tidak Aktif**: Project selesai, tidak ada project baru
- **Hilang**: Tidak ada kabar

**Tipe Klien**:
- **Langsung**: Klien direct
- **Vendor**: Dari vendor/partner

#### 11. **Proyek** (`/#/projects`)
**Fungsi**: Manajemen proyek & workflow
**Fitur**:
- List semua proyek
- Filter by status/type/klien
- View mode: Grid/List/Kanban
- Add/Edit/Delete project
- Detail proyek:
  - Info dasar (nama, tanggal, lokasi)
  - Status & sub-status
  - Progress tracker
  - Tim assignment
  - Biaya operasional:
    - Cetak (album, foto, flashdisk)
    - Transport (detail per item)
    - Custom costs
  - Revisi
  - Link file (brief, klien, final)
  - Konfirmasi klien
- Batch payment tim
- Quick status change
- Invoice & receipt

**Alur**:
```
Buat Project → Assign Tim → Set Status → Update Progress → 
Konfirmasi Klien → Selesai → Invoice
```

**Status Workflow**:
1. **Dikonfirmasi**: Project baru approved
2. **Persiapan**: Briefing, planning
3. **Editing**: Proses editing
4. **Revisi**: Ada revisi dari klien
5. **Cetak**: Proses cetak output fisik
6. **Dikirim**: Pengiriman ke klien
7. **Selesai**: Project complete
8. **Dibatalkan**: Project cancelled

**Sub-Status** (per status):
- Editing: Seleksi Foto, Color Grading, Export
- Cetak: Desain Album, Cetak Album, QC
- Dikirim: Packing, Kirim, Diterima

**Pengelolaan Biaya**:
- **Cetak**: Track per item (album, foto, flashdisk)
- **Transport**: Detail per item dengan status paid/unpaid
- **Custom**: Biaya tambahan lainnya

#### 12. **Freelancer/Tim** (`/#/team`)
**Fungsi**: Manajemen tim freelancer
**Fitur**:
- List semua freelancer
- Filter by role
- Add/Edit/Delete freelancer
- Detail freelancer:
  - Info kontak
  - Standard fee
  - Rating & performance notes
  - Proyek yang dikerjakan
  - Pembayaran (paid/unpaid)
  - Reward balance
- Batch payment
- Payment records
- Reward ledger
- Share portal link

**Alur**:
```
Add Freelancer → Assign ke Project → Track Fee → 
Batch Payment → Record Payment → Update Reward
```

**Pengelolaan Pembayaran**:
- **Fee**: Per project, bisa custom
- **Reward**: Bonus tambahan
- **Batch Payment**: Bayar multiple projects sekaligus
- **Payment Record**: Bukti pembayaran dengan signature

#### 13. **Keuangan** (`/#/finance`)
**Fungsi**: Manajemen keuangan lengkap
**Fitur**:
- **Kartu/Rekening**:
  - List semua kartu (Debit/Kredit/Tunai)
  - Add/Edit/Delete kartu
  - Track balance per kartu
  - Color coding
- **Kantong Keuangan**:
  - Nabung & Bayar
  - Terkunci (locked savings)
  - Bersama (shared)
  - Anggaran Pengeluaran
  - Tabungan Hadiah Freelancer
- **Transaksi**:
  - List semua transaksi
  - Filter by type/category/date
  - Add income/expense
  - Link to project/card/pocket
- **Cashflow Chart**:
  - Interactive chart
  - Income vs Expense
  - Monthly/Yearly view
- **Reports**:
  - Balance summary
  - Income/Expense breakdown
  - Profit analysis

**Alur**:
```
Setup Kartu → Buat Kantong → Record Transaksi → 
Monitor Cashflow → Generate Report
```

**Pengelolaan Kantong**:
- **Nabung & Bayar**: Untuk saving & payment
- **Terkunci**: Locked until date
- **Bersama**: Shared dengan tim
- **Anggaran**: Budget tracking
- **Reward Pool**: Untuk bonus freelancer

#### 14. **Kalender** (`/#/calendar`)
**Fungsi**: View kalender proyek
**Fitur**:
- Calendar view (month/week/day)
- List proyek by tanggal
- Filter by status
- Quick view project detail
- Deadline tracking

**Alur**:
```
Admin → Lihat Kalender → Cek Jadwal → Manage Deadline
```

#### 15. **Laporan Klien** (`/#/client-reports`)
**Fungsi**: Analytics & KPI klien
**Fitur**:
- Client satisfaction metrics
- Feedback analysis
- Repeat client rate
- Revenue per client
- Client lifetime value

**Alur**:
```
Admin → View Reports → Analyze Metrics → Action Plan
```

#### 16. **Input Package** (`/#/packages`)
**Fungsi**: Manajemen paket layanan
**Fitur**:
- List semua paket
- Add/Edit/Delete paket
- Set harga & isi paket:
  - Digital items
  - Physical items
  - Duration options
  - Processing time
- Upload cover image
- Region scoping
- Default costs (cetak, transport)

**Alur**:
```
Admin → Buat Paket → Set Harga → Define Items → 
Set Region → Publish
```

#### 17. **Kode Promo** (`/#/promo-codes`)
**Fungsi**: Manajemen promo code
**Fitur**:
- List semua promo
- Add/Edit/Delete promo
- Set discount (percentage/fixed)
- Usage limit
- Expiry date
- Track usage

**Alur**:
```
Admin → Buat Promo → Set Discount → Set Limit → 
Track Usage
```

#### 18. **Kontrak Kerja** (`/#/contracts`)
**Fungsi**: Manajemen kontrak klien
**Fitur**:
- List semua kontrak
- Generate kontrak from template
- E-signature (vendor & client)
- View/Print kontrak
- Link to project

**Alur**:
```
Project Approved → Generate Kontrak → Client Sign → 
Vendor Sign → Archive
```

#### 19. **SOP** (`/#/sop`)
**Fungsi**: Standard Operating Procedures
**Fitur**:
- List SOP by category
- Add/Edit/Delete SOP
- Markdown support
- Search SOP
- Share to team

**Alur**:
```
Admin → Create SOP → Categorize → Share to Team
```

#### 20. **Galeri Upload** (`/#/gallery`)
**Fungsi**: Upload & manage galeri
**Fitur**:
- Create gallery
- Upload images
- Set public/private
- Generate public link
- Custom booking link

**Alur**:
```
Admin → Create Gallery → Upload Images → Set Public → 
Share Link to Client
```

#### 21. **Pengaturan** (`/#/settings`)
**Fungsi**: Konfigurasi sistem
**Fitur**:
- **Profile**:
  - Company info
  - Contact details
  - Bank account
  - Logo upload
- **Categories**:
  - Income/Expense categories
  - Project types
  - Event types
  - Asset categories
- **Status Config**:
  - Custom project status
  - Sub-status per status
  - Color coding
- **Templates**:
  - Briefing template
  - Contract template
  - Terms & conditions
  - Chat templates
- **Public Page**:
  - Template selection
  - Homepage content
  - Gallery images
- **Notifications**:
  - Email notifications
  - WhatsApp integration
- **Security**:
  - 2FA settings
  - User management
  - Permissions

**Alur**:
```
Admin → Settings → Configure → Save → Apply
```

---

### 🌐 **PORTAL KLIEN** (`/#/portal/:accessId`)

**Fungsi**: Portal self-service untuk klien
**Akses**: Via unique access ID (no login required)

#### Fitur:
1. **Beranda**:
   - Proyek mendatang
   - Ringkasan keuangan
   - Progress proyek aktif
   - Paket & add-on yang diambil

2. **Proyek Saya**:
   - List semua proyek
   - Detail proyek
   - Progress tracker
   - Konfirmasi sub-status
   - Submit revisi
   - Link file hasil

3. **Galeri & File**:
   - View hasil proyek
   - Download file
   - Preview media

4. **Keuangan**:
   - Invoice
   - Riwayat pembayaran
   - Sisa tagihan
   - Upload bukti bayar

5. **Kontrak**:
   - View kontrak
   - E-signature
   - Download PDF

6. **Testimoni**:
   - Submit feedback
   - Rating (1-5 stars)
   - Satisfaction level

**Alur**:
```
Klien → Akses Portal → Lihat Progress → Download File → 
Bayar Invoice → Submit Feedback
```

---

### 👷 **PORTAL FREELANCER** (`/#/freelancer/:accessId`)

**Fungsi**: Portal untuk tim freelancer
**Akses**: Via unique access ID (no login required)

#### Fitur:
1. **Dashboard**:
   - Proyek aktif
   - Fee & reward balance
   - Payment history

2. **Proyek Saya**:
   - List assigned projects
   - Detail proyek
   - Briefing & files
   - Submit hasil

3. **Revisi**:
   - List revisi pending
   - Detail revisi
   - Upload hasil revisi
   - Mark as completed

4. **Pembayaran**:
   - Fee per project
   - Reward ledger
   - Payment records
   - Total earnings

5. **SOP**:
   - View SOP
   - Guidelines
   - Best practices

6. **Feedback**:
   - Submit feedback
   - Performance notes

**Alur**:
```
Freelancer → Akses Portal → Lihat Project → Download Brief → 
Upload Hasil → Track Payment
```

---

## 🔄 ALUR BISNIS LENGKAP

### 1. **Lead to Client Flow**
```
Prospek Masuk (Form/Manual) → 
Admin Follow Up (WA/IG) → 
Diskusi & Nego → 
Konversi ke Klien → 
Buat Project Pertama
```

### 2. **Booking Flow**
```
Klien Isi Form Booking → 
Pilih Paket & Add-ons → 
Bayar DP → Upload Bukti → 
Admin Review → 
Konfirmasi Booking → 
Jadi Project Aktif
```

### 3. **Project Workflow**
```
Project Created → 
Assign Tim → 
Briefing → 
Shooting/Recording → 
Editing → 
Revisi (if needed) → 
Cetak (if needed) → 
QC → 
Kirim ke Klien → 
Konfirmasi Klien → 
Selesai
```

### 4. **Payment Flow**
```
Project Created → 
DP Paid → 
Progress Payment (optional) → 
Final Payment → 
Invoice Generated → 
Payment Recorded → 
Update Card Balance
```

### 5. **Freelancer Payment Flow**
```
Project Assigned → 
Freelancer Complete → 
Admin Review → 
Batch Payment → 
Generate Payment Record → 
Freelancer Sign → 
Update Reward Balance
```

### 6. **Client Portal Flow**
```
Project Created → 
Generate Portal Link → 
Share to Client → 
Client Access Portal → 
View Progress → 
Confirm Sub-status → 
Download Files → 
Submit Feedback
```

---

## 📊 PENGELOLAAN DATA

### **Clients**
- **Create**: Manual input atau konversi dari Lead
- **Update**: Edit info kontak, status
- **Delete**: Soft delete (archive)
- **Relations**: Has many Projects, Contracts, Transactions

### **Projects**
- **Create**: From Booking atau manual
- **Update**: Status, progress, team, costs
- **Delete**: Soft delete (archive)
- **Relations**: 
  - Belongs to Client
  - Has many Transactions
  - Has many Team Assignments
  - Has many Revisions
  - Has one Contract

### **Transactions**
- **Create**: Manual input atau auto from payment
- **Update**: Edit amount, category
- **Delete**: Soft delete (archive)
- **Relations**: 
  - Belongs to Project (optional)
  - Belongs to Card
  - Belongs to Pocket (optional)

### **Team Members**
- **Create**: Manual input
- **Update**: Edit info, fee, rating
- **Delete**: Soft delete (archive)
- **Relations**: 
  - Has many Project Assignments
  - Has many Payment Records
  - Has many Reward Ledger Entries

### **Packages**
- **Create**: Manual input
- **Update**: Edit price, items, region
- **Delete**: Soft delete (archive)
- **Relations**: Has many Projects

### **Cards**
- **Create**: Manual input
- **Update**: Balance (auto from transactions)
- **Delete**: Soft delete (archive)
- **Relations**: Has many Transactions

### **Pockets**
- **Create**: Manual input
- **Update**: Amount (auto from transactions)
- **Delete**: Soft delete (archive)
- **Relations**: 
  - Has many Transactions
  - Belongs to Card (optional)

---

## 🎯 FITUR UNGGULAN

### 1. **Offline-First**
- IndexedDB storage
- Sync manager
- Conflict resolution
- Auto-sync when online

### 2. **Real-time Updates**
- Supabase Realtime
- Live notifications
- Auto-refresh data

### 3. **Mobile-Optimized**
- Responsive design
- Touch-friendly UI
- Bottom navigation
- Pull-to-refresh

### 4. **WhatsApp Integration**
- Send invoice
- Send reminder
- Share portal link
- Template messages

### 5. **E-Signature**
- Contract signing
- Payment records
- Digital signature pad

### 6. **AI Insights**
- Finance insights
- Lead insights
- Project recommendations

### 7. **Multi-User**
- Role-based access
- Admin/Member/Kasir
- Permission management

### 8. **Export & Print**
- CSV export
- PDF generation
- Print invoices
- Print contracts

---

## 📈 METRICS & ANALYTICS

### **Dashboard Metrics**:
- Total Balance
- Active Projects
- Active Clients
- Total Freelancers
- Monthly Income
- Monthly Expense
- Profit Margin
- Conversion Rate

### **Client Metrics**:
- Client Lifetime Value
- Repeat Client Rate
- Average Project Value
- Client Satisfaction Score

### **Project Metrics**:
- On-time Delivery Rate
- Average Project Duration
- Revenue per Project
- Profit per Project

### **Freelancer Metrics**:
- Average Fee per Project
- Total Earnings
- Performance Rating
- Project Completion Rate

---

Lanjut ke bagian 2: Skema Database...
