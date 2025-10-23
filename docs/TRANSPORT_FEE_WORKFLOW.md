# Dokumentasi Alur Kerja Fee Transport

## 📋 Ringkasan
Fee Transport adalah biaya transportasi yang dicatat sebagai bagian dari biaya operasional proyek. Sistem ini terintegrasi dengan manajemen keuangan untuk pencatatan otomatis dan pelacakan pembayaran.

---

## 🔄 Alur Kerja Fee Transport

### 1. **Input Fee Transport di Proyek**

#### Lokasi Input:
- **Halaman**: Proyek (Projects)
- **Formulir**: Tambah/Edit Proyek
- **Bagian**: Biaya Operasional

#### Cara Input:
1. Buka halaman **Proyek**
2. Klik **Tambah Proyek** atau **Edit** pada proyek yang ada
3. Scroll ke bagian **Biaya Operasional**
4. Masukkan nilai di field **Biaya Transportasi**
5. Simpan proyek

#### Field Terkait:
```typescript
transportCost: number          // Jumlah biaya transport
transportPaid: boolean         // Status pembayaran (opsional)
transportNote: string          // Catatan tambahan (opsional)
transportCardId: string        // ID kartu pembayaran (opsional)
```

---

### 2. **Pencatatan Otomatis di Keuangan**

#### Proses Otomatis:
Ketika Anda menyimpan proyek dengan `transportCost` > 0, sistem **otomatis**:

1. **Membuat Transaksi Pengeluaran**
   - Kategori: `"Transportasi"`
   - Deskripsi: `"Transportasi - [Nama Proyek]"`
   - Tipe: `Pengeluaran`
   - Method: `Sistem`
   - Terhubung ke proyek

2. **Mengurangi Saldo Kartu**
   - Menggunakan kartu pertama yang bukan cash
   - Saldo kartu berkurang sesuai `transportCost`

3. **Update Otomatis**
   - Jika nilai transport diubah → transaksi di-update
   - Jika nilai dihapus (0) → transaksi dihapus
   - Saldo kartu disesuaikan otomatis

---

### 3. **Tampilan di Halaman Klien (Client Portal)**

#### Untuk Klien Regular:
Klien dapat melihat breakdown biaya di portal mereka:

**Tab Keuangan → Detail Proyek:**
```
Paket Foto: Rp 5.000.000
Add-ons: Rp 1.000.000
Biaya Cetak: Rp 500.000
Transport: Rp 300.000        ← Fee transport ditampilkan
─────────────────────────
Total: Rp 6.800.000
```

#### Untuk Vendor:
- Vendor **tidak** melihat breakdown detail biaya operasional
- Hanya melihat total biaya proyek

---

### 4. **Tampilan di Halaman Proyek (Admin)**

#### Detail Proyek:
Saat melihat detail proyek, admin melihat:

**Biaya Operasional:**
```
Biaya Cetak: Rp 500.000
Transport: Rp 300.000
Biaya Custom: Rp 200.000
```

**Total Biaya Proyek:**
```
Paket + Add-ons: Rp 6.000.000
Biaya Operasional: Rp 1.000.000
─────────────────────────
Total: Rp 7.000.000
```

---

## 💰 Integrasi dengan Keuangan

### Kategori Transaksi
Fee transport masuk dalam kategori **"Transportasi"** yang merupakan salah satu dari:
```typescript
PRODUCTION_COST_CATEGORIES = [
  "Gaji Freelancer",
  "Transportasi",      ← Fee transport
  "Konsumsi",
  "Sewa Tempat",
  "Sewa Alat",
  "Cetak Album"
]
```

### Pelacakan di Finance
1. **Halaman Keuangan** → Tab **Transaksi**
   - Filter berdasarkan kategori "Transportasi"
   - Lihat semua biaya transport per proyek

2. **Laporan Keuangan**
   - Biaya transport termasuk dalam perhitungan:
     - Total Pengeluaran
     - Biaya Produksi
     - Profit Margin

3. **Kartu Pembayaran**
   - Setiap transport cost mengurangi saldo kartu
   - Riwayat transaksi tercatat di kartu

---

## 📊 Perhitungan Total Biaya Proyek

### Formula:
```typescript
totalCost = packagePrice 
          + addOnsTotal 
          + printingCost 
          + transportCost 
          + customCostsTotal
          - discountAmount
```

### Contoh Perhitungan:
```
Paket Wedding: Rp 5.000.000
Add-on Video: Rp 1.500.000
Biaya Cetak: Rp 800.000
Transport: Rp 400.000          ← Fee transport
Diskon (10%): -Rp 690.000
─────────────────────────
Total: Rp 7.010.000
```

---

## 🔧 Fitur Tambahan

### 1. Status Pembayaran Transport
```typescript
transportPaid: boolean
```
- Tandai apakah transport sudah dibayar
- Berguna untuk tracking pembayaran terpisah

