# Pengelolaan Biaya Transport: Klien vs Aktual

## 📋 Situasi Saat Ini

Ketika klien melakukan booking dan memasukkan biaya transport (misalnya Rp 500.000), biaya ini:

1. **Masuk ke Total Biaya Proyek** - Ditambahkan ke total tagihan klien
2. **Tercatat di Invoice** - Muncul sebagai line item di invoice klien
3. **Masuk sebagai Pendapatan** - Ketika klien bayar DP/Pelunasan, termasuk biaya transport

## ❓ Pertanyaan Pengguna

> "Jika klien membayar Rp 500.000 untuk transport, tapi tim hanya menggunakan Rp 300.000, bagaimana pengelolaannya?"

## 🎯 Solusi yang Sudah Ada

### Sistem Saat Ini Sudah Mendukung Skenario Ini!

Berikut cara kerjanya:

### 1. **Biaya Transport dari Klien** (`transportCost`)
- Ini adalah **PENDAPATAN** dari klien
- Masuk ke total tagihan: `totalCost` project
- Ketika klien bayar, uang masuk ke kartu/rekening Anda
- **Lokasi**: Field `project.transportCost`

### 2. **Biaya Transport Aktual** (`transportDetails`)
- Ini adalah **PENGELUARAN** operasional tim
- Dicatat per item dengan detail (Tol, Parkir, Bensin, dll)
- Dibayar dari kartu atau kantong (pocket)
- **Lokasi**: Field `project.transportDetails[]`

### 3. **Selisih = Keuntungan/Kerugian**
```
Pendapatan Transport (dari klien): Rp 500.000
Pengeluaran Transport (aktual):     Rp 300.000
─────────────────────────────────────────────
Keuntungan Bersih:                  Rp 200.000
```

## 📊 Contoh Kasus Lengkap

### Skenario: Wedding Project

#### A. Saat Booking (Input Klien)
```
Paket Wedding:           Rp 10.000.000
Add-on Drone:            Rp  1.500.000
Biaya Transport:         Rp    500.000  ← Dari klien
─────────────────────────────────────────
Total Tagihan:           Rp 12.000.000
```

#### B. Saat Eksekusi (Pengeluaran Tim)
```
Transport Details:
- Tol PP:                Rp    100.000
- Bensin:                Rp    150.000
- Parkir:                Rp     50.000
─────────────────────────────────────────
Total Pengeluaran:       Rp    300.000
```

#### C. Hasil Akhir
```
Pendapatan dari Klien:   Rp 12.000.000
  - Paket & Add-on:      Rp 11.500.000
  - Transport:           Rp    500.000

Pengeluaran Operasional:
  - Fee Tim:             Rp  5.000.000
  - Cetak Album:         Rp  1.000.000
  - Transport Aktual:    Rp    300.000  ← Lebih kecil!
  - Lain-lain:           Rp    200.000
─────────────────────────────────────────
Total Pengeluaran:       Rp  6.500.000

LABA BERSIH:             Rp  5.500.000
```

**Keuntungan dari Transport**: Rp 200.000 (sudah termasuk dalam laba bersih)

## 🔧 Cara Menggunakan di Aplikasi

### Di Halaman **Clients** (Saat Booking)

1. Klien input biaya transport: **Rp 500.000**
2. Ini masuk ke total tagihan
3. Klien bayar DP/Pelunasan (termasuk transport)
4. Uang masuk ke kartu/rekening Anda

### Di Halaman **Projects** (Saat Eksekusi)

1. Buka project yang sudah dikonfirmasi
2. Klik **Edit Project**
3. Scroll ke section **"Biaya Transportasi"**
4. Centang **"Gunakan Transport"**
5. Tambahkan item transport aktual:
   ```
   - Deskripsi: "Tol PP Jakarta-Bandung"
     Biaya: Rp 100.000
     Bayar dari: Kartu BCA / Kantong Transport
   
   - Deskripsi: "Bensin"
     Biaya: Rp 150.000
     Bayar dari: Kartu BCA / Kantong Transport
   
   - Deskripsi: "Parkir Venue"
     Biaya: Rp 50.000
     Bayar dari: Tunai / Kantong Transport
   ```
6. Klik **"Bayar"** untuk setiap item
7. Sistem akan:
   - Membuat transaksi expense
   - Mengurangi saldo kartu/kantong
   - Menandai item sebagai "Lunas"

### Di Halaman **Projects** (Lihat Detail)

1. Klik project untuk melihat detail
2. Tab **"Laba/Rugi"** akan menampilkan:
   ```
   PENDAPATAN
   Total dari Klien:        Rp 12.000.000
   
   PENGELUARAN
   Fee Tim:                 Rp  5.000.000
   Cetak:                   Rp  1.000.000
   Transport:               Rp    300.000  ← Aktual
   Lain-lain:               Rp    200.000
   ─────────────────────────────────────
   Total Pengeluaran:       Rp  6.500.000
   
   LABA BERSIH:             Rp  5.500.000
   Margin:                  45.83%
   ```

3. Tab **"Transport"** (jika ada) menampilkan:
   ```
   Biaya Transport dari Klien: Rp 500.000
   
   Rincian Pengeluaran:
   ✓ Tol PP Jakarta-Bandung    Rp 100.000  [Lunas]
   ✓ Bensin                     Rp 150.000  [Lunas]
   ✓ Parkir Venue               Rp  50.000  [Lunas]
   ─────────────────────────────────────────────
   Total Pengeluaran:           Rp 300.000
   
   Selisih (Keuntungan):        Rp 200.000 ✨
   ```

## 💡 Tips Pengelolaan

### 1. **Gunakan Kantong Khusus Transport**
Buat kantong finansial khusus untuk transport:
- Nama: "Kantong Transport"
- Alokasi: Rp 500.000 (dari pembayaran klien)
- Gunakan kantong ini untuk bayar transport aktual
- Sisa di kantong = keuntungan transport

### 2. **Estimasi Realistis**
Saat booking, estimasi biaya transport dengan buffer:
```
Estimasi Aktual:  Rp 300.000
Buffer 20%:       Rp  60.000
─────────────────────────────
Charge ke Klien:  Rp 360.000
```

### 3. **Tracking Per Item**
Catat setiap pengeluaran transport secara detail:
- Lebih mudah untuk audit
- Bisa dijadikan referensi untuk project serupa
- Transparansi pengeluaran

### 4. **Review Berkala**
Setiap bulan, review:
- Total pendapatan transport dari klien
- Total pengeluaran transport aktual
- Selisih (keuntungan/kerugian)
- Adjust estimasi untuk project berikutnya

## 📈 Laporan & Analisis

### Di Halaman Finance

Semua transaksi transport tercatat:

**Pendapatan** (dari klien):
```
[Income] Pembayaran DP - Wedding John & Jane
  Termasuk: Transport Rp 500.000
```

**Pengeluaran** (aktual):
```
[Expense] Tol PP Jakarta-Bandung     Rp 100.000
[Expense] Bensin                     Rp 150.000
[Expense] Parkir Venue               Rp  50.000
```

### Filter & Export

Anda bisa:
1. Filter transaksi kategori "Transportasi"
2. Export ke CSV untuk analisis
3. Lihat tren pengeluaran transport per bulan
4. Bandingkan dengan pendapatan transport

## ⚠️ Catatan Penting

### Jika Pengeluaran Lebih Besar dari Pendapatan

Contoh: Klien bayar Rp 300.000, tapi aktual Rp 500.000

```
Pendapatan Transport:    Rp 300.000
Pengeluaran Transport:   Rp 500.000
─────────────────────────────────
Kerugian:                Rp 200.000 ❌
```

**Solusi**:
1. Catat sebagai pembelajaran
2. Adjust estimasi untuk project berikutnya
3. Pertimbangkan charge tambahan untuk lokasi jauh
4. Atau: Negosiasi dengan klien untuk biaya tambahan

### Transparansi dengan Klien

Di **Client Portal**, klien bisa melihat:
- Invoice dengan rincian transport
- Status pembayaran
- Tapi **TIDAK** melihat pengeluaran aktual Anda

Ini penting untuk:
- Privasi bisnis Anda
- Fleksibilitas pricing
- Margin keuntungan

## 🎯 Kesimpulan

**Sistem sudah mendukung pengelolaan ini dengan baik!**

- ✅ Biaya transport dari klien = **Pendapatan**
- ✅ Biaya transport aktual = **Pengeluaran** (dicatat detail)
- ✅ Selisih = **Keuntungan/Kerugian** (otomatis terhitung)
- ✅ Semua tercatat di Finance untuk tracking
- ✅ Laporan Laba/Rugi menampilkan gambaran lengkap

**Tidak perlu modifikasi sistem**, cukup gunakan fitur yang sudah ada:
1. Input biaya transport dari klien saat booking
2. Catat pengeluaran transport aktual di project
3. Lihat selisih di laporan Laba/Rugi

---

**Tanggal**: 23 Oktober 2025  
**Status**: ✅ Dokumentasi Lengkap