### 2. Catatan Transport
```typescript
transportNote: string
```
- Tambahkan catatan khusus
- Contoh: "Transport ke Bandung + parkir"

### 3. Kartu Pembayaran Khusus
```typescript
transportCardId: string
```
- Tentukan kartu spesifik untuk transport
- Memisahkan dari biaya operasional lain

---

## 📝 Best Practices

### 1. **Input Transport Cost**
- ✅ Input saat membuat proyek baru
- ✅ Estimasi berdasarkan lokasi
- ✅ Update jika ada perubahan aktual
- ❌ Jangan lupa input jika ada biaya transport

### 2. **Pencatatan**
- ✅ Sistem otomatis mencatat transaksi
- ✅ Cek di halaman Keuangan untuk verifikasi
- ✅ Pastikan saldo kartu cukup
- ❌ Tidak perlu input manual di Finance

### 3. **Pelaporan ke Klien**
- ✅ Transport termasuk dalam invoice
- ✅ Transparansi biaya untuk klien regular
- ✅ Vendor hanya lihat total
- ❌ Jangan sembunyikan biaya dari klien regular

---

## 🔍 Troubleshooting

### Masalah: Transport cost tidak tercatat di Finance
**Solusi:**
1. Pastikan nilai `transportCost` > 0
2. Pastikan ada kartu pembayaran (bukan cash)
3. Cek console untuk error
4. Refresh halaman Finance

### Masalah: Saldo kartu tidak berkurang
**Solusi:**
1. Cek apakah transaksi tercatat
2. Verifikasi `transportCardId` valid
3. Pastikan tidak ada error saat save
4. Reload data dari database

### Masalah: Klien tidak melihat transport di portal
**Solusi:**
1. Pastikan klien bukan tipe "Vendor"
2. Cek tab Keuangan di portal klien
3. Verifikasi proyek sudah tersimpan
4. Refresh portal klien

---

## 📱 Akses Berdasarkan Role

### Admin/Vendor:
- ✅ Input transport cost
- ✅ Edit transport cost
- ✅ Lihat semua transaksi transport
- ✅ Export laporan transport
- ✅ Kelola kartu pembayaran

### Klien Regular:
- ✅ Lihat transport cost di invoice
- ✅ Lihat breakdown biaya
- ❌ Tidak bisa edit

### Klien Vendor:
- ✅ Lihat total biaya proyek
- ❌ Tidak lihat breakdown transport
- ❌ Tidak bisa edit

### Freelancer:
- ❌ Tidak ada akses ke transport cost
- ❌ Hanya lihat fee dan reward mereka

---

## 🗄️ Database Schema

### Tabel: `projects`
```sql
transport_cost NUMERIC DEFAULT 0
transport_paid BOOLEAN DEFAULT false
transport_note TEXT
transport_card_id TEXT
```

### Tabel: `transactions`
```sql
category TEXT                    -- "Transportasi"
project_id TEXT                  -- Link ke proyek
type TEXT                        -- "Pengeluaran"
amount NUMERIC                   -- Nilai transport
card_id TEXT                     -- Kartu pembayaran
```

---

## 📈 Laporan & Analytics

### Melihat Total Transport per Periode:
1. Buka **Keuangan** → **Transaksi**
2. Filter kategori: "Transportasi"
3. Filter tanggal sesuai periode
4. Lihat total di bawah tabel

### Export Data Transport:
1. Buka **Keuangan** → **Transaksi**
2. Filter kategori: "Transportasi"
3. Klik tombol **Export CSV**
4. Buka file untuk analisis

### Analisis Profit:
```
Revenue (Total Biaya Proyek): Rp 10.000.000
Biaya Produksi:
  - Gaji Freelancer: Rp 3.000.000
  - Transport: Rp 500.000        ← Termasuk dalam biaya
  - Cetak: Rp 1.000.000
  - Lainnya: Rp 500.000
Total Biaya: Rp 5.000.000
Profit: Rp 5.000.000 (50%)
```

---

## 🎯 Kesimpulan

### Alur Singkat:
1. **Input** transport cost di form proyek
2. **Sistem otomatis** buat transaksi pengeluaran
3. **Saldo kartu** berkurang otomatis
4. **Klien lihat** di portal (jika regular)
5. **Admin tracking** di halaman Finance

### Keuntungan Sistem:
- ✅ Otomatis terintegrasi
- ✅ Tidak perlu input ganda
- ✅ Tracking real-time
- ✅ Transparansi ke klien
- ✅ Laporan akurat

---

## 📞 Bantuan Lebih Lanjut

Jika ada pertanyaan atau masalah terkait fee transport:
1. Cek dokumentasi ini terlebih dahulu
2. Lihat contoh proyek yang sudah ada
3. Verifikasi di halaman Finance
4. Hubungi tim support jika masih ada masalah
